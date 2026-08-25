/**
 * Shared TypeScript types for the OviTech Salary Portal.
 *
 * Derived from the Supabase schema (scripts/001–013). These replace the
 * `any` types used throughout the v0-generated components.
 */

export interface Profile {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  user_id?: string | null
  employee_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  department?: string | null
  designation?: string | null
  date_of_joining?: string | null
  bank_account?: string | null
  bank_name?: string | null
  ifsc_code?: string | null
  pan?: string | null
  aadhar?: string | null
  is_probation?: boolean
  probation_end_date?: string | null
  leaves_taken?: number
  base_salary?: number
  created_at?: string
  updated_at?: string
}

export interface SalaryStructure {
  id: string
  employee_id: string
  base_salary: number
  hra: number
  dearness_allowance: number
  medical_allowance: number
  transport_allowance: number
  other_allowance: number
  pf_deduction: number
  esi_deduction: number
  professional_tax: number
  loan_deduction: number
  other_deduction: number
  effective_from: string
  created_at: string
  updated_at: string
}

export interface SalarySlip {
  id: string
  employee_id: string
  year: number
  month: number
  base_salary: number | null
  hra: number | null
  dearness_allowance: number | null
  medical_allowance: number | null
  transport_allowance: number | null
  other_allowance: number | null
  total_earnings: number | null
  pf_deduction: number | null
  esi_deduction: number | null
  professional_tax: number | null
  loan_deduction: number | null
  other_deduction: number | null
  total_deductions: number | null
  net_salary: number | null
  working_days: number | null
  present_days: number | null
  absent_days: number | null
  leaves_deducted?: number
  is_probation?: boolean
  // Alternative / JSONB columns that may exist in the database
  basic_salary?: number | null
  allowances?: Record<string, unknown>
  deductions?: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined fields (from employee relation)
  employees?: Employee
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  employee_name?: string
  attendance_date: string
  check_in: string | null
  check_out: string | null
  status?: string
  is_late: boolean
  is_early_out: boolean
  is_absent: boolean
  nine_hour_waiver?: boolean
  worked_hours?: number
  work_hours?: number
  month?: number
  year?: number
  notes?: string | null
  created_at: string
  updated_at?: string
}

export interface CompanySettings {
  id: string
  company_name: string
  company_address: string | null
  company_phone: string | null
  company_email: string | null
  company_website: string | null
  bank_name: string | null
  bank_account: string | null
  ifsc_code: string | null
  cin: string | null
  pan: string | null
  esi_code: string | null
  pf_code: string | null
  updated_at: string
}

/** Data bag passed to SalarySlipPreview — merges salary slip fields with employee info */
export interface SalarySlipPreviewData {
  // Identity
  employee_name?: string | null
  employeeName?: string | null
  employee_id?: string | null
  employeeId?: string | null
  email?: string | null
  department?: string | null
  designation?: string | null
  position?: string | null
  joinDate?: string | null
  // Salary
  basic_salary?: number | null
  baseSalary?: number | null
  base_salary?: number | null
  // Allowances (JSONB or individual)
  allowances?: Record<string, unknown>
  hra?: number | null
  dearness_allowance?: number | null
  medical_allowance?: number | null
  transport_allowance?: number | null
  other_allowance?: number | null
  // Deductions (JSONB or individual)
  deductions?: Record<string, unknown>
  pf_deduction?: number | null
  esi_deduction?: number | null
  professional_tax?: number | null
  loan_deduction?: number | null
  other_deduction?: number | null
  // Leaves & probation
  leaves_deducted?: number
  leaves_taken?: number
  total_leaves_used?: number
  is_probation?: boolean
  probation_end_date?: string | null
  // Period
  month?: number
  year?: number
  net_salary?: number | null
  // Allow additional unknown fields
  [key: string]: unknown
}

/** Enriched attendance record with employee name for display */
export interface EnrichedAttendanceRecord extends AttendanceRecord {
  employee_name: string
  designation?: string | null
  base_salary?: number
  leaves_deducted?: number
  employee_data?: Employee
}
