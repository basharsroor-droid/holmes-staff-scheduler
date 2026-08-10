-- Trigger functions execute through their owning triggers and must not be
-- exposed as callable RPCs through PostgREST.
--
-- Keep execution available to postgres/service_role for migrations and
-- administrative operations. Trigger execution itself is unaffected.

revoke all on function public.check_last_active_owner() from public, anon, authenticated;
revoke all on function public.check_shift_assignment_overlap() from public, anon, authenticated;
revoke all on function public.release_future_shifts_on_suspension() from public, anon, authenticated;

grant execute on function public.check_last_active_owner() to postgres, service_role;
grant execute on function public.check_shift_assignment_overlap() to postgres, service_role;
grant execute on function public.release_future_shifts_on_suspension() to postgres, service_role;
