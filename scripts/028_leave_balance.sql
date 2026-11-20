-- Migration 028: Leave balance rules
-- Adds objects only. No existing rows are inserted, updated or deleted by this migration.
-- Rollback: scripts/028_leave_balance_rollback.sql
--
-- Leave quota (14 days per calendar year) is used by:
--   * unexcused absences (not a holiday, not covered by approved leave / WFH / half day)
--   * approved casual and sick leave (weekdays, excluding holidays)
--   * manual admin adjustments for that year (leave_adjustments)
-- Late, early out and half day are salary violations (3 = 1 day's salary) and never use quota.
-- 2026 counts from 1 May 2026 (policy start); every later year counts from 1 January.

begin;

create table if not exists public.leave_adjustments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  year integer not null,
  days integer not null check (days <> 0),
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_leave_adjustments_employee_year on public.leave_adjustments (employee_id, year);

alter table public.leave_adjustments enable row level security;
create policy leave_adjustments_select_own_or_admin on public.leave_adjustments
  for select to authenticated
  using (employee_id in (select public.my_employee_ids()) or public.is_admin());
create policy leave_adjustments_insert_admin on public.leave_adjustments
  for insert to authenticated
  with check (public.is_admin());
revoke all on public.leave_adjustments from anon;

-- Quota days used by an employee in a year, counting only months before p_before_month
-- (13 = the whole year). Runs with the caller's permissions (RLS applies).
create or replace function public.leaves_used(p_employee uuid, p_year integer, p_before_month integer default 13)
returns integer
language sql stable security invoker set search_path = ''
as $$
  with bounds as (
    select greatest(make_date(p_year, 1, 1), date '2026-05-01') as d_from,
           case when p_before_month > 12 then make_date(p_year + 1, 1, 1)
                else make_date(p_year, greatest(p_before_month, 1), 1) end as d_to
  ),
  quota_dates as (
    select a.attendance_date as d
    from public.attendance_records a, bounds b
    where a.employee_id = p_employee
      and a.is_absent
      and a.attendance_date >= b.d_from and a.attendance_date < b.d_to
      and not exists (select 1 from public.company_holidays h where h.holiday_date = a.attendance_date)
      and not exists (select 1 from public.attendance_exceptions x
                      where x.employee_id = a.employee_id and x.exception_date = a.attendance_date
                        and x.type in ('approved_leave', 'work_from_home', 'half_day'))
    union
    select g::date
    from public.leave_requests l, bounds b,
         generate_series(greatest(l.start_date, b.d_from), least(l.end_date, b.d_to - 1), interval '1 day') g
    where l.employee_id = p_employee
      and l.status = 'approved'
      and l.leave_type in ('casual_leave', 'sick_leave')
      and extract(isodow from g) < 6
      and not exists (select 1 from public.company_holidays h where h.holiday_date = g::date)
  )
  select greatest(0,
    (select count(*) from quota_dates, bounds where bounds.d_to > bounds.d_from)::integer
    + coalesce((select sum(days) from public.leave_adjustments j, bounds b
                where j.employee_id = p_employee and j.year = p_year
                  and j.created_at < b.d_to::timestamptz), 0)::integer
  )
$$;

-- Refresh employees.leaves_taken for the current year (Pakistan time).
-- Pass an employee id to refresh one employee, or null for everyone. Returns rows changed.
create or replace function public.recalc_leaves_taken(p_employee uuid default null)
returns integer
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_year integer := extract(year from (now() at time zone 'Asia/Karachi'))::integer;
  v_count integer;
begin
  update public.employees e
     set leaves_taken = public.leaves_used(e.id, v_year)
   where (p_employee is null or e.id = p_employee)
     and e.leaves_taken is distinct from public.leaves_used(e.id, v_year);
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke all on function public.leaves_used(uuid, integer, integer) from public, anon;
revoke all on function public.recalc_leaves_taken(uuid) from public, anon;
grant execute on function public.leaves_used(uuid, integer, integer) to authenticated, service_role;
grant execute on function public.recalc_leaves_taken(uuid) to authenticated, service_role;

-- Yearly reset: 00:05 Pakistan time on 1 January (19:05 UTC on 31 December)
create extension if not exists pg_cron;
select cron.schedule('reset-leave-balances-yearly', '5 19 31 12 *', 'select public.recalc_leaves_taken()');

commit;
