-- Migration 013: Add user_id column to employees table
--
-- The user_id column was defined in 001_create_tables.sql but was missing
-- from the live Supabase database. Without it:
--   - Adding employees fails ("Could not find the 'user_id' column")
--   - RLS policies that reference user_id don't scope correctly
--   - Employee portal can't match auth users to employee records
--
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Optional: Create an index on user_id for faster lookups in RLS policies
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
