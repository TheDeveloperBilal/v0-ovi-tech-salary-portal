import { z } from 'zod'

// ── Employee schemas ──

export const addEmployeeSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required').max(50),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Valid email is required'),
  phone: z.string().max(20).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
  date_of_joining: z.string().optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  base_salary: z.union([z.string(), z.number()]).optional(),
  income_tax: z.union([z.string(), z.number()]).optional(),
  is_probation: z.boolean().optional(),
  probation_end_date: z.string().optional().nullable(),
})

export const resetPasswordSchema = z.object({
  employeeId: z.string().uuid('Valid employee ID is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

// ── Leave request schemas ──

export const createLeaveRequestSchema = z.object({
  leave_type: z.enum(['casual_leave', 'sick_leave', 'work_from_home', 'half_day', 'early_out', 'other']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reason: z.string().max(500).optional().nullable(),
})

export const deleteLeaveRequestSchema = z.object({
  id: z.string().uuid('Valid leave request ID is required'),
})

// ── Attendance schemas ──

export const calculateLeavesSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  employeeId: z.string().min(1, 'Employee ID is required'),
})

export const deleteAttendanceRecordSchema = z.object({
  recordId: z.string().uuid('Valid record ID is required'),
})

// ── Notice schemas ──

export const createNoticeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(5000),
  priority: z.enum(['normal', 'important', 'urgent']).optional(),
  target_type: z.enum(['all', 'specific']).optional(),
  target_employee_ids: z.array(z.string().uuid()).optional(),
  duration_days: z.number().int().min(1).max(365).optional(),
})

export const deleteNoticeSchema = z.object({
  id: z.string().uuid('Valid notice ID is required'),
})

// ── Policy schemas ──

export const signPolicySchema = z.object({
  policy_id: z.string().uuid('Valid policy ID is required'),
  signature_text: z.string().min(1).max(500_000, 'Signature data too large'),
})

export const deletePolicySchema = z.object({
  id: z.string().uuid('Valid policy ID is required'),
})

// ── Audit log schemas ──

export const createAuditLogSchema = z.object({
  action: z.string().min(1, 'Action is required').max(100),
  entity_type: z.string().min(1, 'Entity type is required').max(100),
  entity_id: z.string().max(100).optional().nullable(),
  details: z.record(z.unknown()).optional(),
})

// ── Helper to parse and return typed errors ──

export function parseBody<T extends z.ZodType>(
  schema: T,
  data: unknown,
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const firstError = result.error.issues[0]
  return {
    success: false,
    error: firstError
      ? `${firstError.path.join('.')}: ${firstError.message}`.replace(/^: /, '')
      : 'Invalid input',
  }
}
