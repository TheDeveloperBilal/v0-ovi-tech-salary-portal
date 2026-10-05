-- Migration 024: Backfill user_id in employees table
--
-- ROOT CAUSE FIX: Most employees have user_id = NULL because the add-employee
-- flow didn't always set it correctly, and the profiles trigger creates profiles
-- asynchronously. This broke all RLS policies that checked user_id = auth.uid().
--
-- This migration:
-- 1. Backfills user_id by matching employees.email → auth.users.email → profiles.id
-- 2. Creates a trigger to auto-set user_id on future inserts/updates
--
-- SAFE: Only updates rows where user_id IS NULL and a matching profile exists.
-- Run in Supabase Dashboard → SQL Editor

-- Step 1: Backfill existing employees
-- Match employees to auth users via email, then link to profiles
UPDATE public.employees e
SET user_id = p.id
FROM auth.users au
JOIN public.profiles p ON p.id = au.id
WHERE e.email = au.email
  AND e.user_id IS NULL;

-- Step 2: Verify the backfill (run this SELECT to check results)
-- SELECT id, employee_id, first_name, last_name, email, user_id
-- FROM public.employees
-- ORDER BY first_name;

-- Step 3: Create trigger to auto-link future employees
CREATE OR REPLACE FUNCTION public.auto_link_employee_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT p.id INTO NEW.user_id
    FROM auth.users au
    JOIN public.profiles p ON p.id = au.id
    WHERE au.email = NEW.email
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_link_employee_user_id ON public.employees;

CREATE TRIGGER trg_auto_link_employee_user_id
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_employee_user_id();
