-- Enforce shift-swap ownership and state transitions in PostgreSQL.
-- UI permissions are not a security boundary; this trigger protects direct API calls too.

create or replace function private.enforce_swap_request_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  caller_is_manager boolean;
  original_owner_id uuid;
  target_assignment_exists boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = new.organization_id
      and m.user_id = current_user_id
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'manager')
  ) into caller_is_manager;

  if tg_op = 'INSERT' then
    select a.user_id into original_owner_id
    from public.shift_assignments a
    where a.id = new.original_assignment_id
      and a.organization_id = new.organization_id;

    if original_owner_id is null or original_owner_id <> current_user_id then
      raise exception 'You may request a swap only for your own assignment';
    end if;
    if new.requested_by <> current_user_id then
      raise exception 'Invalid swap requester';
    end if;
    if new.target_user_id is null or new.target_shift_id is null or new.target_user_id = current_user_id then
      raise exception 'A different target employee and shift are required';
    end if;

    select exists (
      select 1
      from public.shift_assignments a
      where a.organization_id = new.organization_id
        and a.shift_id = new.target_shift_id
        and a.user_id = new.target_user_id
    ) into target_assignment_exists;

    if not target_assignment_exists then
      raise exception 'Target employee is not assigned to the requested shift';
    end if;
    if new.status <> 'pending_employee'
      or new.manager_note is not null
      or new.decided_by is not null
      or new.decided_at is not null then
      raise exception 'Invalid initial swap state';
    end if;

    return new;
  end if;

  if new.organization_id <> old.organization_id
    or new.original_assignment_id <> old.original_assignment_id
    or new.requested_by <> old.requested_by
    or new.target_user_id is distinct from old.target_user_id
    or new.target_shift_id is distinct from old.target_shift_id
    or new.reason <> old.reason
    or new.created_at <> old.created_at then
    raise exception 'Swap request identity fields are immutable';
  end if;

  if caller_is_manager then
    if old.status <> 'pending_manager' or new.status not in ('approved', 'rejected') then
      raise exception 'Manager may approve or reject pending manager requests only';
    end if;
    if new.decided_by <> current_user_id or new.decided_at is null then
      raise exception 'Manager decision must record its actor and time';
    end if;
    return new;
  end if;

  if current_user_id = old.target_user_id then
    if old.status <> 'pending_employee' or new.status not in ('pending_manager', 'rejected') then
      raise exception 'Target employee may accept or reject a pending request only';
    end if;
    if new.manager_note is distinct from old.manager_note or new.decided_by is not null then
      raise exception 'Employee may not write manager decision fields';
    end if;
    if new.status = 'pending_manager' and new.decided_at is not null then
      raise exception 'Accepted request is awaiting a manager decision';
    end if;
    if new.status = 'rejected' and new.decided_at is null then
      raise exception 'Rejection time is required';
    end if;
    return new;
  end if;

  if current_user_id = old.requested_by then
    if old.status not in ('pending_employee', 'pending_manager') or new.status <> 'cancelled' then
      raise exception 'Requester may cancel pending requests only';
    end if;
    if new.manager_note is distinct from old.manager_note
      or new.decided_by is not null
      or new.decided_at is null then
      raise exception 'Invalid cancellation fields';
    end if;
    return new;
  end if;

  raise exception 'Insufficient permissions for swap request';
end;
$$;

revoke all on function private.enforce_swap_request_transition() from public, anon, authenticated;

drop trigger if exists enforce_swap_request_transition on public.swap_requests;
create trigger enforce_swap_request_transition
before insert or update on public.swap_requests
for each row execute function private.enforce_swap_request_transition();

comment on function private.enforce_swap_request_transition()
  is 'Guards swap ownership, immutable fields, and employee/manager state transitions.';
