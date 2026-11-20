-- Rollback for migration 030.

begin;

alter function public.handle_new_user() reset search_path;
alter function public.auto_link_employee_user_id() reset search_path;
grant execute on function public.handle_new_user() to public, anon, authenticated;
grant execute on function public.auto_link_employee_user_id() to public, anon, authenticated;

commit;
