"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users, UserCheck, UserX, Clock, AlertTriangle, TrendingUp,
  Loader2, BarChart3, Home,
} from "lucide-react"

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface AttendanceRecord {
  employee_id: string
  employee_name: string
  attendance_date: string
  is_late: boolean
  is_early_out: boolean
  is_absent: boolean
  work_hours: number
  source: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  department: string
  designation: string
}

export function AnalyticsDashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [month, year])

  async function fetchData() {
    setIsLoading(true)
    try {
      const [recRes, empRes] = await Promise.all([
        supabase
          .from("attendance_records")
          .select("employee_id, employee_name, attendance_date, is_late, is_early_out, is_absent, work_hours, source")
          .eq("month", month)
          .eq("year", year),
        supabase
          .from("employees")
          .select("id, first_name, last_name, department, designation"),
      ])

      setRecords(recRes.data || [])
      setEmployees(empRes.data || [])
    } catch {
      // silently handle
    } finally {
      setIsLoading(false)
    }
  }

  const stats = useMemo(() => {
    if (records.length === 0) return null

    const totalRecords = records.length
    const present = records.filter(r => !r.is_absent).length
    const absent = records.filter(r => r.is_absent).length
    const late = records.filter(r => r.is_late && !r.is_absent).length
    const earlyOut = records.filter(r => r.is_early_out && !r.is_absent).length
    const wfh = records.filter(r => r.source === 'wfh_portal').length
    const onTime = records.filter(r => !r.is_absent && !r.is_late && !r.is_early_out).length

    const presentRecords = records.filter(r => !r.is_absent && r.work_hours > 0)
    const avgWorkHours = presentRecords.length > 0
      ? +(presentRecords.reduce((sum, r) => sum + r.work_hours, 0) / presentRecords.length).toFixed(1)
      : 0

    const uniqueEmployees = new Set(records.map(r => r.employee_id)).size
    const attendanceRate = totalRecords > 0 ? +((present / totalRecords) * 100).toFixed(1) : 0
    const punctualityRate = present > 0 ? +((onTime / present) * 100).toFixed(1) : 0

    // Per-employee stats
    const empMap = new Map<string, { name: string; late: number; earlyOut: number; absent: number; present: number }>()
    for (const r of records) {
      if (!empMap.has(r.employee_id)) {
        empMap.set(r.employee_id, { name: r.employee_name, late: 0, earlyOut: 0, absent: 0, present: 0 })
      }
      const e = empMap.get(r.employee_id)!
      if (r.is_absent) e.absent++
      else {
        e.present++
        if (r.is_late) e.late++
        if (r.is_early_out) e.earlyOut++
      }
    }

    const empStats = Array.from(empMap.entries()).map(([id, s]) => ({ id, ...s }))
    const topLate = [...empStats].sort((a, b) => b.late - a.late).slice(0, 5)
    const topAbsent = [...empStats].sort((a, b) => b.absent - a.absent).slice(0, 5)
    const topPunctual = [...empStats]
      .filter(e => e.present > 0)
      .sort((a, b) => {
        const rateA = (e => e.present > 0 ? ((e.present - e.late - e.earlyOut) / e.present) : 0)(a)
        const rateB = (e => e.present > 0 ? ((e.present - e.late - e.earlyOut) / e.present) : 0)(b)
        return rateB - rateA
      })
      .slice(0, 5)

    // Department breakdown
    const deptMap = new Map<string, { present: number; absent: number; late: number }>()
    for (const r of records) {
      const emp = employees.find(e => e.id === r.employee_id)
      const dept = emp?.department || 'Unknown'
      if (!deptMap.has(dept)) deptMap.set(dept, { present: 0, absent: 0, late: 0 })
      const d = deptMap.get(dept)!
      if (r.is_absent) d.absent++
      else {
        d.present++
        if (r.is_late) d.late++
      }
    }
    const departments = Array.from(deptMap.entries()).map(([name, s]) => ({
      name,
      ...s,
      total: s.present + s.absent,
      rate: +((s.present / (s.present + s.absent)) * 100).toFixed(0),
    })).sort((a, b) => b.total - a.total)

    return {
      totalRecords, present, absent, late, earlyOut, wfh, onTime,
      avgWorkHours, uniqueEmployees, attendanceRate, punctualityRate,
      topLate, topAbsent, topPunctual, departments,
    }
  }, [records, employees])

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-muted-foreground" />
          <span className="text-muted-foreground">Loading analytics...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with month/year selector */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Analytics Dashboard
            </CardTitle>
            <div className="flex gap-2">
              <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!stats || stats.totalRecords === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No attendance data for {MONTHS[month - 1]} {year}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Users className="w-4 h-4 text-purple-400" />} label="Total Employees" value={stats.uniqueEmployees} color="purple" />
            <StatCard icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="Attendance Rate" value={`${stats.attendanceRate}%`} color="emerald" />
            <StatCard icon={<Clock className="w-4 h-4 text-blue-400" />} label="Avg Work Hours" value={`${stats.avgWorkHours}h`} color="blue" />
            <StatCard icon={<UserCheck className="w-4 h-4 text-cyan-400" />} label="Punctuality Rate" value={`${stats.punctualityRate}%`} color="cyan" />
          </div>

          {/* Breakdown Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <MiniStat label="Present" value={stats.present} color="text-emerald-400" />
            <MiniStat label="Absent" value={stats.absent} color="text-red-400" />
            <MiniStat label="Late" value={stats.late} color="text-amber-400" />
            <MiniStat label="Early Out" value={stats.earlyOut} color="text-orange-400" />
            <MiniStat label="WFH" value={stats.wfh} color="text-cyan-400" />
          </div>

          {/* Department Breakdown */}
          {stats.departments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Department Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.departments.map(dept => (
                    <div key={dept.name} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-32 truncate">{dept.name}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-emerald-500/70 rounded-full transition-all"
                          style={{ width: `${dept.rate}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                          {dept.rate}% ({dept.present}/{dept.total})
                        </span>
                      </div>
                      {dept.late > 0 && (
                        <span className="text-xs text-amber-400 whitespace-nowrap">{dept.late} late</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Lists */}
          <div className="grid gap-4 md:grid-cols-3">
            <RankingCard
              title="Most Late Arrivals"
              icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
              items={stats.topLate}
              valueKey="late"
              valueSuffix=" days"
              emptyText="No late arrivals"
              color="text-amber-400"
            />
            <RankingCard
              title="Most Absences"
              icon={<UserX className="w-4 h-4 text-red-400" />}
              items={stats.topAbsent}
              valueKey="absent"
              valueSuffix=" days"
              emptyText="No absences"
              color="text-red-400"
            />
            <RankingCard
              title="Most Punctual"
              icon={<UserCheck className="w-4 h-4 text-emerald-400" />}
              items={stats.topPunctual.map(e => ({
                ...e,
                rate: e.present > 0 ? Math.round(((e.present - e.late - e.earlyOut) / e.present) * 100) : 0,
              }))}
              valueKey="rate"
              valueSuffix="%"
              emptyText="No data"
              color="text-emerald-400"
            />
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className={`border-l-4 border-l-${color}-500`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
          <div className={`p-1.5 rounded-md bg-${color}-500/10`}>{icon}</div>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="py-4 px-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-xl font-bold ${color}`}>{value}</span>
      </CardContent>
    </Card>
  )
}

function RankingCard({ title, icon, items, valueKey, valueSuffix, emptyText, color }: {
  title: string
  icon: React.ReactNode
  items: any[]
  valueKey: string
  valueSuffix: string
  emptyText: string
  color: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 || items[0][valueKey] === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {items.filter(i => i[valueKey] > 0).map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">
                  <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                  {item.name}
                </span>
                <span className={`font-semibold ${color} ml-2`}>
                  {item[valueKey]}{valueSuffix}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
