-- Migrate existing profiles to employees table
-- This script will create employee records for any users in the profiles table
-- who don't already have an employee record

INSERT INTO public.employees (
  user_id,
  employee_id,
  first_name,
  last_name,
  email
)
SELECT
  p.id,
  'EMP-' || SUBSTR(p.id::text, 1, 8),
  COALESCE(SPLIT_PART(p.full_name, ' ', 1), 'User'),
  COALESCE(SPLIT_PART(p.full_name, ' ', 2), p.email),
  p.email
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees e WHERE e.user_id = p.id
);
