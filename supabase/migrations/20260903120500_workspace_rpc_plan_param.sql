-- Extend create_organization_workspace to start a subscription trial and to
-- refuse callers who already belong to an organization (an invited employee /
-- manager must accept their invitation, not open a second org by mistake).
--
-- The argument list changes (a 6th parameter), so the old 5-arg function is
-- dropped and recreated rather than `create or replace`d.

drop function if exists public.create_organization_workspace(text, text, text, text, text);

create function public.create_organization_workspace(
  business_name text,
  organization_slug text,
  first_branch_name text,
  owner_first_name text,
  owner_last_name text default '',
  selected_plan_id text default 'business'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_user_confirmed_at timestamptz;
  resolved_plan_id text;
  new_organization_id uuid;
  new_branch_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select u.email_confirmed_at into current_user_confirmed_at
  from auth.users u where u.id = current_user_id;
  if current_user_confirmed_at is null then raise exception 'Verified email required'; end if;

  -- An account may own exactly one organization from this flow. Belonging to
  -- another org already means this is an invited user on the wrong path.
  if exists (
    select 1 from public.organization_memberships
    where user_id = current_user_id and status = 'active'
  ) then
    raise exception 'already_member';
  end if;

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

  select p.id into resolved_plan_id
  from public.plans p
  where p.id = selected_plan_id and p.is_public;
  if resolved_plan_id is null then raise exception 'Invalid plan'; end if;

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

  insert into public.subscriptions (
    organization_id, plan_id, status, trial_started_at, trial_ends_at, billing_period
  ) values (
    new_organization_id, resolved_plan_id, 'trialing', now(), now() + interval '30 days', 'trial'
  );

  return new_organization_id;
end;
$$;

revoke all on function public.create_organization_workspace(text, text, text, text, text, text) from public, anon;
grant execute on function public.create_organization_workspace(text, text, text, text, text, text) to authenticated;

comment on function public.create_organization_workspace(text, text, text, text, text, text) is
  'Creates an organization, first branch, owner membership and a 30-day trial subscription in one atomic call. SECURITY DEFINER; rejects callers who already have an active membership.';
