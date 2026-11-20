-- Rollback for migration 027: restores the access rules exactly as they were before.
-- Access rules only. No rows are inserted, updated or deleted.

begin;

drop trigger if exists trg_guard_profile_privileges on public.profiles;
drop function if exists public.guard_profile_privileges();

drop policy if exists employees_select_own_or_admin on public.employees;
create policy "Employees viewable by authenticated users" on public.employees
  for select using (auth.role() = 'authenticated');

drop policy if exists salary_slips_select_own_or_admin on public.salary_slips;
create policy "Salary slips viewable by authenticated users" on public.salary_slips
  for select using (auth.role() = 'authenticated');

drop policy if exists salary_history_select_own on public.salary_history;
create policy salary_history_select_authenticated on public.salary_history
  for select using (auth.role() = 'authenticated');

drop policy if exists salary_structures_select_own_or_admin on public.salary_structures;
create policy "Salary structures viewable by authenticated users" on public.salary_structures
  for select using (auth.role() = 'authenticated');

drop policy if exists attendance_records_select_own_or_admin on public.attendance_records;
create policy "Attendance records viewable by authenticated users" on public.attendance_records
  for select using (auth.role() = 'authenticated');

drop policy if exists attendance_summary_select_own_or_admin on public.attendance_summary;
create policy "Attendance summary viewable by authenticated users" on public.attendance_summary
  for select using (auth.role() = 'authenticated');

drop policy if exists exceptions_select_own_or_admin on public.attendance_exceptions;
create policy exceptions_select_authenticated on public.attendance_exceptions
  for select using (auth.role() = 'authenticated');

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy service_role_full_access_notices on public.company_notices
  for all using (true) with check (true);
create policy service_role_full_access_policies on public.company_policies
  for all using (true) with check (true);
create policy service_role_full_access_signatures on public.policy_signatures
  for all using (true) with check (true);
alter policy employees_read_notices on public.company_notices to public;
alter policy employees_read_active_policies on public.company_policies to public;
alter policy employees_read_own_signatures on public.policy_signatures to public;
alter policy employees_insert_own_signature on public.policy_signatures to public;

alter view public.employee_leaves set (security_invoker = false);
grant all on public.employee_leaves to anon;

drop function if exists public.my_employee_ids();
drop function if exists public.is_admin();

commit;
