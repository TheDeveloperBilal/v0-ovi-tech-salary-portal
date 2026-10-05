import { describe, it, expect } from 'vitest'
import {
  getWeekdaysInMonth,
  applySandwichRule,
  parseZKTecoFile,
  processScans,
  calculateEmployeeSummary,
  OFFICE_START,
  OFFICE_END,
  GRACE_MINUTES,
  ANNUAL_LEAVES,
  type ProcessedRecord,
} from '@/lib/attendance-calculations'

describe('getWeekdaysInMonth', () => {
  it('returns correct weekday count for October 2026', () => {
    const days = getWeekdaysInMonth(10, 2026)
    expect(days.length).toBe(22)
    expect(days[0]).toBe('2026-10-01')
    expect(days.every(d => {
      const dow = new Date(d).getDay()
      return dow >= 1 && dow <= 5
    })).toBe(true)
  })

  it('excludes Pakistan Day (March 23)', () => {
    const days = getWeekdaysInMonth(3, 2026)
    expect(days).not.toContain('2026-03-23')
  })

  it('excludes Independence Day (August 14)', () => {
    const days = getWeekdaysInMonth(8, 2026)
    expect(days).not.toContain('2026-08-14')
  })

  it('excludes weekends', () => {
    const days = getWeekdaysInMonth(10, 2026)
    for (const d of days) {
      const dow = new Date(d).getDay()
      expect(dow).not.toBe(0)
      expect(dow).not.toBe(6)
    }
  })
})

describe('applySandwichRule', () => {
  it('returns 0 for empty set', () => {
    expect(applySandwichRule(new Set())).toBe(0)
  })

  it('adds 2 days for Friday absence (sandwich Sat+Sun)', () => {
    const dates = new Set(['2026-10-02']) // Friday
    expect(applySandwichRule(dates)).toBe(3) // 1 + 2 weekend days
  })

  it('adds 2 days for Monday absence (sandwich preceding Sat+Sun)', () => {
    const dates = new Set(['2026-10-05']) // Monday
    expect(applySandwichRule(dates)).toBe(3) // 1 + 2 weekend days
  })

  it('counts weekend only once for Fri+Mon combo', () => {
    const dates = new Set(['2026-10-02', '2026-10-05']) // Fri + Mon
    expect(applySandwichRule(dates)).toBe(4) // 2 + 2 weekend (counted once)
  })

  it('does not add weekend for mid-week absences', () => {
    const dates = new Set(['2026-10-06']) // Tuesday
    expect(applySandwichRule(dates)).toBe(1)
  })
})

describe('parseZKTecoFile', () => {
  it('parses tab-separated ZKTeco lines', () => {
    const content = '101\t2026-10-01\t11:05:00\tMachine1\tDept\tJohn Doe\tI\t0\t0'
    const scans = parseZKTecoFile(content)
    expect(scans).toHaveLength(1)
    expect(scans[0].biometricId).toBe('101')
    expect(scans[0].employeeName).toBe('John Doe')
    expect(scans[0].timestamp).toBeInstanceOf(Date)
  })

  it('parses space-separated lines', () => {
    const content = '101 2026-10-01 11:05:00 Machine1 Dept JohnDoe I 0 0'
    const scans = parseZKTecoFile(content)
    expect(scans).toHaveLength(1)
    expect(scans[0].biometricId).toBe('101')
  })

  it('skips empty and short lines', () => {
    const content = '\n\nshort line\n101\t2026-10-01\t11:00:00\tM\tD\tName\tI\t0\t0\n'
    const scans = parseZKTecoFile(content)
    expect(scans).toHaveLength(1)
  })

  it('handles multiple scans per employee per day', () => {
    const content = [
      '101\t2026-10-01\t11:00:00\tM\tD\tJohn\tI\t0\t0',
      '101\t2026-10-01\t20:00:00\tM\tD\tJohn\tO\t0\t0',
    ].join('\n')
    const scans = parseZKTecoFile(content)
    expect(scans).toHaveLength(2)
  })
})

describe('processScans', () => {
  function makeScan(id: string, name: string, dateTime: string) {
    return { biometricId: id, employeeName: name, timestamp: new Date(dateTime) }
  }

  it('marks on-time attendance correctly', () => {
    const scans = [
      makeScan('101', 'John', '2026-10-01T11:00:00'),
      makeScan('101', 'John', '2026-10-01T20:00:00'),
    ]
    const records = processScans(scans, 10, 2026)
    const oct1 = records.find(r => r.biometricId === '101' && r.date === '2026-10-01')
    expect(oct1).toBeDefined()
    expect(oct1!.isLate).toBe(false)
    expect(oct1!.isEarlyOut).toBe(false)
    expect(oct1!.status).toBe('On Time')
  })

  it('marks late arrival after grace period', () => {
    const scans = [
      makeScan('101', 'John', '2026-10-01T11:20:00'),
      makeScan('101', 'John', '2026-10-01T20:00:00'),
    ]
    const records = processScans(scans, 10, 2026)
    const oct1 = records.find(r => r.biometricId === '101' && r.date === '2026-10-01')
    expect(oct1!.isLate).toBe(true)
    expect(oct1!.status).toBe('Late')
  })

  it('marks early out before office end', () => {
    const scans = [
      makeScan('101', 'John', '2026-10-01T11:00:00'),
      makeScan('101', 'John', '2026-10-01T18:30:00'),
    ]
    const records = processScans(scans, 10, 2026)
    const oct1 = records.find(r => r.biometricId === '101' && r.date === '2026-10-01')
    expect(oct1!.isEarlyOut).toBe(true)
    expect(oct1!.status).toBe('Early Out')
  })

  it('fills absent days for weekdays without scans', () => {
    const scans = [
      makeScan('101', 'John', '2026-10-01T11:00:00'),
      makeScan('101', 'John', '2026-10-01T20:00:00'),
    ]
    const records = processScans(scans, 10, 2026)
    const absents = records.filter(r => r.biometricId === '101' && r.isAbsent)
    expect(absents.length).toBeGreaterThan(0)
  })

  it('calculates work hours', () => {
    const scans = [
      makeScan('101', 'John', '2026-10-01T11:00:00'),
      makeScan('101', 'John', '2026-10-01T20:00:00'),
    ]
    const records = processScans(scans, 10, 2026)
    const oct1 = records.find(r => r.biometricId === '101' && r.date === '2026-10-01')
    expect(oct1!.workHours).toBe(9)
  })
})

describe('calculateEmployeeSummary', () => {
  function makeRecord(overrides: Partial<ProcessedRecord> = {}): ProcessedRecord {
    return {
      biometricId: '101',
      employeeName: 'Test Employee',
      date: '2026-10-01',
      checkIn: '11:00:00',
      checkOut: '20:00:00',
      workHours: 9,
      status: 'On Time',
      isLate: false,
      isEarlyOut: false,
      isAbsent: false,
      nineHourWaiver: false,
      ...overrides,
    }
  }

  const defaultEmployee = {
    baseSalary: 60000,
    designation: 'Developer',
    isProbation: false,
    leavesTaken: 0,
  }

  it('calculates correct counts for all present', () => {
    const records = Array.from({ length: 22 }, (_, i) =>
      makeRecord({ date: `2026-10-${String(i + 1).padStart(2, '0')}` })
    )
    const summary = calculateEmployeeSummary(records, defaultEmployee)
    expect(summary.presentDays).toBe(22)
    expect(summary.absentDays).toBe(0)
    expect(summary.salaryDeduction).toBe(0)
    expect(summary.netPayable).toBe(60000)
  })

  it('deducts salary for 3 lates = 1 day', () => {
    const records = [
      makeRecord({ date: '2026-10-01', isLate: true, status: 'Late' }),
      makeRecord({ date: '2026-10-02', isLate: true, status: 'Late' }),
      makeRecord({ date: '2026-10-03', isLate: true, status: 'Late' }),
      makeRecord({ date: '2026-10-06' }),
      makeRecord({ date: '2026-10-07' }),
    ]
    const summary = calculateEmployeeSummary(records, defaultEmployee)
    expect(summary.lateDays).toBe(3)
    expect(summary.leavesFromViolations).toBe(1) // floor(3/3)
    expect(summary.salaryDeductionDays).toBe(1)
  })

  it('uses leave quota for absences before salary deduction', () => {
    const records = [
      makeRecord({ date: '2026-10-06', isAbsent: true, status: 'Absent', checkIn: null, checkOut: null, workHours: 0 }),
      makeRecord({ date: '2026-10-07', isAbsent: true, status: 'Absent', checkIn: null, checkOut: null, workHours: 0 }),
      makeRecord({ date: '2026-10-01' }),
    ]
    const summary = calculateEmployeeSummary(records, { ...defaultEmployee, leavesTaken: 0 })
    expect(summary.leavesFromAbsent).toBe(2)
    expect(summary.salaryDeductionDays).toBe(0)
  })

  it('deducts salary when leave quota exhausted', () => {
    const records = [
      makeRecord({ date: '2026-10-06', isAbsent: true, status: 'Absent', checkIn: null, checkOut: null, workHours: 0 }),
      makeRecord({ date: '2026-10-01' }),
    ]
    const summary = calculateEmployeeSummary(records, { ...defaultEmployee, leavesTaken: 14 })
    expect(summary.leavesFromAbsent).toBe(0)
    expect(summary.salaryDeductionDays).toBe(1)
  })

  it('probation employees get no leave quota', () => {
    const records = [
      makeRecord({ date: '2026-10-06', isAbsent: true, status: 'Absent', checkIn: null, checkOut: null, workHours: 0 }),
      makeRecord({ date: '2026-10-01' }),
    ]
    const summary = calculateEmployeeSummary(records, { ...defaultEmployee, isProbation: true })
    expect(summary.leavesFromAbsent).toBe(0)
    expect(summary.salaryDeductionDays).toBe(1)
  })

  it('excludes WFH dates from absent count', () => {
    const records = [
      makeRecord({ date: '2026-10-06', isAbsent: true, status: 'Absent', checkIn: null, checkOut: null, workHours: 0 }),
      makeRecord({ date: '2026-10-07', isAbsent: true, status: 'Absent', checkIn: null, checkOut: null, workHours: 0 }),
      makeRecord({ date: '2026-10-01' }),
    ]
    const wfhDates = new Set(['2026-10-06'])
    const summary = calculateEmployeeSummary(records, defaultEmployee, wfhDates)
    expect(summary.absentDays).toBe(1)
  })

  it('calculates daily rate as baseSalary / 30', () => {
    const records = [makeRecord()]
    const summary = calculateEmployeeSummary(records, defaultEmployee)
    expect(summary.dailyRate).toBe(2000)
  })
})

describe('constants', () => {
  it('office hours are 11:00 AM - 8:00 PM', () => {
    expect(OFFICE_START).toEqual({ hour: 11, minute: 0 })
    expect(OFFICE_END).toEqual({ hour: 20, minute: 0 })
  })

  it('grace period is 15 minutes', () => {
    expect(GRACE_MINUTES).toBe(15)
  })

  it('annual leave quota is 14', () => {
    expect(ANNUAL_LEAVES).toBe(14)
  })
})
