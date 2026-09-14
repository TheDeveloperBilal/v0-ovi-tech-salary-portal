-- Migration 015: Add base_salary column to employees table
-- Salary was previously in a separate salary_structures table, but
-- it's simpler to store it directly on the employee record so the
-- add/edit employee forms can manage it.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12, 2) DEFAULT 0;

-- Backfill from salary_structures if any data exists there
UPDATE public.employees e
SET base_salary = ss.base_salary
FROM public.salary_structures ss
WHERE ss.employee_id = e.id
  AND (e.base_salary IS NULL OR e.base_salary = 0);
