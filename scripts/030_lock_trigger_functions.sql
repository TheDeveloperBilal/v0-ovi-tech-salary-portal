-- Migration 030: Trigger functions can no longer be called directly through the API
-- Permissions only. No rows change. Triggers keep firing as before.
-- Rollback: scripts/030_lock_trigger_functions_rollback.sql

begin;

alter function public.handle_new_user() set search_path = '';
alter function public.auto_link_employee_user_id() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.auto_link_employee_user_id() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;
grant execute on function public.auto_link_employee_user_id() to service_role;

commit;
