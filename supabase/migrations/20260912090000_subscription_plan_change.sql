-- J2 (docs/REMEDIATION_PLAN.md): let the owner change plan and cancel from
-- inside the product, for the part that needs no payment provider.
--
-- Today every workspace is in its 30-day trial and no money moves, so a plan
-- change is just a row update -- but it must still be governed, because the
-- client only has SELECT on public.subscriptions (by design: money-related
-- state is never writable from the browser). These three RPCs are the only
-- write path, and they are SECURITY DEFINER so they can read the whole
-- organization while checking quotas.
--
-- Rules, deliberately narrow:
--   * Owner only. Not admin, not manager: the plan decides what the business
--     pays. 'subscription_change:not_owner'.
--   * Only while status = 'trialing'. Once billing starts, a change moves
--     money and belongs to the provider (proration, refunds, invoices), which
--     does not exist yet -> 'subscription_change:requires_billing_provider'
--     and the UI sends the owner to support.
--   * Enterprise is a custom quote, never self-serve ->
--     'subscription_change:enterprise_requires_quote'.
--   * A smaller plan is refused while the workspace already exceeds its
--     quotas -> 'subscription_change:over_quota:<resource>'. This mirrors J3
--     (20260911100000): we block new capacity, we never delete anything the
--     business already has. Counting matches private.assert_plan_capacity and
--     the organization_usage view: managers are owner+admin+manager, employees
--     are role employee, both active.
--   * Cancelling keeps the workspace working until the trial ends (owner's
--     decision, 2026-09-12): it only records the intent, so nothing is lost
--     and resume_subscription undoes it. Nothing here locks a workspace; when
--     a provider is connected, its webhook moves the status.
--
-- lib/subscription-changes.ts maps every error above to Hebrew.

create or replace function private.assert_subscription_owner(target_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'owner'
  ) then
    raise exception using
      message = 'subscription_change:not_owner',
      detail = 'Only the active owner can change the subscription.';
  end if;
end;
$function$;

revoke all on function private.assert_subscription_owner(uuid) from public, anon, authenticated;

-- The quotas a workspace would break by moving to target_plan, in the order
-- the UI lists them. Raises on the first one, like assert_plan_capacity does.
create or replace function private.assert_plan_fits_usage(target_organization_id uuid, target_plan public.plans)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  in_use bigint;
begin
  if target_plan.max_active_employees is not null then
    select count(*) into in_use
    from public.organization_memberships m
    where m.organization_id = target_organization_id and m.status = 'active' and m.role = 'employee';
    if in_use > target_plan.max_active_employees then
      raise exception using
        message = 'subscription_change:over_quota:employee',
        detail = format('Plan %s allows %s employees; %s active.', target_plan.id, target_plan.max_active_employees, in_use);
    end if;
  end if;

  if target_plan.max_managers is not null then
    select count(*) into in_use
    from public.organization_memberships m
    where m.organization_id = target_organization_id and m.status = 'active'
      and m.role in ('owner', 'admin', 'manager');
    if in_use > target_plan.max_managers then
      raise exception using
        message = 'subscription_change:over_quota:manager',
        detail = format('Plan %s allows %s managers; %s active.', target_plan.id, target_plan.max_managers, in_use);
    end if;
  end if;

  if target_plan.max_branches is not null then
    select count(*) into in_use
    from public.branches b
    where b.organization_id = target_organization_id and b.active;
    if in_use > target_plan.max_branches then
      raise exception using
        message = 'subscription_change:over_quota:branch',
        detail = format('Plan %s allows %s branches; %s active.', target_plan.id, target_plan.max_branches, in_use);
    end if;
  end if;

  if target_plan.max_departments is not null then
    select count(*) into in_use
    from public.departments d
    where d.organization_id = target_organization_id and d.active;
    if in_use > target_plan.max_departments then
      raise exception using
        message = 'subscription_change:over_quota:department',
        detail = format('Plan %s allows %s departments; %s active.', target_plan.id, target_plan.max_departments, in_use);
    end if;
  end if;
end;
$function$;

revoke all on function private.assert_plan_fits_usage(uuid, public.plans) from public, anon, authenticated;

create or replace function private.log_subscription_change(
  target_organization_id uuid,
  action_name text,
  details jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_organization_id, (select auth.uid()), action_name, 'subscriptions', target_organization_id, jsonb_strip_nulls(details));
end;
$function$;

revoke all on function private.log_subscription_change(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.change_subscription_plan(target_plan_id text, target_period text default null)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $function$
declare
  subscription_row public.subscriptions%rowtype;
  plan_row public.plans%rowtype;
  resolved_period text;
begin
  select s.* into subscription_row
  from public.subscriptions s
  join public.organization_memberships m on m.organization_id = s.organization_id
  where m.user_id = (select auth.uid()) and m.status = 'active'
  limit 1
  for update of s;

  if subscription_row.organization_id is null then
    raise exception using message = 'subscription_change:no_subscription', detail = 'No subscription for this user''s organization.';
  end if;

  perform private.assert_subscription_owner(subscription_row.organization_id);

  if target_plan_id = 'enterprise' then
    raise exception using message = 'subscription_change:enterprise_requires_quote', detail = 'Enterprise is sold as a custom quote.';
  end if;

  select p.* into plan_row from public.plans p where p.id = target_plan_id;
  if plan_row.id is null then
    raise exception using message = 'subscription_change:unknown_plan', detail = format('No plan %s.', target_plan_id);
  end if;

  -- Once billing starts a change moves money: that belongs to the provider.
  if subscription_row.status <> 'trialing' then
    raise exception using
      message = 'subscription_change:requires_billing_provider',
      detail = format('Subscription is %s; self-serve changes are trial-only until a provider is connected.', subscription_row.status);
  end if;

  perform private.assert_plan_fits_usage(subscription_row.organization_id, plan_row);

  resolved_period := case when target_period in ('monthly', 'annual') then target_period else subscription_row.billing_period end;

  update public.subscriptions s
  set plan_id = plan_row.id,
      billing_period = resolved_period,
      updated_at = now()
  where s.organization_id = subscription_row.organization_id
  returning s.* into subscription_row;

  perform private.log_subscription_change(
    subscription_row.organization_id,
    'subscriptions.plan_change',
    jsonb_build_object('plan_id', plan_row.id, 'billing_period', resolved_period, 'status', subscription_row.status)
  );

  return subscription_row;
end;
$function$;

comment on function public.change_subscription_plan(text, text) is
  'Owner-only plan change while the workspace is still in its trial. Refuses enterprise, an unknown plan, and any plan whose quotas the workspace already exceeds.';

revoke all on function public.change_subscription_plan(text, text) from public, anon;
grant execute on function public.change_subscription_plan(text, text) to authenticated;

create or replace function public.cancel_subscription()
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $function$
declare
  subscription_row public.subscriptions%rowtype;
begin
  select s.* into subscription_row
  from public.subscriptions s
  join public.organization_memberships m on m.organization_id = s.organization_id
  where m.user_id = (select auth.uid()) and m.status = 'active'
  limit 1
  for update of s;

  if subscription_row.organization_id is null then
    raise exception using message = 'subscription_change:no_subscription', detail = 'No subscription for this user''s organization.';
  end if;

  perform private.assert_subscription_owner(subscription_row.organization_id);

  -- Records the intent only: the workspace keeps working until the trial ends.
  update public.subscriptions s
  set cancel_at_period_end = true,
      canceled_at = coalesce(s.canceled_at, now()),
      updated_at = now()
  where s.organization_id = subscription_row.organization_id
  returning s.* into subscription_row;

  perform private.log_subscription_change(
    subscription_row.organization_id,
    'subscriptions.cancel',
    jsonb_build_object('plan_id', subscription_row.plan_id, 'status', subscription_row.status, 'trial_ends_at', subscription_row.trial_ends_at)
  );

  return subscription_row;
end;
$function$;

comment on function public.cancel_subscription() is
  'Owner-only cancellation. Records the intent (cancel_at_period_end); the workspace keeps working until the trial or paid period ends.';

revoke all on function public.cancel_subscription() from public, anon;
grant execute on function public.cancel_subscription() to authenticated;

create or replace function public.resume_subscription()
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $function$
declare
  subscription_row public.subscriptions%rowtype;
begin
  select s.* into subscription_row
  from public.subscriptions s
  join public.organization_memberships m on m.organization_id = s.organization_id
  where m.user_id = (select auth.uid()) and m.status = 'active'
  limit 1
  for update of s;

  if subscription_row.organization_id is null then
    raise exception using message = 'subscription_change:no_subscription', detail = 'No subscription for this user''s organization.';
  end if;

  perform private.assert_subscription_owner(subscription_row.organization_id);

  if not subscription_row.cancel_at_period_end then
    raise exception using message = 'subscription_change:not_canceled', detail = 'Subscription is not marked for cancellation.';
  end if;

  update public.subscriptions s
  set cancel_at_period_end = false,
      canceled_at = null,
      updated_at = now()
  where s.organization_id = subscription_row.organization_id
  returning s.* into subscription_row;

  perform private.log_subscription_change(
    subscription_row.organization_id,
    'subscriptions.resume',
    jsonb_build_object('plan_id', subscription_row.plan_id, 'status', subscription_row.status)
  );

  return subscription_row;
end;
$function$;

comment on function public.resume_subscription() is
  'Owner-only undo of a pending cancellation.';

revoke all on function public.resume_subscription() from public, anon;
grant execute on function public.resume_subscription() to authenticated;
