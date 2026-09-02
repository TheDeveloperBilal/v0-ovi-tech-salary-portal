'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  Search,
  Trash2,
  Clock,
  CalendarDays,
  UserCheck,
  UserX,
  AlertTriangle,
  LogOut as LogOutIcon,
  Briefcase,
  DollarSign,
  TrendingDown,
  Wallet,
  ShieldAlert,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ANNUAL_LEAVES } from '@/lib/attendance-calculations'

// ── Types ────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string
  employee_id: string
  employee_name: string
  attendance_date: string
  check_in: string | null
  check_out: string | null
  work_hours: number
  status: string
  is_late: boolean
  is_early_out: boolean
  is_absent: boolean
  nine_hour_waiver: boolean
  month: number
  year: number
}

interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  designation: string | null
  is_probation: boolean
  probation_end_date: string | null
  leaves_taken: number
  base_salary: number
}

interface EmployeeStats {
  employeeName: string
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  earlyOutDays: number
  violationDeductions: number
  leavesUsed: number
  salaryDeductionDays: number
  baseSalary: number
  dailyRate: number
  salaryDeduction: number
  netPayable: number
  designation: string
  isProbation: boolean
  remainingLeaves: number
}

// ── Component ────────────────────────────────────────────────────────

export function AttendanceManager() {
  const { toast } = useToast()
  const supabase = createClient()

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  // ── Data Loading ──

  async function loadData() {
    try {
      setLoading(true)
      setRecords([])
      setSelectedEmployeeId(null)

      // Ensure auth session is valid before querying (prevents RLS returning empty)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: 'Session expired', description: 'Please log in again.', variant: 'destructive' })
        return
      }

      // Fetch employees — use * and map fields for resilience
      const empResult = await supabase.from('employees').select('*')
      const mappedEmployees: Employee[] = (empResult.data || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        employee_id: e.employee_id as string,
        first_name: e.first_name as string,
        last_name: e.last_name as string,
        designation: (e.designation as string) || null,
        is_probation: Boolean(e.is_probation),
        probation_end_date: (e.probation_end_date as string) || null,
        leaves_taken: Number(e.leaves_taken || 0),
        base_salary: Number(e.base_salary || 0),
      }))
      setEmployees(mappedEmployees)

      const { data: attData, error: attError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .order('attendance_date', { ascending: true })

      if (attError) throw attError
      setRecords(attData || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        setLoading(true)

        // Validate auth session first — getUser() hits the server to confirm
        // the JWT is valid, which also triggers token refresh if expired.
        // Without this, RLS silently returns empty results for stale sessions.
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          if (!cancelled) {
            console.warn('[Attendance] Auth check failed, skipping data fetch', authError?.message)
          }
          return
        }

        // Fetch employees — use * and map fields for resilience
        const empResult = await supabase.from('employees').select('*')
        if (empResult.error) throw empResult.error

        const mappedEmployees: Employee[] = (empResult.data || []).map((e: Record<string, unknown>) => ({
          id: e.id as string,
          employee_id: e.employee_id as string,
          first_name: e.first_name as string,
          last_name: e.last_name as string,
          designation: (e.designation as string) || null,
          is_probation: Boolean(e.is_probation),
          probation_end_date: (e.probation_end_date as string) || null,
          leaves_taken: Number(e.leaves_taken || 0),
          base_salary: Number(e.base_salary || 0),
        }))

        // Fetch attendance records for this month
        const attResult = await supabase
          .from('attendance_records')
          .select('*')
          .eq('month', month)
          .eq('year', year)
          .order('attendance_date', { ascending: true })

        if (cancelled) return

        setEmployees(mappedEmployees)

        if (attResult.error) throw attResult.error
        setRecords(attResult.data || [])
        setSelectedEmployeeId(null)
      } catch (error) {
        if (!cancelled) {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to load data',
            variant: 'destructive',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [month, year])

  // ── File Upload ──

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' })
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('month', String(month))
      formData.append('year', String(year))

      const response = await fetch('/api/attendance/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        const unmatchedMsg =
          result.employeesUnmatched?.length > 0
            ? `\nUnmatched names: ${result.employeesUnmatched.join(', ')}`
            : ''

        toast({
          title: 'Upload Successful',
          description: `${result.recordsProcessed} records saved for ${result.employeesMatched} employees.${unmatchedMsg}`,
        })
        loadData()
      } else {
        toast({
          title: 'Upload Failed',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // ── Delete ──

  async function deleteAllRecords() {
    if (!confirm(`Delete ALL attendance records for ${getMonthName(month)} ${year}?`)) return

    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('month', month)
        .eq('year', year)

      if (error) throw error
      toast({ title: 'Deleted', description: 'All records for this month removed.' })
      loadData()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete',
        variant: 'destructive',
      })
    }
  }

  // ── Computed Values ──

  // Build a lookup: employee UUID → full name from portal
  const employeeNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const emp of employees) {
      map.set(emp.id, `${emp.first_name} ${emp.last_name}`)
    }
    return map
  }, [employees])

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(r => {
      // Search by portal employee name (primary) or stored name (fallback)
      const portalName = employeeNameMap.get(r.employee_id) || ''
      return portalName.toLowerCase().includes(q) ||
        r.employee_name?.toLowerCase().includes(q)
    })
  }, [records, search, employeeNameMap])

  const overallStats = useMemo(() => {
    const data = filteredRecords
    const absent = data.filter(r => r.is_absent).length
    const late = data.filter(r => r.is_late).length
    const earlyOut = data.filter(r => r.is_early_out).length
    const uniqueDates = new Set(data.map(r => r.attendance_date))
    return {
      totalDays: uniqueDates.size,
      presentDays: data.length - absent,
      absentDays: absent,
      lateDays: late,
      earlyOutDays: earlyOut,
    }
  }, [filteredRecords])

  const selectedEmployeeStats: EmployeeStats | null = useMemo(() => {
    let targetEmployeeId: string | null = selectedEmployeeId

    if (!targetEmployeeId && search.trim()) {
      const uniqueEmployees = [...new Set(filteredRecords.map(r => r.employee_id))]
      if (uniqueEmployees.length === 1) {
        targetEmployeeId = uniqueEmployees[0]
      }
    }

    if (!targetEmployeeId) return null

    const empRecords = records.filter(r => r.employee_id === targetEmployeeId)
    if (empRecords.length === 0) return null

    const emp = employees.find(e => e.id === targetEmployeeId)
    if (!emp) return null

    const baseSalary = emp.base_salary || 0

    const totalDays = empRecords.length
    const absentDays = empRecords.filter(r => r.is_absent).length
    const presentDays = totalDays - absentDays
    const lateDays = empRecords.filter(r => r.is_late).length
    const earlyOutDays = empRecords.filter(r => r.is_early_out).length

    const totalViolations = lateDays + earlyOutDays
    const violationDeductions = Math.floor(totalViolations / 3)

    const remainingLeaves = Math.max(0, ANNUAL_LEAVES - (emp.leaves_taken || 0))
    let leavesUsed: number
    let absentSalaryDays: number

    if (emp.is_probation) {
      leavesUsed = 0
      absentSalaryDays = absentDays
    } else {
      leavesUsed = Math.min(absentDays, remainingLeaves)
      absentSalaryDays = Math.max(0, absentDays - remainingLeaves)
    }

    const totalSalaryDeductionDays = violationDeductions + absentSalaryDays
    const dailyRate = baseSalary / 30
    const salaryDeduction = Math.round(totalSalaryDeductionDays * dailyRate)
    const netPayable = Math.round(baseSalary - salaryDeduction)

    return {
      employeeName: `${emp.first_name} ${emp.last_name}`,
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      earlyOutDays,
      violationDeductions,
      leavesUsed,
      salaryDeductionDays: totalSalaryDeductionDays,
      baseSalary,
      dailyRate: Math.round(dailyRate),
      salaryDeduction,
      netPayable,
      designation: emp.designation || '-',
      isProbation: emp.is_probation,
      remainingLeaves: emp.is_probation ? 0 : Math.max(0, remainingLeaves - leavesUsed),
    }
  }, [selectedEmployeeId, search, filteredRecords, records, employees])

  // ── Helpers ──

  function getMonthName(m: number): string {
    return new Date(2024, m - 1).toLocaleDateString('en-US', { month: 'long' })
  }

  function formatTime12h(time: string | null): string {
    if (!time) return '--:--'
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
  }

  function getStatusBadge(record: AttendanceRecord) {
    if (record.is_absent) {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          Absent
        </span>
      )
    }
    const badges = []
    if (record.is_late) {
      badges.push(
        <span key="late" className="px-2 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Late In
        </span>
      )
    }
    if (record.is_early_out) {
      badges.push(
        <span key="early" className="px-2 py-1 rounded text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
          Early Out
        </span>
      )
    }
    if (record.nine_hour_waiver) {
      badges.push(
        <span key="waiver" className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          9hr Waiver
        </span>
      )
    }
    if (badges.length === 0) {
      badges.push(
        <span key="ontime" className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          On Time
        </span>
      )
    }
    return <div className="flex gap-1 flex-wrap">{badges}</div>
  }

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header: Month/Year + Upload + Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-purple-400" />
            Attendance Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Month</label>
              <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {getMonthName(i + 1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Year</label>
              <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - 2 + i
                    return (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button asChild disabled={uploading} className="w-full">
                <label className="cursor-pointer flex items-center justify-center gap-2">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? 'Processing...' : 'Upload File'}
                  <input
                    type="file"
                    accept=".txt,.csv"
                    hidden
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </Button>
            </div>

            {records.length > 0 && (
              <div className="flex items-end">
                <Button variant="outline" onClick={deleteAllRecords} className="w-full text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Month
                </Button>
              </div>
            )}

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value)
                    setSelectedEmployeeId(null)
                  }}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-4 h-4 text-purple-400" />
              <p className="text-sm text-muted-foreground">Total Days</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{overallStats.totalDays}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{overallStats.presentDays}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <UserX className="w-4 h-4 text-red-400" />
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
            <p className="text-2xl font-bold text-red-400">{overallStats.absentDays}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <p className="text-sm text-muted-foreground">Late</p>
            </div>
            <p className="text-2xl font-bold text-amber-400">{overallStats.lateDays}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <LogOutIcon className="w-4 h-4 text-orange-400" />
              <p className="text-sm text-muted-foreground">Early Out</p>
            </div>
            <p className="text-2xl font-bold text-orange-400">{overallStats.earlyOutDays}</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Payroll Summary */}
      {selectedEmployeeStats && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              {selectedEmployeeStats.employeeName}
            </h3>
            {selectedEmployeeStats.isProbation && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Probation
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Total Days</p>
                <p className="text-xl font-bold text-foreground">{selectedEmployeeStats.totalDays}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Present</p>
                <p className="text-xl font-bold text-emerald-400">{selectedEmployeeStats.presentDays}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Late</p>
                <p className="text-xl font-bold text-amber-400">{selectedEmployeeStats.lateDays}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Early Out</p>
                <p className="text-xl font-bold text-orange-400">{selectedEmployeeStats.earlyOutDays}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Absent</p>
                <p className="text-xl font-bold text-red-400">{selectedEmployeeStats.absentDays}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Leaves Remaining</p>
                <p className="text-xl font-bold text-blue-400">{selectedEmployeeStats.remainingLeaves}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="border-t-2 border-t-purple-500/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-1 mb-1">
                  <Briefcase className="w-3 h-3 text-purple-400" />
                  <p className="text-xs text-muted-foreground">Designation</p>
                </div>
                <p className="text-sm font-bold text-purple-400">{selectedEmployeeStats.designation}</p>
              </CardContent>
            </Card>
            <Card className="border-t-2 border-t-blue-500/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="w-3 h-3 text-blue-400" />
                  <p className="text-xs text-muted-foreground">Base Salary</p>
                </div>
                <p className="text-lg font-bold text-foreground">₨ {selectedEmployeeStats.baseSalary.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-t-2 border-t-amber-500/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <p className="text-xs text-muted-foreground">Deduction Days</p>
                </div>
                <p className="text-lg font-bold text-amber-400">
                  {selectedEmployeeStats.salaryDeductionDays}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedEmployeeStats.violationDeductions} violations + {selectedEmployeeStats.salaryDeductionDays - selectedEmployeeStats.violationDeductions} absences
                </p>
              </CardContent>
            </Card>
            <Card className="border-t-2 border-t-red-500/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="w-3 h-3 text-red-400" />
                  <p className="text-xs text-muted-foreground">Total Deduction</p>
                </div>
                <p className="text-lg font-bold text-red-400">₨ {selectedEmployeeStats.salaryDeduction.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-t-2 border-t-emerald-500/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-1 mb-1">
                  <Wallet className="w-3 h-3 text-emerald-400" />
                  <p className="text-xs text-muted-foreground">Net Payable</p>
                </div>
                <p className="text-lg font-bold text-emerald-400">₨ {selectedEmployeeStats.netPayable.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">
            <strong>Deduction rules:</strong>{' '}
            3 late/early-outs = 1 day salary deducted ({selectedEmployeeStats.lateDays} + {selectedEmployeeStats.earlyOutDays} = {selectedEmployeeStats.lateDays + selectedEmployeeStats.earlyOutDays} violations → {selectedEmployeeStats.violationDeductions} day{selectedEmployeeStats.violationDeductions !== 1 ? 's' : ''})
            {selectedEmployeeStats.isProbation
              ? ' · Probation: no leave quota, all absences deducted from salary'
              : ` · ${selectedEmployeeStats.leavesUsed} absence${selectedEmployeeStats.leavesUsed !== 1 ? 's' : ''} covered by leave quota`
            }
            {' · '}Daily rate: ₨ {selectedEmployeeStats.dailyRate.toLocaleString()}
          </div>
        </div>
      )}

      {/* Records Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Attendance Records ({filteredRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading records...
            </div>
          ) : filteredRecords.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              {records.length === 0
                ? `No records for ${getMonthName(month)} ${year}. Upload a ZKTeco attendance file to get started.`
                : 'No matching records found.'}
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted/50 backdrop-blur-sm">
                    <th className="text-left p-3 text-muted-foreground font-medium">Employee</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Date</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Check In</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Check Out</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Hours</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(record => (
                    <tr
                      key={record.id}
                      className={`border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors ${
                        record.is_absent ? 'opacity-60' : ''
                      } ${
                        selectedEmployeeId === record.employee_id ? 'bg-purple-500/5' : ''
                      }`}
                      onClick={() => setSelectedEmployeeId(record.employee_id)}
                    >
                      <td className="p-3 font-medium text-foreground">
                        {employeeNameMap.get(record.employee_id) || record.employee_name}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(record.attendance_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className={`p-3 ${record.is_late ? 'text-amber-400 font-medium' : 'text-muted-foreground'}`}>
                        {formatTime12h(record.check_in)}
                      </td>
                      <td className={`p-3 ${record.is_early_out ? 'text-orange-400 font-medium' : 'text-muted-foreground'}`}>
                        {formatTime12h(record.check_out)}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {record.work_hours > 0 ? `${Number(record.work_hours).toFixed(1)} hrs` : '--'}
                      </td>
                      <td className="p-3">
                        {getStatusBadge(record)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
