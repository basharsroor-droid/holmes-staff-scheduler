-- Let an active owner hand off ownership of the business to another
-- active member, instead of there being no way to do this at all.
--
-- Pairs with the last-active-owner guard (20260808131500): the new owner
-- is promoted FIRST, then the caller is demoted to admin -- in that order,
-- so at the moment the caller's row is demoted there is already another
-- active owner in place, and the guard trigger allows it.

create or replace function public.transfer_organization_ownership(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  caller_membership public.organization_memberships%rowtype;
  target_membership public.organization_memberships%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if target_user_id = current_user_id then raise exception 'Already the owner'; end if;

  select * into caller_membership
  from public.organization_memberships m
  where m.user_id = current_user_id and m.role = 'owner' and m.status = 'active'
  for update;

  if caller_membership.id is null then
    raise exception 'Only an active owner can transfer ownership';
  end if;

  select * into target_membership
  from public.organization_memberships m
  where m.organization_id = caller_membership.organization_id
    and m.user_id = target_user_id
    and m.status = 'active'
  for update;

  if target_membership.id is null then
    raise exception 'Target user is not an active member of this organization';
  end if;

  update public.organization_memberships
  set role = 'owner', updated_at = now()
  where id = target_membership.id;

  update public.organization_memberships
  set role = 'admin', updated_at = now()
  where id = caller_membership.id;
end;
$$;

revoke all on function public.transfer_organization_ownership(uuid) from public, anon;
grant execute on function public.transfer_organization_ownership(uuid) to authenticated;
