-- Migration 017: Ensure all required columns exist on salary_slips
-- Fixes "Could not find column X in schema cache" errors

-- Attendance tracking columns (may already exist from 001)
ALTER TABLE public.salary_slips ADD COLUMN IF NOT EXISTS working_days INTEGER DEFAULT 26;
ALTER TABLE public.salary_slips ADD COLUMN IF NOT EXISTS present_days INTEGER DEFAULT 26;
ALTER TABLE public.salary_slips ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0;

-- Leave tracking (from 006)
ALTER TABLE public.salary_slips ADD COLUMN IF NOT EXISTS leaves_taken INTEGER DEFAULT 0;
ALTER TABLE public.salary_slips ADD COLUMN IF NOT EXISTS leaves_deducted NUMERIC(12, 2) DEFAULT 0;

-- Probation flag (from 010)
ALTER TABLE public.salary_slips ADD COLUMN IF NOT EXISTS is_probation BOOLEAN DEFAULT false;

-- Attendance summary JSON for auto-generated slips (from 016)
ALTER TABLE public.salary_slips ADD COLUMN IF NOT EXISTS attendance_summary JSONB;

-- Delete policy if not exists (needed for regeneration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'salary_slips' AND policyname = 'salary_slips_delete_admin'
  ) THEN
    CREATE POLICY salary_slips_delete_admin
      ON public.salary_slips FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND is_admin = true
        )
      );
  END IF;
END $$;
