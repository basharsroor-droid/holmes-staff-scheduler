-- Scheduling cadence customizes onboarding and future defaults. It does not
-- affect plan pricing or the 30-day trial.
alter table public.organizations
  add column schedule_cadence text not null default 'weekly'
  check (schedule_cadence in ('weekly', 'biweekly', 'monthly', 'custom'));

comment on column public.organizations.schedule_cadence is
  'How often the organization normally publishes a schedule; informational and not used for billing.';

-- Keep the existing six-argument function available during rollout so the
-- currently deployed frontend remains compatible until the new build is live.
-- The uniquely named wrapper avoids unsupported PostgREST function overloads,
-- delegates creation to the hardened RPC, and records cadence atomically.
create function public.create_organization_workspace_with_cadence(
  business_name text,
  organization_slug text,
  first_branch_name text,
  owner_first_name text,
  owner_last_name text,
  selected_plan_id text,
  requested_schedule_cadence text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid;
begin
  if requested_schedule_cadence not in ('weekly', 'biweekly', 'monthly', 'custom') then
    raise exception 'Invalid schedule cadence';
  end if;

  new_organization_id := public.create_organization_workspace(
    business_name,
    organization_slug,
    first_branch_name,
    owner_first_name,
    owner_last_name,
    selected_plan_id
  );

  update public.organizations
  set schedule_cadence = requested_schedule_cadence,
      updated_at = now()
  where id = new_organization_id;

  return new_organization_id;
end;
$$;

revoke all on function public.create_organization_workspace_with_cadence(text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.create_organization_workspace_with_cadence(text, text, text, text, text, text, text)
  to authenticated;

comment on function public.create_organization_workspace_with_cadence(text, text, text, text, text, text, text) is
  'Creates a workspace through the hardened six-argument RPC and atomically records its non-billing scheduling cadence.';
