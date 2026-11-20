-- Migration 029: Deactivate employees instead of deleting them
-- Adds two columns. Every existing employee becomes is_active = true, left_on = null.
-- No rows are deleted and no other values change.
-- Rollback: scripts/029_employee_deactivation_rollback.sql

begin;

alter table public.employees
  add column if not exists is_active boolean not null default true,
  add column if not exists left_on date;

-- A deactivated employee's open session immediately stops seeing their records
create or replace function public.my_employee_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.employees
  where is_active
    and (user_id = auth.uid() or lower(email) = lower(auth.jwt() ->> 'email'))
$$;

commit;
