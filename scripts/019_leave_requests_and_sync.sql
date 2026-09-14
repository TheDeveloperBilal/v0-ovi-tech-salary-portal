-- Migration 019: Leave Requests system + leaves_taken sync
-- Run this in Supabase SQL Editor

-- ══════════════════════════════════════════════════════════════════
-- 1. Leave Requests table (employee-initiated, admin-approved)
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL
    CHECK (leave_type IN ('casual_leave', 'sick_leave', 'work_from_home', 'half_day', 'early_out', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_remarks TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Employees can see their own leave requests; admins can see all
CREATE POLICY "leave_requests_select"
  ON public.leave_requests FOR SELECT
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Employees can insert their own leave requests
CREATE POLICY "leave_requests_insert"
  ON public.leave_requests FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Only admins can update (approve/reject)
CREATE POLICY "leave_requests_update_admin"
  ON public.leave_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Employees can delete their own pending requests; admins can delete any
CREATE POLICY "leave_requests_delete"
  ON public.leave_requests FOR DELETE
  USING (
    (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
     AND status = 'pending')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ══════════════════════════════════════════════════════════════════
-- 2. Sync leaves_taken from actual attendance data (May 2026 onwards)
--    Jan-Apr 2026 = relaxation period, no leaves counted
-- ══════════════════════════════════════════════════════════════════
UPDATE public.employees e
SET leaves_taken = COALESCE(absent_counts.total_absents, 0)
FROM (
  SELECT
    ar.employee_id,
    COUNT(*) AS total_absents
  FROM public.attendance_records ar
  WHERE ar.is_absent = true
    AND (ar.year > 2026 OR (ar.year = 2026 AND ar.month >= 5))
    -- Exclude holidays
    AND ar.attendance_date NOT IN (SELECT holiday_date FROM public.company_holidays)
    -- Exclude approved exceptions
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance_exceptions ae
      WHERE ae.employee_id = ar.employee_id
        AND ae.exception_date = ar.attendance_date
        AND ae.type IN ('approved_leave', 'work_from_home')
    )
  GROUP BY ar.employee_id
) absent_counts
WHERE e.id = absent_counts.employee_id;

-- Reset to 0 for employees with no absences
UPDATE public.employees
SET leaves_taken = 0
WHERE id NOT IN (
  SELECT DISTINCT employee_id
  FROM public.attendance_records
  WHERE is_absent = true
    AND (year > 2026 OR (year = 2026 AND month >= 5))
);
