-- HOTFIX: private.record_product_event made core scheduling actions fail.
--
-- The trigger function added in 20260821170000_first_party_observability is
-- shared by four tables (organization_invitations, availability_submissions,
-- schedule_periods, swap_requests) and tested every event in one flat
-- IF/ELSIF chain, e.g.
--   elsif tg_table_name = 'availability_submissions' and tg_op = 'UPDATE'
--     and old.submitted_at is null and new.submitted_at is not null
-- PL/pgSQL resolves the record fields in a condition even when the
-- table-name test is already false, so any row that reached a condition
-- naming another table's column raised 'record "old" has no field ...' and
-- rolled back the user's action. Reproduced on staging with the byte-identical
-- production function (md5 a4a84d9cf8e3fcc982c825a14d337031) on 2026-09-11:
--
--   save an availability draft  -> record "old" has no field "status"
--   create a swap request       -> record "old" has no field "submitted_at"
--   edit a work month           -> record "old" has no field "submitted_at"
--   publish a schedule          -> record "old" has no field "submitted_at"
--
-- (Inviting and submitting availability happened to match before reaching a
-- foreign column, so they worked.) Production has had no work-month update,
-- publish, swap request or availability update since 2026-08-16, before this
-- function shipped, so no real action has failed yet -- but the first real
-- business would not have been able to publish a schedule.
--
-- The fix keeps exactly the same five events, names and actors, and only
-- restructures the function: match the table first, and reference a table's
-- own columns only inside its own branch.

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
    if tg_op = 'UPDATE' then
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
