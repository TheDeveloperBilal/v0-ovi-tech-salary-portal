-- Migrate existing profiles to employees table
-- This script will create employee records for any users in the profiles table
-- who don't already have an employee record

INSERT INTO public.employees (
  employee_id,
  first_name,
  last_name,
  email,
  created_at,
  updated_at
)
SELECT
  'EMP-' || SUBSTR(p.id::text, 1, 8) as employee_id,
  COALESCE(SPLIT_PART(COALESCE(p.full_name, ''), ' ', 1), 'User') as first_name,
  COALESCE(NULLIF(SPLIT_PART(COALESCE(p.full_name, ''), ' ', 2), ''), p.email) as last_name,
  p.email,
  NOW() as created_at,
  NOW() as updated_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees e WHERE e.email = p.email
)
ON CONFLICT (email) DO NOTHING;

-- Show migration summary
SELECT 
  COUNT(*) as total_employees,
  COUNT(DISTINCT email) as unique_emails
FROM public.employees;
