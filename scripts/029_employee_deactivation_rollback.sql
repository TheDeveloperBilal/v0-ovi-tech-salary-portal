-- Rollback for migration 029.
-- Unban any deactivated users in Supabase Auth first if they should log in again.

begin;

create or replace function public.my_employee_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.employees
  where user_id = auth.uid() or lower(email) = lower(auth.jwt() ->> 'email')
$$;

alter table public.employees
  drop column if exists left_on,
  drop column if exists is_active;

commit;
