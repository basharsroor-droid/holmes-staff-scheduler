-- Harden privileged onboarding and invitation RPCs.
-- These functions intentionally remain SECURITY DEFINER because they perform
-- atomic writes that ordinary RLS policies must not expose directly.

create or replace function public.create_organization_workspace(
  business_name text,
  organization_slug text,
  first_branch_name text,
  owner_first_name text,
  owner_last_name text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_user_confirmed_at timestamptz;
  new_organization_id uuid;
  new_branch_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select u.email_confirmed_at into current_user_confirmed_at
  from auth.users u where u.id = current_user_id;
  if current_user_confirmed_at is null then raise exception 'Verified email required'; end if;

  if char_length(trim(business_name)) < 2 or char_length(trim(business_name)) > 120 then
    raise exception 'Business name must contain 2-120 characters';
  end if;
  if organization_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Invalid organization slug'; end if;
  if char_length(trim(first_branch_name)) < 2 or char_length(trim(first_branch_name)) > 120 then
    raise exception 'Branch name must contain 2-120 characters';
  end if;
  if char_length(trim(owner_first_name)) < 1 or char_length(trim(owner_first_name)) > 80 then
    raise exception 'Invalid owner first name';
  end if;
  if char_length(trim(owner_last_name)) > 80 then raise exception 'Invalid owner last name'; end if;

  insert into public.profiles (id, first_name, last_name)
  values (current_user_id, trim(owner_first_name), trim(owner_last_name))
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    updated_at = now();

  insert into public.organizations (name, slug)
  values (trim(business_name), organization_slug)
  returning id into new_organization_id;

  insert into public.branches (organization_id, name)
  values (new_organization_id, trim(first_branch_name))
  returning id into new_branch_id;

  insert into public.organization_memberships (
    organization_id, branch_id, user_id, role, status, joined_at
  ) values (
    new_organization_id, new_branch_id, current_user_id, 'owner', 'active', now()
  );

  return new_organization_id;
end;
$$;

create or replace function public.create_organization_invitation(
  target_organization_id uuid,
  target_branch_id uuid,
  target_email text,
  target_first_name text,
  target_last_name text default '',
  target_role public.member_role default 'employee'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_user_confirmed_at timestamptz;
  normalized_email text := lower(trim(target_email));
  invitation_token uuid := gen_random_uuid();
  caller_role public.member_role;
  existing_user_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select u.email_confirmed_at into current_user_confirmed_at
  from auth.users u where u.id = current_user_id;
  if current_user_confirmed_at is null then raise exception 'Verified email required'; end if;

  select m.role into caller_role
  from public.organization_memberships m
  where m.organization_id = target_organization_id
    and m.user_id = current_user_id
    and m.status = 'active';

  if caller_role not in ('owner','admin','manager') then raise exception 'Insufficient permissions'; end if;
  if caller_role = 'manager' and target_role <> 'employee' then raise exception 'Managers may invite employees only'; end if;
  if target_role not in ('admin','manager','employee') then raise exception 'Invalid invitation role'; end if;
  if char_length(normalized_email) < 5 or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'Invalid email';
  end if;
  if char_length(trim(target_first_name)) < 1 or char_length(trim(target_first_name)) > 80 then
    raise exception 'Invalid first name';
  end if;
  if char_length(trim(target_last_name)) > 80 then raise exception 'Invalid last name'; end if;
  if not exists (
    select 1 from public.branches b
    where b.id = target_branch_id
      and b.organization_id = target_organization_id
      and b.active
  ) then raise exception 'Invalid branch'; end if;

  select u.id into existing_user_id
  from auth.users u where lower(u.email) = normalized_email limit 1;

  if existing_user_id is not null and exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_organization_id
      and m.user_id = existing_user_id
  ) then raise exception 'User is already a member'; end if;

  update public.organization_invitations
  set token = invitation_token,
      branch_id = target_branch_id,
      first_name = trim(target_first_name),
      last_name = trim(target_last_name),
      role = target_role,
      invited_by = current_user_id,
      expires_at = now() + interval '7 days',
      updated_at = now()
  where organization_id = target_organization_id
    and email = normalized_email
    and status = 'pending';

  if not found then
    insert into public.organization_invitations (
      organization_id, branch_id, email, first_name, last_name, role, token, invited_by
    ) values (
      target_organization_id, target_branch_id, normalized_email,
      trim(target_first_name), trim(target_last_name),
      target_role, invitation_token, current_user_id
    );
  end if;

  return invitation_token;
end;
$$;

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
    update public.organization_invitations
    set status = 'expired', updated_at = now()
    where id = invitation.id;
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

revoke all on function public.create_organization_workspace(text,text,text,text,text) from public, anon;
revoke all on function public.create_organization_invitation(uuid,uuid,text,text,text,public.member_role) from public, anon;
revoke all on function public.accept_organization_invitation(uuid) from public, anon;

grant execute on function public.create_organization_workspace(text,text,text,text,text) to authenticated;
grant execute on function public.create_organization_invitation(uuid,uuid,text,text,text,public.member_role) to authenticated;
grant execute on function public.accept_organization_invitation(uuid) to authenticated;

comment on function public.create_organization_workspace(text,text,text,text,text)
  is 'Verified-user onboarding RPC; SECURITY DEFINER is required for atomic tenant bootstrap.';
comment on function public.create_organization_invitation(uuid,uuid,text,text,text,public.member_role)
  is 'Role-checked invitation RPC; managers may invite employees only.';
comment on function public.accept_organization_invitation(uuid)
  is 'Verified-email invitation acceptance RPC with token, expiry, and email matching checks.';
