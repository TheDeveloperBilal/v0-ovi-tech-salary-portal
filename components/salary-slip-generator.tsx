"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText, Download, Eye, Trash2, Zap, Loader2, CalendarDays } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SalarySlipPreview } from "@/components/salary-slip-preview"
import { calculateMonthlySlip, quotaDatesBetween, QUOTA_LEAVE_TYPES } from "@/lib/leave-rules"

interface Employee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  department: string | null
  designation: string | null
  date_of_joining: string | null
  base_salary: number
  income_tax: number
  is_probation: boolean
  probation_end_date: string | null
  leaves_taken: number
}

interface AttendanceRecord {
  id: string
  employee_id: string
  employee_name: string
  attendance_date: string
  is_late: boolean
  is_early_out: boolean
  is_absent: boolean
}

interface GeneratedSlip {
  employeeId: string
  employeeName: string
  designation: string
  baseSalary: number
  incomeTax: number
  workingDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  earlyOutDays: number
  halfDays: number
  violationDeductions: number
  approvedLeaveDays: number
  leavesUsed: number
  absentSalaryDays: number
  totalDeductionDays: number
  dailyRate: number
  salaryDeduction: number
  netSalary: number
  isProbation: boolean
  remainingLeaves: number
  holidaysExcluded: number
  exceptionsApplied: number
}

export function SalarySlipGenerator({ isAdmin }: { isAdmin: boolean }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [slips, setSlips] = useState<any[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedSlip, setSelectedSlip] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [generatedPreview, setGeneratedPreview] = useState<GeneratedSlip[]>([])
  const [showPreviewList, setShowPreviewList] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [month, year])

  async function fetchData() {
    setIsLoading(true)
    try {
      // Fetch existing slips for this month
      const { data: slipData, error: slipError } = await supabase
        .from("salary_slips")
        .select("*, employees(first_name, last_name, employee_id, email, department, designation, date_of_joining, is_probation, probation_end_date, leaves_taken, base_salary)")
        .eq("month", month)
        .eq("year", year)
        .order("created_at", { ascending: false })

      if (slipError) throw slipError
      setSlips(slipData || [])

      // Fetch employees
      const { data: empData } = await supabase
        .from("employees")
        .select("*")
        .order("first_name", { ascending: true })

      setEmployees((empData || []).map((e: any) => ({
        id: e.id,
        employee_id: e.employee_id || '',
        first_name: e.first_name || '',
        last_name: e.last_name || '',
        email: e.email || '',
        phone: e.phone || null,
        department: e.department || null,
        designation: e.designation || null,
        date_of_joining: e.date_of_joining || null,
        base_salary: Number(e.base_salary || 0),
        income_tax: Number(e.income_tax || 0),
        is_probation: Boolean(e.is_probation),
        probation_end_date: e.probation_end_date || null,
        leaves_taken: Number(e.leaves_taken || 0),
      })))
    } catch {
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  // Preview what will be generated (compute from attendance data)
  async function previewGeneration() {
    try {
      setIsGenerating(true)

      // Fetch attendance records, holidays, exceptions, and salary history in parallel
      const lastDayOfMonth = new Date(year, month, 0).toISOString().split("T")[0]
      const firstDayOfMonth = `${year}-${String(month).padStart(2, "0")}-01`

      const [attRes, holidayRes, exceptionRes, salaryHistRes, leaveReqRes] = await Promise.all([
        supabase
          .from("attendance_records")
          .select("*")
          .eq("month", month)
          .eq("year", year),
        supabase
          .from("company_holidays")
          .select("holiday_date")
          .gte("holiday_date", firstDayOfMonth)
          .lte("holiday_date", lastDayOfMonth),
        supabase
          .from("attendance_exceptions")
          .select("employee_id, exception_date, type")
          .gte("exception_date", firstDayOfMonth)
          .lte("exception_date", lastDayOfMonth),
        supabase
          .from("salary_history")
          .select("employee_id, salary, effective_from")
          .lte("effective_from", lastDayOfMonth)
          .order("effective_from", { ascending: false }),
        supabase
          .from("leave_requests")
          .select("employee_id, start_date, end_date")
          .eq("status", "approved")
          .in("leave_type", QUOTA_LEAVE_TYPES)
          .lte("start_date", lastDayOfMonth)
          .gte("end_date", firstDayOfMonth),
      ])
      if (leaveReqRes.error) throw leaveReqRes.error

      const attData = attRes.data
      if (attRes.error) throw attRes.error
      if (!attData || attData.length === 0) {
        toast({
          title: "No attendance data",
          description: `No attendance records found for ${getMonthName(month)} ${year}. Upload attendance data first.`,
          variant: "destructive",
        })
        return
      }

      // Build holiday set (YYYY-MM-DD strings)
      const holidayDates = new Set(
        (holidayRes.data || []).map((h: any) => h.holiday_date)
      )

      // Build exception map: employee_id -> { date -> [types] }
      const exceptionMap = new Map<string, Map<string, string[]>>()
      for (const ex of (exceptionRes.data || [])) {
        if (!exceptionMap.has(ex.employee_id)) {
          exceptionMap.set(ex.employee_id, new Map())
        }
        const dateMap = exceptionMap.get(ex.employee_id)!
        const types = dateMap.get(ex.exception_date) || []
        types.push(ex.type)
        dateMap.set(ex.exception_date, types)
      }

      // Build salary history map: employee_id -> latest salary effective for this month
      const salaryForMonth = new Map<string, number>()
      for (const sh of (salaryHistRes.data || [])) {
        // First match per employee is the latest effective_from <= end of month
        if (!salaryForMonth.has(sh.employee_id)) {
          salaryForMonth.set(sh.employee_id, Number(sh.salary))
        }
      }

      // Group attendance by employee
      const employeeRecords = new Map<string, AttendanceRecord[]>()
      for (const record of attData) {
        const existing = employeeRecords.get(record.employee_id) || []
        existing.push(record)
        employeeRecords.set(record.employee_id, existing)
      }

      // Approved casual/sick leave days in this month, per employee
      const approvedLeaveMap = new Map<string, Set<string>>()
      for (const lr of (leaveReqRes.data || [])) {
        const from = lr.start_date > firstDayOfMonth ? lr.start_date : firstDayOfMonth
        const to = lr.end_date < lastDayOfMonth ? lr.end_date : lastDayOfMonth
        const set = approvedLeaveMap.get(lr.employee_id) || new Set<string>()
        for (const d of quotaDatesBetween(from, to, holidayDates)) set.add(d)
        approvedLeaveMap.set(lr.employee_id, set)
      }

      // Quota used earlier this year (before this month), from the database rules
      const usedBeforeMap = new Map<string, number>()
      await Promise.all([...employeeRecords.keys()].map(async (empUuid) => {
        const { data, error } = await supabase.rpc("leaves_used", { p_employee: empUuid, p_year: year, p_before_month: month })
        if (error) throw error
        usedBeforeMap.set(empUuid, Number(data || 0))
      }))

      const previews: GeneratedSlip[] = []

      for (const [empUuid, records] of employeeRecords) {
        const emp = employees.find(e => e.id === empUuid)
        if (!emp) continue

        // Use salary from history if available (handles promotions), else current
        const effectiveSalary = salaryForMonth.get(empUuid) ?? emp.base_salary
        if (effectiveSalary <= 0) continue

        const incomeTax = emp.income_tax || 0
        const result = calculateMonthlySlip({
          records,
          holidayDates,
          exceptionsByDate: exceptionMap.get(empUuid) || new Map(),
          approvedLeaveDates: approvedLeaveMap.get(empUuid) || new Set(),
          baseSalary: effectiveSalary,
          incomeTax,
          isProbation: emp.is_probation,
          leavesUsedBefore: usedBeforeMap.get(empUuid) || 0,
        })

        previews.push({
          employeeId: empUuid,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          designation: emp.designation || '-',
          baseSalary: effectiveSalary,
          incomeTax,
          isProbation: emp.is_probation,
          ...result,
        })
      }

      if (previews.length === 0) {
        toast({
          title: "No data to generate",
          description: "No employees with salary data found in attendance records.",
          variant: "destructive",
        })
        return
      }

      // Sort by name
      previews.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
      setGeneratedPreview(previews)
      setShowPreviewList(true)
    } catch {
      toast({ title: "Error", description: "Failed to generate salary slip preview.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  // Save all generated slips to DB
  async function saveAllSlips() {
    if (generatedPreview.length === 0) return

    try {
      setIsGenerating(true)

      // Delete existing slips for this month first (clean regeneration)
      const empIds = generatedPreview.map(p => p.employeeId)
      for (const empId of empIds) {
        await supabase
          .from("salary_slips")
          .delete()
          .eq("employee_id", empId)
          .eq("month", month)
          .eq("year", year)
      }

      // Build slip records
      const slipRecords = generatedPreview.map(p => ({
        employee_id: p.employeeId,
        month,
        year,
        basic_salary: p.baseSalary,
        total_earnings: p.baseSalary,
        total_deductions: p.salaryDeduction + p.incomeTax,
        net_salary: p.netSalary,
        income_tax: p.incomeTax,
        working_days: p.workingDays,
        present_days: p.presentDays,
        absent_days: p.absentDays,
        leaves_deducted: p.totalDeductionDays,
        is_probation: p.isProbation,
        attendance_summary: {
          lateDays: p.lateDays,
          earlyOutDays: p.earlyOutDays,
          halfDays: p.halfDays,
          violationDeductions: p.violationDeductions,
          approvedLeaveDays: p.approvedLeaveDays,
          leavesUsed: p.leavesUsed,
          absentSalaryDays: p.absentSalaryDays,
          remainingLeaves: p.remainingLeaves,
          dailyRate: p.dailyRate,
          incomeTax: p.incomeTax,
          holidaysExcluded: p.holidaysExcluded,
          exceptionsApplied: p.exceptionsApplied,
        },
      }))

      const { error } = await supabase.from("salary_slips").insert(slipRecords)
      if (error) throw error

      for (const p of generatedPreview) {
        await refreshLeaveBalance(p.employeeId)
      }

      toast({
        title: "Salary slips generated",
        description: `${slipRecords.length} salary slips created for ${getMonthName(month)} ${year}. Leave quotas synced.`,
      })

      setShowPreviewList(false)
      setGeneratedPreview([])
      fetchData()
    } catch {
      toast({ title: "Error", description: "Failed to save salary slips.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  function openSlipPreview(slip: any) {
    const emp = slip.employees || {}
    const summary = slip.attendance_summary || {}

    setSelectedSlip({
      basic_salary: slip.basic_salary,
      baseSalary: slip.basic_salary,
      net_salary: slip.net_salary,
      month: slip.month,
      year: slip.year,
      employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      employee_id: emp.employee_id,
      email: emp.email,
      department: emp.department,
      designation: emp.designation,
      position: emp.designation,
      joinDate: emp.date_of_joining,
      is_probation: slip.is_probation,
      probation_end_date: emp.probation_end_date,
      // Attendance data
      working_days: slip.working_days,
      present_days: slip.present_days,
      absent_days: slip.absent_days,
      leaves_deducted: slip.leaves_deducted,
      total_deductions: slip.total_deductions,
      // Detailed breakdown
      lateDays: summary.lateDays || 0,
      earlyOutDays: summary.earlyOutDays || 0,
      violationDeductions: summary.violationDeductions || 0,
      leavesUsed: summary.leavesUsed || 0,
      absentSalaryDays: summary.absentSalaryDays || 0,
      remainingLeaves: summary.remainingLeaves || 0,
      dailyRate: summary.dailyRate || 0,
      incomeTax: summary.incomeTax || slip.income_tax || 0,
      holidaysExcluded: summary.holidaysExcluded || 0,
      exceptionsApplied: summary.exceptionsApplied || 0,
    })
    setIsPreviewOpen(true)
  }

  async function refreshLeaveBalance(employeeId: string) {
    const { error } = await supabase.rpc("recalc_leaves_taken", { p_employee: employeeId })
    if (error) console.error("Failed to refresh leave balance:", employeeId, error)
  }

  async function handleDeleteSlip(slipId: string) {
    if (!confirm("Are you sure you want to delete this salary slip?")) return

    try {
      // Get the employee_id before deleting
      const slip = slips.find(s => s.id === slipId)
      const empId = slip?.employee_id

      const { error } = await supabase
        .from("salary_slips")
        .delete()
        .eq("id", slipId)

      if (error) throw error

      setSlips(slips.filter(s => s.id !== slipId))

      if (empId) {
        await refreshLeaveBalance(empId)
      }

      toast({ title: "Deleted", description: "Salary slip deleted. Leave quota re-synced." })
    } catch {
      toast({ title: "Error", description: "Failed to delete salary slip.", variant: "destructive" })
    }
  }

  function getMonthName(m: number): string {
    return new Date(2024, m - 1).toLocaleDateString('en-US', { month: 'long' })
  }

  const slipsExistForMonth = slips.length > 0

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Salary Slip Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {isAdmin && (
              <div className="flex items-end sm:col-span-2">
                <Button
                  onClick={previewGeneration}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  {slipsExistForMonth
                    ? `Regenerate Slips (${slips.length} exist)`
                    : 'Generate Salary Slips'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview before saving */}
      {showPreviewList && generatedPreview.length > 0 && (
        <Card className="border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Preview — {generatedPreview.length} Salary Slips for {getMonthName(month)} {year}
            </CardTitle>
            <CardDescription>
              Review the auto-computed salary slips below. Click &quot;Save All&quot; to generate.
              {slipsExistForMonth && (
                <span className="text-amber-400 ml-1">
                  This will replace the {slips.length} existing slip(s) for this month.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 text-muted-foreground font-medium">Employee</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Base Salary</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Present</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Late</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Early Out</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Absent</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Att. Deduction</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Tax</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Net Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedPreview.map(p => (
                    <tr key={p.employeeId} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{p.employeeName}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.designation}
                          {(p.holidaysExcluded > 0 || p.exceptionsApplied > 0) && (
                            <span className="text-green-400 ml-1">
                              ({p.holidaysExcluded > 0 ? `${p.holidaysExcluded} holiday` : ''}{p.holidaysExcluded > 0 && p.exceptionsApplied > 0 ? ', ' : ''}{p.exceptionsApplied > 0 ? `${p.exceptionsApplied} exception` : ''})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right text-foreground">₨ {p.baseSalary.toLocaleString()}</td>
                      <td className="p-3 text-right text-emerald-400">{p.presentDays}</td>
                      <td className="p-3 text-right text-amber-400">{p.lateDays}</td>
                      <td className="p-3 text-right text-orange-400">{p.earlyOutDays}</td>
                      <td className="p-3 text-right text-red-400">{p.absentDays}</td>
                      <td className="p-3 text-right text-red-400">₨ {p.salaryDeduction.toLocaleString()}</td>
                      <td className="p-3 text-right text-red-400">{p.incomeTax > 0 ? `₨ ${p.incomeTax.toLocaleString()}` : '—'}</td>
                      <td className="p-3 text-right font-semibold text-emerald-400">₨ {p.netSalary.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td className="p-3 font-semibold text-foreground">Total ({generatedPreview.length} employees)</td>
                    <td className="p-3 text-right font-semibold text-foreground">
                      ₨ {generatedPreview.reduce((s, p) => s + p.baseSalary, 0).toLocaleString()}
                    </td>
                    <td className="p-3" />
                    <td className="p-3" />
                    <td className="p-3" />
                    <td className="p-3" />
                    <td className="p-3 text-right font-semibold text-red-400">
                      ₨ {generatedPreview.reduce((s, p) => s + p.salaryDeduction, 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-semibold text-red-400">
                      ₨ {generatedPreview.reduce((s, p) => s + p.incomeTax, 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-400">
                      ₨ {generatedPreview.reduce((s, p) => s + p.netSalary, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex gap-3 mt-4">
              <Button onClick={saveAllSlips} disabled={isGenerating} className="flex-1">
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Save All Salary Slips
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreviewList(false)
                  setGeneratedPreview([])
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Slips */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-8">
            <div className="flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading salary slips...
            </div>
          </CardContent>
        </Card>
      ) : slips.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-8">
            <p className="text-center text-muted-foreground">
              No salary slips for {getMonthName(month)} {year}.
              {isAdmin && ' Click "Generate Salary Slips" to auto-create from attendance data.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            {getMonthName(month)} {year} — {slips.length} Salary Slip{slips.length !== 1 ? 's' : ''}
          </h3>
          <div className="grid gap-4">
            {slips.map((slip) => {
              const emp = slip.employees || {}
              const summary = slip.attendance_summary || {}
              return (
                <Card key={slip.id} className="hover:border-purple-500/30 transition-all duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-400" />
                      {emp.first_name} {emp.last_name}
                      {slip.is_probation && (
                        <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Probation
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {emp.employee_id} • {emp.designation || 'N/A'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Base Salary</p>
                        <p className="font-semibold text-foreground">
                          ₨ {(slip.basic_salary || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Attendance</p>
                        <p className="font-semibold text-foreground">
                          {slip.present_days || 0}P / {slip.absent_days || 0}A / {summary.lateDays || 0}L
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Deduction</p>
                        <p className="font-semibold text-red-400">
                          ₨ {(slip.total_deductions || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Net Payable</p>
                        <p className="font-semibold text-emerald-400">
                          ₨ {(slip.net_salary || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSlipPreview(slip)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSlip(slip.id)}
                          className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Slip Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Salary Slip</DialogTitle>
            <DialogDescription>View and download employee salary slip</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedSlip && <SalarySlipPreview employee={selectedSlip} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
