-- Check which employees don't have auth accounts
SELECT e.id, e.email, e.first_name, e.last_name
FROM public.employees e
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.email = e.email
)
LIMIT 10;
