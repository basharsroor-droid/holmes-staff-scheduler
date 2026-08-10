-- Invitation rows contain authorization-sensitive identity, role and token
-- fields. Managers may read invitations, but mutations must go through
-- narrowly scoped RPCs instead of a broad table UPDATE policy.

drop policy if exists invitations_update_manager on public.organization_invitations;

create or replace function public.revoke_organization_invitation(invitation_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  invitation public.organization_invitations%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into invitation
  from public.organization_invitations i
  where i.token = invitation_token
  for update;

  if invitation.id is null then
    raise exception 'Invitation not found';
  end if;

  if not (select private.has_org_role(
    invitation.organization_id,
    array['owner','admin','manager']::public.member_role[]
  )) then
    raise exception 'Manager permission required';
  end if;

  if invitation.status <> 'pending' then
    raise exception 'Only a pending invitation can be revoked';
  end if;

  update public.organization_invitations
  set status = 'revoked', updated_at = now()
  where id = invitation.id;

  return true;
end;
$$;

revoke all on function public.revoke_organization_invitation(uuid) from public, anon;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;

comment on function public.revoke_organization_invitation(uuid)
  is 'Revokes one pending invitation by token. Manager/admin/owner of the invitation organization only.';
