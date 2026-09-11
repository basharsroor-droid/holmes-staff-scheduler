-- I1 from docs/REMEDIATION_PLAN.md, first part: measure the setup funnel.
--
-- The plan's acceptance for I1 is "a new business reaches its first schedule
-- without outside help, and there is drop-off data for every step". The
-- product already records some steps into operational_events (event_type
-- 'product') through private.record_product_event: invite_created,
-- availability_submitted, schedule_published and the swap lifecycle. The
-- first steps of setup were never recorded, so there was no way to see where
-- new workspaces stop. This adds them:
--
--   workspace_created        organizations INSERT (onboarding)
--   shift_template_created   shift_templates INSERT
--   work_month_opened        schedule_periods INSERT
--   member_joined            organization_memberships INSERT, non-owner
--                            (an invitation accepted)
--
-- Builds on the hotfix in 20260911110000_fix_record_product_event_crash
-- (found while dry-running this migration): the function matches the table
-- first and references a table's own columns only inside its own branch --
-- a flat IF/ELSIF chain made rows from one table fail on another table's
-- columns. The four new tables get branches of the same shape. The five
-- existing events are unchanged. This migration must run AFTER the hotfix
-- (its timestamp is later), otherwise the hotfix would overwrite these new
-- branches.
--
-- private.setup_funnel: one row per organization with the first time it
-- reached each step, for internal analysis. It lives in the private schema,
-- is not exposed through the API, and is not readable by anon/authenticated.
-- operational_events are purged after 90 days (purge_expired_operational_events),
-- so the funnel covers each business's first 90 days -- the window onboarding
-- is about.

create or replace function private.record_product_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_event_name text;
  target_organization_id uuid;
  target_actor_user_id uuid;
begin
  if tg_table_name = 'organization_invitations' then
    if tg_op = 'INSERT' then
      target_event_name := 'invite_created';
      target_organization_id := new.organization_id;
      target_actor_user_id := new.invited_by;
    end if;
  elsif tg_table_name = 'availability_submissions' then
    if tg_op = 'UPDATE' then
      if old.submitted_at is null and new.submitted_at is not null then
        target_event_name := 'availability_submitted';
        target_organization_id := new.organization_id;
        target_actor_user_id := new.user_id;
      end if;
    end if;
  elsif tg_table_name = 'schedule_periods' then
    if tg_op = 'INSERT' then
      target_event_name := 'work_month_opened';
      target_organization_id := new.organization_id;
      target_actor_user_id := coalesce((select auth.uid()), new.created_by);
    elsif tg_op = 'UPDATE' then
      if old.status is distinct from new.status and new.status = 'published' then
        target_event_name := 'schedule_published';
        target_organization_id := new.organization_id;
        target_actor_user_id := coalesce((select auth.uid()), new.created_by);
      end if;
    end if;
  elsif tg_table_name = 'swap_requests' then
    if tg_op = 'INSERT' then
      target_event_name := 'swap_requested';
      target_organization_id := new.organization_id;
      target_actor_user_id := new.requested_by;
    elsif tg_op = 'UPDATE' then
      if old.status is distinct from new.status and new.status in ('approved', 'rejected', 'cancelled') then
        target_event_name := 'swap_' || new.status::text;
        target_organization_id := new.organization_id;
        target_actor_user_id := coalesce((select auth.uid()), new.decided_by, new.requested_by);
      end if;
    end if;
  elsif tg_table_name = 'organizations' then
    if tg_op = 'INSERT' then
      target_event_name := 'workspace_created';
      target_organization_id := new.id;
      target_actor_user_id := (select auth.uid());
    end if;
  elsif tg_table_name = 'shift_templates' then
    if tg_op = 'INSERT' then
      target_event_name := 'shift_template_created';
      target_organization_id := new.organization_id;
      target_actor_user_id := (select auth.uid());
    end if;
  elsif tg_table_name = 'organization_memberships' then
    if tg_op = 'INSERT' then
      if new.role <> 'owner' then
        target_event_name := 'member_joined';
        target_organization_id := new.organization_id;
        target_actor_user_id := new.user_id;
      end if;
    end if;
  end if;

  if target_event_name is null then
    return new;
  end if;

  insert into public.operational_events (
    event_type, event_name, severity, organization_id, actor_user_id, metadata
  ) values (
    'product', target_event_name, 'info', target_organization_id, target_actor_user_id,
    jsonb_build_object('source', tg_table_name)
  );

  return new;
end;
$function$;

drop trigger if exists record_workspace_created_event on public.organizations;
create trigger record_workspace_created_event
  after insert on public.organizations
  for each row execute function private.record_product_event();

drop trigger if exists record_shift_template_created_event on public.shift_templates;
create trigger record_shift_template_created_event
  after insert on public.shift_templates
  for each row execute function private.record_product_event();

drop trigger if exists record_work_month_opened_event on public.schedule_periods;
create trigger record_work_month_opened_event
  after insert on public.schedule_periods
  for each row execute function private.record_product_event();

drop trigger if exists record_member_joined_event on public.organization_memberships;
create trigger record_member_joined_event
  after insert on public.organization_memberships
  for each row execute function private.record_product_event();

-- First time each organization reached each setup step. Internal only.
create or replace view private.setup_funnel as
select
  o.id as organization_id,
  o.name,
  o.created_at as organization_created_at,
  min(e.created_at) filter (where e.event_name = 'workspace_created') as workspace_created_at,
  min(e.created_at) filter (where e.event_name = 'shift_template_created') as first_shift_template_at,
  min(e.created_at) filter (where e.event_name = 'work_month_opened') as first_work_month_at,
  min(e.created_at) filter (where e.event_name = 'invite_created') as first_invite_at,
  min(e.created_at) filter (where e.event_name = 'member_joined') as first_member_joined_at,
  min(e.created_at) filter (where e.event_name = 'availability_submitted') as first_availability_at,
  min(e.created_at) filter (where e.event_name = 'schedule_published') as first_schedule_published_at
from public.organizations o
left join public.operational_events e
  on e.organization_id = o.id and e.event_type = 'product'
group by o.id, o.name, o.created_at;

revoke all on private.setup_funnel from public, anon, authenticated;
