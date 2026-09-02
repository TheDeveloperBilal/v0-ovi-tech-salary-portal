-- Migration 016: Add attendance_summary JSONB to salary_slips
-- Stores the detailed attendance breakdown for auto-generated slips:
-- { lateDays, earlyOutDays, violationDeductions, leavesUsed, absentSalaryDays, remainingLeaves }

ALTER TABLE public.salary_slips
  ADD COLUMN IF NOT EXISTS attendance_summary JSONB;
