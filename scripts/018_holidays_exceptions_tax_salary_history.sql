-- Migration 018: Holidays, Attendance Exceptions, Income Tax, Salary History
-- Run this in Supabase SQL Editor

-- ══════════════════════════════════════════════════════════════════
-- 1. Company Holidays table
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'public_holiday'
    CHECK (type IN ('public_holiday', 'company_holiday', 'optional_holiday')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(holiday_date)
);

ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holidays_select_authenticated"
  ON public.company_holidays FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "holidays_insert_admin"
  ON public.company_holidays FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "holidays_update_admin"
  ON public.company_holidays FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "holidays_delete_admin"
  ON public.company_holidays FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ══════════════════════════════════════════════════════════════════
-- 2. Attendance Exceptions table
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.attendance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('approved_leave', 'approved_late', 'approved_early_out', 'half_day', 'work_from_home')),
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, exception_date, type)
);

ALTER TABLE public.attendance_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exceptions_select_authenticated"
  ON public.attendance_exceptions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "exceptions_insert_admin"
  ON public.attendance_exceptions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "exceptions_update_admin"
  ON public.attendance_exceptions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "exceptions_delete_admin"
  ON public.attendance_exceptions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ══════════════════════════════════════════════════════════════════
-- 3. Income Tax field on employees
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS income_tax NUMERIC(12, 2) DEFAULT 0;

-- ══════════════════════════════════════════════════════════════════
-- 4. Salary History table (tracks salary changes with effective dates)
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  salary NUMERIC(12, 2) NOT NULL,
  effective_from DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salary_history_select_authenticated"
  ON public.salary_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "salary_history_insert_admin"
  ON public.salary_history FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "salary_history_delete_admin"
  ON public.salary_history FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ══════════════════════════════════════════════════════════════════
-- 5. Add income_tax column to salary_slips for storing tax on generated slips
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.salary_slips ADD COLUMN IF NOT EXISTS income_tax NUMERIC(12, 2) DEFAULT 0;

-- ══════════════════════════════════════════════════════════════════
-- 6. Seed initial salary history from current employee salaries
-- ══════════════════════════════════════════════════════════════════
INSERT INTO public.salary_history (employee_id, salary, effective_from, reason)
SELECT id, base_salary, COALESCE(date_of_joining, '2026-01-01'), 'Initial salary (auto-migrated)'
FROM public.employees
WHERE base_salary > 0
ON CONFLICT DO NOTHING;
