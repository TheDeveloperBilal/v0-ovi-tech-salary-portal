import { describe, it, expect } from 'vitest'
import {
  addEmployeeSchema,
  resetPasswordSchema,
  createLeaveRequestSchema,
  deleteLeaveRequestSchema,
  calculateLeavesSchema,
  deleteAttendanceRecordSchema,
  createNoticeSchema,
  deleteNoticeSchema,
  signPolicySchema,
  deletePolicySchema,
  createAuditLogSchema,
  parseBody,
} from '@/lib/validations'

describe('addEmployeeSchema', () => {
  const validEmployee = {
    employee_id: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    password: 'securepass123',
  }

  it('accepts valid input', () => {
    expect(addEmployeeSchema.safeParse(validEmployee).success).toBe(true)
  })

  it('accepts optional fields', () => {
    const result = addEmployeeSchema.safeParse({
      ...validEmployee,
      phone: '03001234567',
      department: 'Engineering',
      designation: 'Developer',
      base_salary: 50000,
      income_tax: 5000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing employee_id', () => {
    const { employee_id, ...rest } = validEmployee
    expect(addEmployeeSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(addEmployeeSchema.safeParse({ ...validEmployee, email: 'bad' }).success).toBe(false)
  })

  it('rejects short password', () => {
    expect(addEmployeeSchema.safeParse({ ...validEmployee, password: '123' }).success).toBe(false)
  })

  it('accepts base_salary as string or number', () => {
    expect(addEmployeeSchema.safeParse({ ...validEmployee, base_salary: '50000' }).success).toBe(true)
    expect(addEmployeeSchema.safeParse({ ...validEmployee, base_salary: 50000 }).success).toBe(true)
  })

  it('accepts probation fields', () => {
    expect(addEmployeeSchema.safeParse({ ...validEmployee, is_probation: true, probation_end_date: '2026-12-31' }).success).toBe(true)
  })
})

describe('resetPasswordSchema', () => {
  it('accepts valid UUID + password', () => {
    const result = resetPasswordSchema.safeParse({
      employeeId: '550e8400-e29b-41d4-a716-446655440000',
      newPassword: 'newpassword1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-UUID employeeId', () => {
    expect(resetPasswordSchema.safeParse({ employeeId: 'abc', newPassword: 'newpassword1' }).success).toBe(false)
  })

  it('rejects short password', () => {
    expect(resetPasswordSchema.safeParse({
      employeeId: '550e8400-e29b-41d4-a716-446655440000',
      newPassword: 'short',
    }).success).toBe(false)
  })
})

describe('createLeaveRequestSchema', () => {
  const validRequest = {
    leave_type: 'casual_leave' as const,
    start_date: '2026-10-05',
    end_date: '2026-10-06',
  }

  it('accepts valid leave request', () => {
    expect(createLeaveRequestSchema.safeParse(validRequest).success).toBe(true)
  })

  it('accepts with reason', () => {
    expect(createLeaveRequestSchema.safeParse({ ...validRequest, reason: 'Family event' }).success).toBe(true)
  })

  it('rejects invalid leave_type', () => {
    expect(createLeaveRequestSchema.safeParse({ ...validRequest, leave_type: 'vacation' }).success).toBe(false)
  })

  it('rejects wrong date format', () => {
    expect(createLeaveRequestSchema.safeParse({ ...validRequest, start_date: '05-10-2026' }).success).toBe(false)
  })

  it('accepts all valid leave types', () => {
    for (const type of ['casual_leave', 'sick_leave', 'work_from_home', 'half_day', 'early_out', 'other']) {
      expect(createLeaveRequestSchema.safeParse({ ...validRequest, leave_type: type }).success).toBe(true)
    }
  })
})

describe('calculateLeavesSchema', () => {
  it('accepts valid month/year/employeeId', () => {
    expect(calculateLeavesSchema.safeParse({ month: 10, year: 2026, employeeId: 'EMP001' }).success).toBe(true)
  })

  it('rejects month out of range', () => {
    expect(calculateLeavesSchema.safeParse({ month: 0, year: 2026, employeeId: 'EMP001' }).success).toBe(false)
    expect(calculateLeavesSchema.safeParse({ month: 13, year: 2026, employeeId: 'EMP001' }).success).toBe(false)
  })

  it('rejects year out of range', () => {
    expect(calculateLeavesSchema.safeParse({ month: 1, year: 2019, employeeId: 'EMP001' }).success).toBe(false)
  })
})

describe('createNoticeSchema', () => {
  it('accepts valid notice', () => {
    expect(createNoticeSchema.safeParse({ title: 'Meeting', content: 'All hands at 3 PM' }).success).toBe(true)
  })

  it('rejects empty title', () => {
    expect(createNoticeSchema.safeParse({ title: '', content: 'Content' }).success).toBe(false)
  })

  it('accepts optional priority and target fields', () => {
    const result = createNoticeSchema.safeParse({
      title: 'Urgent',
      content: 'Office closed',
      priority: 'urgent',
      target_type: 'all',
      duration_days: 7,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid priority', () => {
    expect(createNoticeSchema.safeParse({ title: 'X', content: 'Y', priority: 'critical' }).success).toBe(false)
  })
})

describe('UUID-based delete schemas', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000'

  it('deleteLeaveRequestSchema accepts valid UUID', () => {
    expect(deleteLeaveRequestSchema.safeParse({ id: validUUID }).success).toBe(true)
  })

  it('deleteAttendanceRecordSchema accepts valid UUID', () => {
    expect(deleteAttendanceRecordSchema.safeParse({ recordId: validUUID }).success).toBe(true)
  })

  it('deleteNoticeSchema accepts valid UUID', () => {
    expect(deleteNoticeSchema.safeParse({ id: validUUID }).success).toBe(true)
  })

  it('deletePolicySchema accepts valid UUID', () => {
    expect(deletePolicySchema.safeParse({ id: validUUID }).success).toBe(true)
  })

  it('signPolicySchema accepts valid input', () => {
    expect(signPolicySchema.safeParse({ policy_id: validUUID, signature_text: 'I agree' }).success).toBe(true)
  })

  it('rejects non-UUID IDs', () => {
    expect(deleteLeaveRequestSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false)
    expect(deleteNoticeSchema.safeParse({ id: '123' }).success).toBe(false)
  })
})

describe('createAuditLogSchema', () => {
  it('accepts valid audit log entry', () => {
    expect(createAuditLogSchema.safeParse({
      action: 'delete_employee',
      entity_type: 'employee',
      entity_id: 'EMP001',
    }).success).toBe(true)
  })

  it('rejects missing action', () => {
    expect(createAuditLogSchema.safeParse({ action: '', entity_type: 'x' }).success).toBe(false)
  })

  it('accepts optional details object', () => {
    const result = createAuditLogSchema.safeParse({
      action: 'update',
      entity_type: 'salary',
      details: { old_salary: 50000, new_salary: 60000 },
    })
    expect(result.success).toBe(true)
  })
})

describe('parseBody helper', () => {
  it('returns typed data on success', () => {
    const result = parseBody(deleteLeaveRequestSchema, { id: '550e8400-e29b-41d4-a716-446655440000' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('550e8400-e29b-41d4-a716-446655440000')
    }
  })

  it('returns error string on failure', () => {
    const result = parseBody(deleteLeaveRequestSchema, { id: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('id')
    }
  })

  it('returns error for empty input', () => {
    const result = parseBody(addEmployeeSchema, {})
    expect(result.success).toBe(false)
  })
})
