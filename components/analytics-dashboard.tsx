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
  Loader2, BarChart3, CalendarDays,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts"

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CHART_COLORS = {
  present: '#22c55e',
  absent: '#ef4444',
  late: '#f59e0b',
  earlyOut: '#f97316',
  wfh: '#06b6d4',
  onTime: '#8b5cf6',
}

interface AttendanceRecord {
  employee_id: string
  employee_name: string
  attendance_date: string
  is_late: boolean
  is_early_out: boolean
  is_absent: boolean
  work_hours: number
  source: string
  month: number
  year: number
}

interface TrendRecord {
  employee_id: string
  attendance_date: string
  is_late: boolean
  is_early_out: boolean
  is_absent: boolean
  work_hours: number
  source: string
  month: number
  year: number
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  department: string
  designation: string
  leaves_taken: number
  base_salary: number
  date_of_joining: string
}

interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: string
  status: string
  start_date: string
  end_date: string
}

export function AnalyticsDashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [trendRecords, setTrendRecords] = useState<TrendRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [month, year])

  async function fetchData() {
    setIsLoading(true)
    try {
      const trendMonths: { m: number; y: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1)
        trendMonths.push({ m: d.getMonth() + 1, y: d.getFullYear() })
      }

      const [recRes, empRes, leaveRes, trendRes] = await Promise.all([
        supabase
          .from("attendance_records")
          .select("employee_id, employee_name, attendance_date, is_late, is_early_out, is_absent, work_hours, source, month, year")
          .eq("month", month)
          .eq("year", year),
        supabase
          .from("employees")
          .select("id, first_name, last_name, department, designation, leaves_taken, base_salary, date_of_joining"),
        supabase
          .from("leave_requests")
          .select("id, employee_id, leave_type, status, start_date, end_date")
          .eq("status", "approved"),
        supabase
          .from("attendance_records")
          .select("employee_id, attendance_date, is_late, is_early_out, is_absent, work_hours, source, month, year")
          .gte("year", trendMonths[0].y)
          .order("attendance_date"),
      ])

      setRecords(recRes.data || [])
      setEmployees(empRes.data || [])
      setLeaveRequests(leaveRes.data || [])

      const filtered = (trendRes.data || []).filter(r => {
        return trendMonths.some(tm => tm.m === r.month && tm.y === r.year)
      })
      setTrendRecords(filtered)
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
        const rateA = (a.present - a.late - a.earlyOut) / a.present
        const rateB = (b.present - b.late - b.earlyOut) / b.present
        return rateB - rateA
      })
      .slice(0, 5)

    const deptMap = new Map<string, { present: number; absent: number; late: number; wfh: number }>()
    for (const r of records) {
      const emp = employees.find(e => e.id === r.employee_id)
      const dept = emp?.department || 'Unknown'
      if (!deptMap.has(dept)) deptMap.set(dept, { present: 0, absent: 0, late: 0, wfh: 0 })
      const d = deptMap.get(dept)!
      if (r.is_absent) d.absent++
      else {
        d.present++
        if (r.is_late) d.late++
        if (r.source === 'wfh_portal') d.wfh++
      }
    }
    const departments = Array.from(deptMap.entries()).map(([name, s]) => ({
      name,
      ...s,
      total: s.present + s.absent,
      rate: +((s.present / (s.present + s.absent)) * 100).toFixed(0),
    })).sort((a, b) => b.total - a.total)

    const statusBreakdown = [
      { name: 'On Time', value: onTime, color: CHART_COLORS.onTime },
      { name: 'Late', value: late, color: CHART_COLORS.late },
      { name: 'Early Out', value: earlyOut, color: CHART_COLORS.earlyOut },
      { name: 'Absent', value: absent, color: CHART_COLORS.absent },
      { name: 'WFH', value: wfh, color: CHART_COLORS.wfh },
    ].filter(s => s.value > 0)

    return {
      totalRecords, present, absent, late, earlyOut, wfh, onTime,
      avgWorkHours, uniqueEmployees, attendanceRate, punctualityRate,
      topLate, topAbsent, topPunctual, departments, statusBreakdown,
    }
  }, [records, employees])

  const trendData = useMemo(() => {
    const monthMap = new Map<string, { present: number; absent: number; late: number; total: number }>()

    for (const r of trendRecords) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`
      if (!monthMap.has(key)) monthMap.set(key, { present: 0, absent: 0, late: 0, total: 0 })
      const m = monthMap.get(key)!
      m.total++
      if (r.is_absent) m.absent++
      else {
        m.present++
        if (r.is_late) m.late++
      }
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        month: MONTHS[parseInt(key.split('-')[1]) - 1]?.slice(0, 3) || key,
        ...data,
        attendanceRate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
        lateRate: data.present > 0 ? Math.round((data.late / data.present) * 100) : 0,
      }))
  }, [trendRecords])

  const leaveBalanceData = useMemo(() => {
    return employees
      .map(emp => ({
        name: `${emp.first_name} ${emp.last_name}`,
        used: emp.leaves_taken || 0,
        remaining: Math.max(0, 14 - (emp.leaves_taken || 0)),
        department: emp.department || 'Unknown',
      }))
      .sort((a, b) => b.used - a.used)
  }, [employees])

  const deptChartData = useMemo(() => {
    if (!stats) return []
    return stats.departments.map(d => ({
      name: d.name,
      Present: d.present,
      Absent: d.absent,
      Late: d.late,
      WFH: d.wfh,
    }))
  }, [stats])

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
      {/* Header */}
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
            <StatCard icon={<Users className="w-4 h-4" />} label="Total Employees" value={stats.uniqueEmployees} accent="#a855f7" />
            <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Attendance Rate" value={`${stats.attendanceRate}%`} accent="#34d399" />
            <StatCard icon={<Clock className="w-4 h-4" />} label="Avg Work Hours" value={`${stats.avgWorkHours}h`} accent="#60a5fa" />
            <StatCard icon={<UserCheck className="w-4 h-4" />} label="Punctuality Rate" value={`${stats.punctualityRate}%`} accent="#22d3ee" />
          </div>

          {/* Breakdown Mini Stats */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <MiniStat label="Present" value={stats.present} color="text-emerald-400" />
            <MiniStat label="Absent" value={stats.absent} color="text-red-400" />
            <MiniStat label="Late" value={stats.late} color="text-amber-400" />
            <MiniStat label="Early Out" value={stats.earlyOut} color="text-orange-400" />
            <MiniStat label="WFH" value={stats.wfh} color="text-cyan-400" />
          </div>

          {/* Charts Row: Attendance Status Pie + 6-Month Trend */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stats.statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {stats.statusBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Records']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">6-Month Attendance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {trendData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                      <Tooltip />
                      <Area type="monotone" dataKey="attendanceRate" name="Attendance %" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="lateRate" name="Late %" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Need at least 2 months of data for trends</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department Breakdown Chart */}
          {deptChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Department Attendance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={deptChartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Present" fill={CHART_COLORS.present} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Late" fill={CHART_COLORS.late} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Absent" fill={CHART_COLORS.absent} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="WFH" fill={CHART_COLORS.wfh} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Leave Balance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-purple-400" />
                Leave Balance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaveBalanceData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No employee data</p>
              ) : (
                <div className="space-y-2.5">
                  {leaveBalanceData.map((emp, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-40 truncate">{emp.name}</span>
                      <span className="text-xs text-muted-foreground w-20 truncate">{emp.department}</span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(emp.used / 14) * 100}%`,
                            backgroundColor: emp.remaining <= 2 ? '#ef4444' : emp.remaining <= 5 ? '#f59e0b' : '#22c55e',
                          }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                          {emp.used}/14 used
                        </span>
                      </div>
                      <span className={`text-xs font-semibold w-16 text-right ${
                        emp.remaining <= 2 ? 'text-red-400' : emp.remaining <= 5 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {emp.remaining} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department Progress Bars */}
          {stats.departments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Department Attendance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.departments.map(dept => (
                    <div key={dept.name} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-32 truncate">{dept.name}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${dept.rate}%`,
                            backgroundColor: dept.rate >= 90 ? '#22c55e' : dept.rate >= 75 ? '#f59e0b' : '#ef4444',
                          }}
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

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: accent }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: `${accent}1a`, color: accent }}>{icon}</div>
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
