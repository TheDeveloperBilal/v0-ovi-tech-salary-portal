-- Migration 020: Ensure salary_history has full admin CRUD policies
-- Run this in Supabase SQL Editor

-- Enable RLS if not already
ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

-- Admin can select all salary history
DO $$ BEGIN
  CREATE POLICY "salary_history_select_admin"
    ON public.salary_history FOR SELECT
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin can insert salary history
DO $$ BEGIN
  CREATE POLICY "salary_history_insert_admin"
    ON public.salary_history FOR INSERT
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin can update salary history
DO $$ BEGIN
  CREATE POLICY "salary_history_update_admin"
    ON public.salary_history FOR UPDATE
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin can delete salary history
DO $$ BEGIN
  CREATE POLICY "salary_history_delete_admin"
    ON public.salary_history FOR DELETE
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
