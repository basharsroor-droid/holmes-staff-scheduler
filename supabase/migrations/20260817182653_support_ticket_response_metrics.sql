-- Track P1-08 (support operations plan) asks for a basic support metrics
-- dashboard: time to first response, time to resolution, reopen rate.
-- resolved_at already exists and is maintained by a trigger, but it gets
-- NULLed the moment a ticket is reopened (see set_support_ticket_timestamps
-- below), so a reopened ticket's original resolution time is lost, and
-- there was never any column tracking when an agent first touched a ticket
-- at all. Adding two small trigger-maintained columns instead of a full
-- history/audit table, since only aggregate counts are needed, not a
-- per-event log.

alter table public.support_tickets
  add column first_responded_at timestamptz,
  add column reopened_count integer not null default 0;

create or replace function private.set_support_ticket_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();

  -- First time a ticket moves off 'open' (an agent actually looked at it),
  -- independent of the resolved/reopened churn below. Only ever set once.
  if old.status = 'open' and new.status <> 'open' and old.first_responded_at is null then
    new.first_responded_at := now();
  end if;

  if new.status in ('resolved', 'closed') and old.status not in ('resolved', 'closed') then
    new.resolved_at := now();
  elsif new.status not in ('resolved', 'closed') then
    -- Reopen: count it before resolved_at is lost. This is the same branch
    -- that already nulls resolved_at on reopen -- reusing it rather than
    -- adding a second condition that would have to stay in sync with it.
    if old.status in ('resolved', 'closed') then
      new.reopened_count := old.reopened_count + 1;
    end if;
    new.resolved_at := null;
  end if;

  return new;
end;
$$;
