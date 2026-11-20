import { ANNUAL_LEAVES } from '@/lib/attendance-calculations'

// Leave quota rules (mirrored in the database function public.leaves_used):
// - Quota is used by unexcused absences and approved casual/sick leave.
// - Late, early out and half day are salary violations: every 3 = 1 day's salary.
// - The quota resets every 1 January (2026 counts from 1 May 2026).

export const QUOTA_LEAVE_TYPES = ['casual_leave', 'sick_leave']

/** Calendar year in Pakistan time, used for the yearly leave reset. */
export function currentLeaveYear(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric' }).format(now))
}

/** Weekday dates (YYYY-MM-DD) in [from, to], skipping holidays. */
export function quotaDatesBetween(start: string, end: string, holidays: Set<string> = new Set()): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T00:00:00Z')
  const last = new Date(end + 'T00:00:00Z')
  while (d <= last) {
    const key = d.toISOString().slice(0, 10)
    const dow = d.getUTCDay()
    if (dow >= 1 && dow <= 5 && !holidays.has(key)) dates.push(key)
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return dates
}

export interface SlipAttendanceRecord {
  attendance_date: string
  is_absent: boolean
  is_late: boolean
  is_early_out: boolean
}

export interface MonthlySlipInput {
  records: SlipAttendanceRecord[]
  holidayDates: Set<string>
  exceptionsByDate: Map<string, string[]>
  /** Approved casual/sick leave days in this month (weekdays, not holidays). */
  approvedLeaveDates: Set<string>
  baseSalary: number
  incomeTax: number
  isProbation: boolean
  /** Quota days already used this year before this month. */
  leavesUsedBefore: number
}

export interface MonthlySlipResult {
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
  remainingLeaves: number
  holidaysExcluded: number
  exceptionsApplied: number
}

export function calculateMonthlySlip(input: MonthlySlipInput): MonthlySlipResult {
  let holidaysExcluded = 0
  let exceptionsApplied = 0
  let halfDays = 0
  const effective: SlipAttendanceRecord[] = []

  for (const r of input.records) {
    const date = r.attendance_date
    if (input.holidayDates.has(date)) {
      holidaysExcluded++
      continue
    }

    const types = input.exceptionsByDate.get(date) || []

    if (types.includes('approved_leave') || types.includes('work_from_home') || input.approvedLeaveDates.has(date)) {
      exceptionsApplied++
      effective.push({ ...r, is_absent: false, is_late: false, is_early_out: false })
      continue
    }

    // Half day counts once as a violation; late/early on the same day are not counted again
    if (types.includes('half_day')) {
      exceptionsApplied++
      halfDays++
      effective.push({ ...r, is_absent: false, is_late: false, is_early_out: false })
      continue
    }

    let isLate = r.is_late
    if (types.includes('approved_late') && isLate) {
      isLate = false
      exceptionsApplied++
    }
    let isEarlyOut = r.is_early_out
    if (types.includes('approved_early_out') && isEarlyOut) {
      isEarlyOut = false
      exceptionsApplied++
    }
    effective.push({ ...r, is_late: isLate, is_early_out: isEarlyOut })
  }

  const workingDays = effective.length
  const absentDays = effective.filter(r => r.is_absent).length
  const presentDays = workingDays - absentDays
  const lateDays = effective.filter(r => r.is_late && !r.is_absent).length
  const earlyOutDays = effective.filter(r => r.is_early_out && !r.is_absent).length

  const violationDeductions = Math.floor((lateDays + earlyOutDays + halfDays) / 3)

  const approvedLeaveDays = input.isProbation ? 0 : input.approvedLeaveDates.size
  const remainingAtStart = Math.max(0, ANNUAL_LEAVES - input.leavesUsedBefore)

  let leavesUsed: number
  let absentSalaryDays: number
  let remainingLeaves: number
  if (input.isProbation) {
    leavesUsed = 0
    absentSalaryDays = absentDays
    remainingLeaves = 0
  } else {
    const availableForAbsences = Math.max(0, remainingAtStart - approvedLeaveDays)
    leavesUsed = Math.min(absentDays, availableForAbsences)
    absentSalaryDays = absentDays - leavesUsed
    remainingLeaves = Math.max(0, availableForAbsences - leavesUsed)
  }

  const totalDeductionDays = violationDeductions + absentSalaryDays
  const dailyRate = input.baseSalary / 30
  const salaryDeduction = Math.round(totalDeductionDays * dailyRate)
  const netSalary = Math.round(input.baseSalary - salaryDeduction - input.incomeTax)

  return {
    workingDays,
    presentDays,
    absentDays,
    lateDays,
    earlyOutDays,
    halfDays,
    violationDeductions,
    approvedLeaveDays,
    leavesUsed,
    absentSalaryDays,
    totalDeductionDays,
    dailyRate: Math.round(dailyRate),
    salaryDeduction,
    netSalary,
    remainingLeaves,
    holidaysExcluded,
    exceptionsApplied,
  }
}
