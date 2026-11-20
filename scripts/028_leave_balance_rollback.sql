-- Rollback for migration 028. Removes only what 028 added.
-- Note: dropping leave_adjustments discards any manual adjustments recorded since 028.

begin;
select cron.unschedule('reset-leave-balances-yearly');
drop function if exists public.recalc_leaves_taken(uuid);
drop function if exists public.leaves_used(uuid, integer, integer);
drop table if exists public.leave_adjustments;
commit;
