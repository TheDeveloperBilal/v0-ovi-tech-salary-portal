-- Migration 027: Lock down row level security
-- Access rules only. No rows are inserted, updated or deleted.
-- Rollback: scripts/027_lock_down_rls_rollback.sql
--
-- 1. Employees can only read their own employee row, salary slips, salary history,
--    attendance and exceptions. Admins keep full access.
-- 2. Only admins can change profiles.role / profiles.is_admin.
-- 3. Remove "full access for everyone" rules on notices, policies and signatures
--    (the API uses the service-role key, which bypasses RLS and does not need them).
-- 4. Signed-out visitors can no longer read profiles, notices, policies or the employee_leaves view.

begin;

-- Helpers (SECURITY DEFINER so policies can use them without recursing into RLS)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
$$;

create or replace function public.my_employee_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.employees
  where user_id = auth.uid()
     or lower(email) = lower(auth.jwt() ->> 'email')
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.my_employee_ids() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.my_employee_ids() to authenticated, service_role;

-- employees
drop policy if exists "Employees viewable by authenticated users" on public.employees;
create policy employees_select_own_or_admin on public.employees
  for select to authenticated
  using (id in (select public.my_employee_ids()) or public.is_admin());

-- salary_slips
drop policy if exists "Salary slips viewable by authenticated users" on public.salary_slips;
create policy salary_slips_select_own_or_admin on public.salary_slips
  for select to authenticated
  using (employee_id in (select public.my_employee_ids()) or public.is_admin());

-- salary_history (salary_history_select_admin is kept)
drop policy if exists salary_history_select_authenticated on public.salary_history;
create policy salary_history_select_own on public.salary_history
  for select to authenticated
  using (employee_id in (select public.my_employee_ids()));

-- salary_structures
drop policy if exists "Salary structures viewable by authenticated users" on public.salary_structures;
create policy salary_structures_select_own_or_admin on public.salary_structures
  for select to authenticated
  using (employee_id in (select public.my_employee_ids()) or public.is_admin());

-- attendance_records
drop policy if exists "Attendance records viewable by authenticated users" on public.attendance_records;
create policy attendance_records_select_own_or_admin on public.attendance_records
  for select to authenticated
  using (employee_id in (select public.my_employee_ids()) or public.is_admin());

-- attendance_summary
drop policy if exists "Attendance summary viewable by authenticated users" on public.attendance_summary;
create policy attendance_summary_select_own_or_admin on public.attendance_summary
  for select to authenticated
  using (employee_id in (select public.my_employee_ids()) or public.is_admin());

-- attendance_exceptions
drop policy if exists exceptions_select_authenticated on public.attendance_exceptions;
create policy exceptions_select_own_or_admin on public.attendance_exceptions
  for select to authenticated
  using (employee_id in (select public.my_employee_ids()) or public.is_admin());

-- profiles: own row or admin; only admins can change role/is_admin
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Users can update own profile" on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (new.is_admin is distinct from old.is_admin
      or new.role is distinct from old.role
      or new.id is distinct from old.id)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change user roles' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke all on function public.guard_profile_privileges() from public, anon, authenticated;

drop trigger if exists trg_guard_profile_privileges on public.profiles;
create trigger trg_guard_profile_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- notices / policies / signatures: remove open-to-everyone rules
drop policy if exists service_role_full_access_notices on public.company_notices;
drop policy if exists service_role_full_access_policies on public.company_policies;
drop policy if exists service_role_full_access_signatures on public.policy_signatures;
alter policy employees_read_notices on public.company_notices to authenticated;
alter policy employees_read_active_policies on public.company_policies to authenticated;
alter policy employees_read_own_signatures on public.policy_signatures to authenticated;
alter policy employees_insert_own_signature on public.policy_signatures to authenticated;

-- employee_leaves view: respect the caller's RLS, hide from signed-out visitors
alter view public.employee_leaves set (security_invoker = true);
revoke all on public.employee_leaves from anon;

commit;
