-- Migrate existing profiles to employees table
-- This script will create employee records for any users in the profiles table
-- who don't already have an employee record

INSERT INTO public.employees (
  user_id,
  employee_id,
  first_name,
  last_name,
  email,
  phone,
  department,
  designation,
  date_of_joining,
  created_at,
  updated_at
)
SELECT
  p.id as user_id,
  COALESCE(p.full_name, SPLIT_PART(p.full_name, ' ', 1)) as employee_id,
  SPLIT_PART(COALESCE(p.full_name, 'Unknown'), ' ', 1) as first_name,
  SUBSTRING(COALESCE(p.full_name, 'User'), POSITION(' ' IN COALESCE(p.full_name, 'User')) + 1) as last_name,
  u.email as email,
  NULL as phone,
  NULL as department,
  NULL as designation,
  NOW()::date as date_of_joining,
  NOW() as created_at,
  NOW() as updated_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees e WHERE e.user_id = p.id
)
ON CONFLICT (user_id, email) DO NOTHING;

-- Show migration summary
SELECT 
  COUNT(*) as total_employees,
  MAX(created_at) as last_created,
  COUNT(DISTINCT user_id) as unique_users
FROM public.employees;
