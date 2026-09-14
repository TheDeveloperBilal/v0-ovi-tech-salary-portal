-- Migration 014: Add missing columns to attendance_records
-- The live table was created from 012 schema (minimal columns).
-- The app expects columns from 011 schema. This adds them safely.

-- Add employee_name for display without joins
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS employee_name TEXT;

-- Add work_hours (numeric, matches 011 schema)
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS work_hours NUMERIC;

-- Add nine_hour_waiver flag
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS nine_hour_waiver BOOLEAN DEFAULT FALSE;

-- Add month/year for efficient filtering
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS month INTEGER;

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS year INTEGER;

-- Create index for month/year filtering
CREATE INDEX IF NOT EXISTS idx_attendance_month_year
  ON public.attendance_records(month, year);

-- Backfill month/year from existing attendance_date for any old records
UPDATE public.attendance_records
SET
  month = EXTRACT(MONTH FROM attendance_date)::INTEGER,
  year = EXTRACT(YEAR FROM attendance_date)::INTEGER
WHERE month IS NULL OR year IS NULL;
