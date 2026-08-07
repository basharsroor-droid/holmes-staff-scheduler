-- Protect shift-swap audit events from fabricated or duplicate entries.

create or replace function private.enforce_swap_request_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  request_value public.swap_requests%rowtype;
  caller_is_manager boolean;
  event_is_valid boolean := false;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if new.actor_user_id <> current_user_id then raise exception 'Invalid swap event actor'; end if;
  if char_length(new.action) < 2 or char_length(new.action) > 80 then raise exception 'Invalid swap event action'; end if;
  if new.note is not null and char_length(new.note) > 500 then raise exception 'Swap event note is too long'; end if;

  select * into request_value
  from public.swap_requests r
  where r.id = new.swap_request_id
    and r.organization_id = new.organization_id;

  if request_value.id is null then raise exception 'Invalid swap request'; end if;

  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = new.organization_id
      and m.user_id = current_user_id
      and m.status = 'active'
      and m.role in ('owner','admin','manager')
  ) into caller_is_manager;

  event_is_valid :=
    (new.action = 'created'
      and current_user_id = request_value.requested_by
      and request_value.status = 'pending_employee')
    or
    (new.action = 'pending_manager'
      and current_user_id = request_value.target_user_id
      and request_value.status = 'pending_manager')
    or
    (new.action = 'cancelled'
      and current_user_id = request_value.requested_by
      and request_value.status = 'cancelled')
    or
    (new.action = 'approved'
      and caller_is_manager
      and request_value.status = 'approved'
      and request_value.decided_by = current_user_id)
    or
    (new.action = 'rejected'
      and request_value.status = 'rejected'
      and (
        (current_user_id = request_value.target_user_id and request_value.decided_by is null)
        or (caller_is_manager and request_value.decided_by = current_user_id)
      ));

  if not event_is_valid then
    raise exception 'Swap event does not match the current request state';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_swap_request_event() from public, anon, authenticated;

drop trigger if exists enforce_swap_request_event on public.swap_request_events;
create trigger enforce_swap_request_event
before insert on public.swap_request_events
for each row execute function private.enforce_swap_request_event();

create unique index if not exists swap_request_events_action_once_idx
  on public.swap_request_events (swap_request_id, action);

comment on function private.enforce_swap_request_event()
  is 'Allows swap audit events only when actor, role, and current request state agree.';
