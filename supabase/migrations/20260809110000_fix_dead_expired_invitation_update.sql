-- Remove a write that could never actually persist.
--
-- accept_organization_invitation(), on finding an expired invitation, ran
-- `update ... set status = 'expired' ...` and then immediately
-- `raise exception 'Invitation expired'`. In PL/pgSQL, an exception
-- raised inside a function rolls back everything that same function call
-- did -- including a write issued right before the raise -- so that
-- update could never actually commit. The invitation stayed 'pending'
-- forever, which the employees UI then displayed as "ממתין" (waiting)
-- indefinitely, with no indication it had actually expired.
--
-- No separately stored 'expired' status is needed to make this correct:
-- whether an invitation is expired is already fully derivable from
-- expires_at wherever it's read (fixed on the UI side alongside this
-- migration), and create_organization_invitation already transparently
-- refreshes a still-'pending' row (expired or not) when the same email
-- is invited again -- verified live: re-inviting an expired-but-pending
-- test invitation updated the same row in place with a fresh token and
-- expires_at, rather than creating a duplicate.
--
-- Tested live: the fixed function still correctly rejects an expired
-- invitation with the same error; a stray dead write is just no longer
-- attempted.

create or replace function public.accept_organization_invitation(invitation_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  current_user_confirmed_at timestamptz;
  invitation public.organization_invitations%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select lower(u.email), u.email_confirmed_at
  into current_email, current_user_confirmed_at
  from auth.users u where u.id = current_user_id;

  if current_email is null or current_user_confirmed_at is null then
    raise exception 'Verified email required';
  end if;

  select * into invitation
  from public.organization_invitations i
  where i.token = invitation_token
  for update;

  if invitation.id is null or invitation.status <> 'pending' then raise exception 'Invitation is not active'; end if;
  if invitation.expires_at <= now() then
    raise exception 'Invitation expired';
  end if;
  if invitation.email <> current_email then raise exception 'Invitation email does not match authenticated user'; end if;
  if exists (
    select 1 from public.organization_memberships m
    where m.organization_id = invitation.organization_id
      and m.user_id = current_user_id
  ) then raise exception 'User is already a member'; end if;

  insert into public.profiles (id, first_name, last_name)
  values (current_user_id, invitation.first_name, invitation.last_name)
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    updated_at = now();

  insert into public.organization_memberships (
    organization_id, branch_id, user_id, role, status, joined_at
  ) values (
    invitation.organization_id, invitation.branch_id, current_user_id,
    invitation.role, 'active', now()
  );

  update public.organization_invitations
  set status = 'accepted',
      accepted_by = current_user_id,
      accepted_at = now(),
      updated_at = now()
  where id = invitation.id;

  return invitation.organization_id;
end;
$$;
