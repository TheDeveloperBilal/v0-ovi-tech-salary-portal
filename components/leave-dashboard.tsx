"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarCheck2, Search, Users, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual_leave: 'Casual Leave',
  sick_leave: 'Sick Leave',
  work_from_home: 'Work From Home',
  half_day: 'Half Day',
  early_out: 'Early Out',
  other: 'Other',
}

export function LeaveDashboard() {
  const [employees, setEmployees] = useState<any[]>([])
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setIsLoading(true)
    try {
      const [empRes, leaveRes] = await Promise.all([
        supabase.from("employees").select("id, first_name, last_name, employee_id, department, designation, leaves_taken, is_probation").order("first_name"),
        supabase.from("leave_requests").select("employee_id, leave_type, start_date, end_date, status").eq("status", "approved"),
      ])

      if (empRes.error) throw empRes.error
      setEmployees(empRes.data || [])
      setLeaveRequests(leaveRes.data || [])
    } catch {
      toast({ title: "Error", description: "Failed to load leave data.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department || 'Unassigned'))
    return Array.from(depts).sort()
  }, [employees])

  function countWeekdays(start: string, end: string): number {
    let count = 0
    const d = new Date(start + 'T00:00:00')
    const endDate = new Date(end + 'T00:00:00')
    while (d <= endDate) {
      if (d.getDay() >= 1 && d.getDay() <= 5) count++
      d.setDate(d.getDate() + 1)
    }
    return count
  }

  const employeeLeaveData = useMemo(() => {
    return employees.map(emp => {
      const empRequests = leaveRequests.filter(r => r.employee_id === emp.id)

      const breakdown: Record<string, number> = {}
      for (const req of empRequests) {
        const days = countWeekdays(req.start_date, req.end_date)
        breakdown[req.leave_type] = (breakdown[req.leave_type] || 0) + days
      }

      const used = emp.leaves_taken || 0
      const remaining = Math.max(0, 14 - used)

      return {
        ...emp,
        breakdown,
        used,
        remaining,
        totalRequests: empRequests.length,
      }
    })
  }, [employees, leaveRequests])

  const filtered = useMemo(() => {
    return employeeLeaveData.filter(emp => {
      const matchSearch = !search ||
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(search.toLowerCase())
      const matchDept = deptFilter === 'all' || (emp.department || 'Unassigned') === deptFilter
      return matchSearch && matchDept
    })
  }, [employeeLeaveData, search, deptFilter])

  const totalUsed = employeeLeaveData.reduce((sum, e) => sum + e.used, 0)
  const lowBalanceCount = employeeLeaveData.filter(e => !e.is_probation && e.remaining <= 3 && e.remaining > 0).length
  const exhaustedCount = employeeLeaveData.filter(e => !e.is_probation && e.remaining === 0).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-purple-400" />
                Leave Quota Dashboard
              </CardTitle>
              <CardDescription>Overview of all employees&apos; leave balances and usage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Employees</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{employees.length}</p>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CalendarCheck2 className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Total Used</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalUsed}</p>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-amber-500/5 border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Low Balance</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">{lowBalanceCount}</p>
              <p className="text-[10px] text-muted-foreground">3 or fewer remaining</p>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-red-500/5 border-red-500/20">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Exhausted</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{exhaustedCount}</p>
              <p className="text-[10px] text-muted-foreground">0 leaves remaining</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or employee ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Used</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Remaining</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Casual</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Sick</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Half Day</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">WFH</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Early Out</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => (
                    <tr key={emp.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.employee_id}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.department || '—'}</td>
                      <td className="text-center px-4 py-3 font-semibold text-foreground">
                        {emp.is_probation ? <span className="text-xs text-amber-400">Probation</span> : emp.used}
                      </td>
                      <td className="text-center px-4 py-3">
                        {emp.is_probation ? '—' : (
                          <span className={`font-semibold ${
                            emp.remaining === 0 ? 'text-red-400' :
                            emp.remaining <= 3 ? 'text-amber-400' :
                            'text-emerald-400'
                          }`}>
                            {emp.remaining}
                          </span>
                        )}
                      </td>
                      <td className="text-center px-4 py-3 text-muted-foreground">{emp.breakdown.casual_leave || 0}</td>
                      <td className="text-center px-4 py-3 text-muted-foreground">{emp.breakdown.sick_leave || 0}</td>
                      <td className="text-center px-4 py-3 text-muted-foreground">{emp.breakdown.half_day || 0}</td>
                      <td className="text-center px-4 py-3 text-muted-foreground">{emp.breakdown.work_from_home || 0}</td>
                      <td className="text-center px-4 py-3 text-muted-foreground">{emp.breakdown.early_out || 0}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">No employees found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
