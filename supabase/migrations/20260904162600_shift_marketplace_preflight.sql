-- Phase 3: Shift Marketplace UI preflight.
-- Returns eligibility for the signed-in employee without mutating any request state.

create or replace function public.check_open_shift_eligibility(target_shift_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  begin
    perform private.assert_shift_marketplace_eligibility(target_shift_id, actor_id);
    return jsonb_build_object('eligible', true, 'reason', null);
  exception when others then
    return jsonb_build_object('eligible', false, 'reason', sqlerrm);
  end;
end;
$$;

revoke all on function public.check_open_shift_eligibility(uuid) from public, anon;
grant execute on function public.check_open_shift_eligibility(uuid) to authenticated;
