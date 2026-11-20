import { describe, it, expect } from 'vitest'
import { calculateMonthlySlip, quotaDatesBetween, currentLeaveYear, type SlipAttendanceRecord } from '@/lib/leave-rules'

const day = (date: string, flags: Partial<SlipAttendanceRecord> = {}): SlipAttendanceRecord => ({
  attendance_date: date,
  is_absent: false,
  is_late: false,
  is_early_out: false,
  ...flags,
})

const base = {
  holidayDates: new Set<string>(),
  exceptionsByDate: new Map<string, string[]>(),
  approvedLeaveDates: new Set<string>(),
  baseSalary: 30000,
  incomeTax: 0,
  isProbation: false,
  leavesUsedBefore: 0,
}

describe('quotaDatesBetween', () => {
  it('counts weekdays only and skips holidays', () => {
    // 2026-08-21 Fri .. 2026-08-26 Wed, holiday on 26th
    expect(quotaDatesBetween('2026-08-21', '2026-08-26', new Set(['2026-08-26'])))
      .toEqual(['2026-08-21', '2026-08-24', '2026-08-25'])
  })
})

describe('currentLeaveYear', () => {
  it('uses Pakistan time for the new year', () => {
    expect(currentLeaveYear(new Date('2026-12-31T19:30:00Z'))).toBe(2027)
    expect(currentLeaveYear(new Date('2026-12-31T18:30:00Z'))).toBe(2026)
  })
})

describe('calculateMonthlySlip', () => {
  it('counts late, early out and half day together as violations (3 = 1 day salary)', () => {
    const r = calculateMonthlySlip({
      ...base,
      records: [day('2026-11-02', { is_late: true }), day('2026-11-03', { is_early_out: true }), day('2026-11-04', { is_late: true })],
      exceptionsByDate: new Map([['2026-11-04', ['half_day']]]),
    })
    expect(r.lateDays).toBe(1)
    expect(r.earlyOutDays).toBe(1)
    expect(r.halfDays).toBe(1)
    expect(r.violationDeductions).toBe(1)
    expect(r.salaryDeduction).toBe(1000)
    expect(r.leavesUsed).toBe(0)
  })

  it('does not use leave quota for half days', () => {
    const r = calculateMonthlySlip({
      ...base,
      records: [day('2026-11-02', { is_absent: true })],
      exceptionsByDate: new Map([['2026-11-02', ['half_day']]]),
    })
    expect(r.absentDays).toBe(0)
    expect(r.remainingLeaves).toBe(14)
  })

  it('uses quota for approved casual/sick leave without deducting salary', () => {
    const r = calculateMonthlySlip({
      ...base,
      records: [day('2026-11-02', { is_absent: true }), day('2026-11-03', { is_absent: true })],
      exceptionsByDate: new Map([['2026-11-02', ['approved_leave']], ['2026-11-03', ['approved_leave']]]),
      approvedLeaveDates: new Set(['2026-11-02', '2026-11-03']),
      leavesUsedBefore: 5,
    })
    expect(r.approvedLeaveDays).toBe(2)
    expect(r.absentDays).toBe(0)
    expect(r.salaryDeduction).toBe(0)
    expect(r.remainingLeaves).toBe(7)
  })

  it('deducts salary only for absences beyond the remaining quota', () => {
    const r = calculateMonthlySlip({
      ...base,
      records: [day('2026-11-02', { is_absent: true }), day('2026-11-03', { is_absent: true }), day('2026-11-04', { is_absent: true })],
      leavesUsedBefore: 12,
    })
    expect(r.leavesUsed).toBe(2)
    expect(r.absentSalaryDays).toBe(1)
    expect(r.salaryDeduction).toBe(1000)
    expect(r.remainingLeaves).toBe(0)
  })

  it('gives the same result when the same month is generated twice', () => {
    const input = { ...base, records: [day('2026-11-02', { is_absent: true })], leavesUsedBefore: 13 }
    expect(calculateMonthlySlip(input)).toEqual(calculateMonthlySlip(input))
  })

  it('skips holidays and deducts every absence on probation', () => {
    const r = calculateMonthlySlip({
      ...base,
      isProbation: true,
      records: [day('2026-08-26', { is_absent: true }), day('2026-08-27', { is_absent: true })],
      holidayDates: new Set(['2026-08-26']),
    })
    expect(r.holidaysExcluded).toBe(1)
    expect(r.absentSalaryDays).toBe(1)
    expect(r.remainingLeaves).toBe(0)
  })

  it('subtracts income tax from net salary', () => {
    const r = calculateMonthlySlip({ ...base, records: [day('2026-11-02')], incomeTax: 500 })
    expect(r.netSalary).toBe(29500)
  })
})
