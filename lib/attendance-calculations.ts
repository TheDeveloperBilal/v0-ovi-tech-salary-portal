// lib/attendance-calculations.ts
// Business logic for attendance processing — mirrors the static HTML converter

// ── Office Schedule ──────────────────────────────────────────────────
export const OFFICE_START = { hour: 11, minute: 0 }  // 11:00 AM
export const OFFICE_END = { hour: 20, minute: 0 }    // 8:00 PM
export const GRACE_MINUTES = 15                        // 15-min grace
export const MIN_HOURS_FOR_WAIVER = 9                  // 9-hour late waiver
export const ANNUAL_LEAVES = 14                        // 14 annual leaves

// ── Types ────────────────────────────────────────────────────────────

/** A single biometric scan from the ZKTeco file */
export interface RawScan {
  biometricId: string   // Account ID from column 0 (maps to Employee ID on portal)
  employeeName: string  // Name from column 5 (fallback only)
  timestamp: Date
}

/** Grouped scans for one employee on one day */
export interface DayEntry {
  biometricId: string   // Primary key for grouping
  employeeName: string  // Fallback display name from biometric file
  date: string          // YYYY-MM-DD
  dateObj: Date
  scans: Date[]
}

/** Fully processed attendance record ready for DB save */
export interface ProcessedRecord {
  biometricId: string   // ZKTeco Account ID = portal Employee ID
  employeeName: string  // Fallback name from biometric file
  date: string          // YYYY-MM-DD
  checkIn: string | null   // HH:MM:SS (24h)
  checkOut: string | null  // HH:MM:SS (24h)
  workHours: number
  status: 'On Time' | 'Late' | 'Early Out' | 'Late & Early Out' | 'Absent'
  isLate: boolean
  isEarlyOut: boolean
  isAbsent: boolean
  nineHourWaiver: boolean
}

/** Per-employee monthly summary */
export interface EmployeeSummary {
  employeeName: string
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  earlyOutDays: number
  leavesFromViolations: number  // floor((late + earlyOut) / 3)
  leavesFromAbsent: number      // absences deducted from leave quota or salary
  totalLeavesDeducted: number
  salaryDeductionDays: number   // days where salary is deducted (3 lates = 1 day)
  baseSalary: number
  dailyRate: number
  salaryDeduction: number
  netPayable: number
  designation: string
  isProbation: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatTime24(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  return parts[0] * 60 + parts[1]
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Check if a date falls on a Pakistani public holiday */
function isHoliday(date: Date): boolean {
  const m = date.getMonth() + 1
  const d = date.getDate()
  // March 23 = Pakistan Day
  if (m === 3 && d === 23) return true
  // Aug 14 = Independence Day
  if (m === 8 && d === 14) return true
  return false
}

/** Get all weekdays (Mon-Fri) in a given month/year */
export function getWeekdaysInMonth(month: number, year: number): string[] {
  const days: string[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dow = date.getDay()
    // Mon=1 to Fri=5 are working days, skip Sat=6 and Sun=0
    if (dow >= 1 && dow <= 5 && !isHoliday(date)) {
      days.push(toDateKey(date))
    }
  }
  return days
}

// ── ZKTeco File Parser ───────────────────────────────────────────────

/**
 * Parse a ZKTeco exported TXT file into raw scans.
 *
 * Expected format (space/tab separated):
 * ID  YYYY-MM-DD HH:MM:SS  MACHINE  DEPT  NAME  I/O  FLAG1  FLAG2
 *
 * Column indices (0-based) from the user's actual file:
 * [0]=ID  [1]=date  [2]=time  [3]=machine  [4]=dept  [5]=name  [6]=I/O  [7]=flag  [8]=flag
 */
export function parseZKTecoFile(content: string): RawScan[] {
  const scans: RawScan[] = []
  const lines = content.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Split by tab first, then by whitespace
    let parts: string[]
    if (line.includes('\t')) {
      parts = line.split('\t').map(c => c.trim())
    } else {
      parts = line.split(/\s+/)
    }

    if (parts.length < 6) continue

    // Detect the format by checking patterns
    const id = parts[0].trim()       // Column 0 = Account ID (ZKTeco)
    let name: string | null = null
    let timestamp: Date | null = null

    // Pattern: ID DATE TIME MACHINE DEPT NAME ...
    // parts[1] = YYYY-MM-DD, parts[2] = HH:MM:SS, parts[5] = name
    if (/^\d{4}-\d{2}-\d{2}$/.test(parts[1]) && /^\d{1,2}:\d{2}:\d{2}$/.test(parts[2])) {
      timestamp = new Date(`${parts[1]}T${parts[2]}`)
      name = parts[5]
    }
    // Pattern: ID "YYYY-MM-DD HH:MM:SS" MACHINE DEPT NAME ...
    // (combined timestamp in one column)
    else if (/^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}$/.test(parts[1])) {
      timestamp = new Date(parts[1].replace(' ', 'T'))
      name = parts[4]
    }

    if (!timestamp || isNaN(timestamp.getTime())) continue

    scans.push({ biometricId: id, employeeName: (name || id).trim(), timestamp })
  }

  return scans
}

// ── Core Processing ──────────────────────────────────────────────────

/**
 * Group raw scans by employee + date, then determine check-in/check-out
 * and attendance status for each day.
 */
export function processScans(
  scans: RawScan[],
  month: number,
  year: number
): ProcessedRecord[] {
  // 1. Group scans by biometricId + date
  const grouped: Record<string, DayEntry> = {}

  for (const scan of scans) {
    const dateKey = toDateKey(scan.timestamp)
    // Only include scans from the target month/year
    if (scan.timestamp.getMonth() + 1 !== month || scan.timestamp.getFullYear() !== year) {
      continue
    }

    const key = `${scan.biometricId}_${dateKey}`
    if (!grouped[key]) {
      grouped[key] = {
        biometricId: scan.biometricId,
        employeeName: scan.employeeName,
        date: dateKey,
        dateObj: scan.timestamp,
        scans: []
      }
    }
    grouped[key].scans.push(scan.timestamp)
  }

  // 2. Process each day entry
  const records: ProcessedRecord[] = []
  const employeeIds = new Set<string>()

  for (const entry of Object.values(grouped)) {
    employeeIds.add(entry.biometricId)
    entry.scans.sort((a, b) => a.getTime() - b.getTime())

    const firstScan = entry.scans[0]
    const lastScan = entry.scans[entry.scans.length - 1]
    const scanCount = entry.scans.length

    const checkIn = formatTime24(firstScan)
    const checkOut = scanCount > 1 ? formatTime24(lastScan) : null

    // Calculate work hours
    let workHours = 0
    if (scanCount > 1) {
      workHours = (lastScan.getTime() - firstScan.getTime()) / (1000 * 60 * 60)
    }

    // Determine late/early status
    const officeStartMin = OFFICE_START.hour * 60 + OFFICE_START.minute
    const officeEndMin = OFFICE_END.hour * 60 + OFFICE_END.minute
    const checkInMin = timeToMinutes(checkIn)

    let isLate = false
    let isEarlyOut = false
    let nineHourWaiver = false

    // Late check: arrived after grace period
    if (checkInMin > officeStartMin + GRACE_MINUTES) {
      isLate = true
      // 9-hour waiver: if worked ≥9 hours, forgive late
      if (workHours >= MIN_HOURS_FOR_WAIVER) {
        isLate = false
        nineHourWaiver = true
      }
    }

    // Early out check
    if (scanCount === 1) {
      // Only 1 scan (missing checkout) = automatic early out
      isEarlyOut = true
    } else if (checkOut) {
      const checkOutMin = timeToMinutes(checkOut)
      if (checkOutMin < officeEndMin) {
        isEarlyOut = true
      }
    }

    // Determine status label
    let status: ProcessedRecord['status'] = 'On Time'
    if (isLate && isEarlyOut) status = 'Late & Early Out'
    else if (isLate) status = 'Late'
    else if (isEarlyOut) status = 'Early Out'

    records.push({
      biometricId: entry.biometricId,
      employeeName: entry.employeeName,
      date: entry.date,
      checkIn,
      checkOut,
      workHours: parseFloat(workHours.toFixed(2)),
      status,
      isLate,
      isEarlyOut,
      isAbsent: false,
      nineHourWaiver
    })
  }

  // 3. Fill absent days for all employees (weekdays with no scans)
  const weekdays = getWeekdaysInMonth(month, year)

  for (const empId of employeeIds) {
    // Find the name associated with this ID (for fallback display)
    const empName = records.find(r => r.biometricId === empId)?.employeeName || empId
    for (const dayStr of weekdays) {
      const exists = records.some(r => r.biometricId === empId && r.date === dayStr)
      if (!exists) {
        records.push({
          biometricId: empId,
          employeeName: empName,
          date: dayStr,
          checkIn: null,
          checkOut: null,
          workHours: 0,
          status: 'Absent',
          isLate: false,
          isEarlyOut: false,
          isAbsent: true,
          nineHourWaiver: false
        })
      }
    }
  }

  // 4. Sort by date then biometric ID
  records.sort((a, b) => a.date.localeCompare(b.date) || a.biometricId.localeCompare(b.biometricId))

  return records
}

// ── Summary Calculation ──────────────────────────────────────────────

/**
 * Calculate per-employee monthly summary with deduction rules:
 * - 3 lates/early-outs = 1 day salary deducted
 * - Absent = deducted from leave quota (14 annual)
 * - If leave quota exhausted OR on probation = salary deducted
 */
export function calculateEmployeeSummary(
  records: ProcessedRecord[],
  employee: {
    baseSalary: number
    designation: string
    isProbation: boolean
    leavesTaken: number   // leaves already taken this year
  },
  wfhDates?: Set<string>,
): EmployeeSummary {
  const empRecords = records
  const totalDays = empRecords.length
  const absentDays = empRecords.filter(r => r.isAbsent && !(wfhDates?.has(r.date))).length
  const presentDays = totalDays - absentDays
  const lateDays = empRecords.filter(r => r.isLate && !r.isAbsent).length
  const earlyOutDays = empRecords.filter(r => r.isEarlyOut && !r.isAbsent).length

  // 3 violations (late + early out) = 1 day salary deduction
  const totalViolations = lateDays + earlyOutDays
  const salaryDeductionDays = Math.floor(totalViolations / 3)

  // Absent handling depends on probation and leave balance
  const remainingLeaves = Math.max(0, ANNUAL_LEAVES - employee.leavesTaken)

  let leavesFromAbsent: number
  let absentSalaryDeductionDays: number

  if (employee.isProbation) {
    // Probation = no leaves at all, every absence = salary deduction
    leavesFromAbsent = 0
    absentSalaryDeductionDays = absentDays
  } else {
    // Use leave quota first, then salary deduction
    leavesFromAbsent = Math.min(absentDays, remainingLeaves)
    absentSalaryDeductionDays = Math.max(0, absentDays - remainingLeaves)
  }

  const totalSalaryDeductionDays = salaryDeductionDays + absentSalaryDeductionDays
  const dailyRate = employee.baseSalary / 30
  const salaryDeduction = Math.round(totalSalaryDeductionDays * dailyRate)
  const netPayable = Math.round(employee.baseSalary - salaryDeduction)

  return {
    employeeName: empRecords[0]?.employeeName || '',
    totalDays,
    presentDays,
    absentDays,
    lateDays,
    earlyOutDays,
    leavesFromViolations: salaryDeductionDays,
    leavesFromAbsent,
    totalLeavesDeducted: leavesFromAbsent + salaryDeductionDays,
    salaryDeductionDays: totalSalaryDeductionDays,
    baseSalary: employee.baseSalary,
    dailyRate: Math.round(dailyRate),
    salaryDeduction,
    netPayable,
    designation: employee.designation,
    isProbation: employee.isProbation
  }
}
