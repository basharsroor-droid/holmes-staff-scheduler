-- Fix: a manager/admin/owner who is ALSO the target employee of a swap
-- request could never respond to it.
--
-- private.enforce_swap_request_transition() branched on WHO the caller is
-- (caller_is_manager, then target_user_id, then requested_by), each branch
-- raising an exception if the current status didn't match what THAT role is
-- allowed to do -- rather than falling through to try another applicable
-- branch. A manager who is also the target employee always hit the
-- caller_is_manager branch first: while the request was still
-- 'pending_employee' (awaiting THEM, as the target), that branch demanded
-- old.status = 'pending_manager' and raised "Manager may approve or reject
-- pending manager requests only" -- blocking the one action they could
-- actually take.
--
-- Caught live running the pilot: assigned the owner a second shift to
-- exercise the swap flow (a realistic setup -- small businesses often have
-- an owner/manager who also works shifts), and accepting the swap as the
-- target employee failed every time.
--
-- Fix: key each UPDATE branch off (old.status, current_user_id) together --
-- which concrete transition is being attempted -- instead of off the
-- caller's role alone. Insert handling and the immutable-fields check are
-- unchanged.

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

  -- Which transition is being attempted decides which rules apply -- not
  -- the caller's role alone. This lets a manager who is also the target
  -- employee act in either capacity, at the stage where that capacity is
  -- actually relevant.
  if old.status = 'pending_employee' and current_user_id = old.target_user_id then
    if new.status not in ('pending_manager', 'rejected') then
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

  if old.status = 'pending_manager' and caller_is_manager then
    if new.status not in ('approved', 'rejected') then
      raise exception 'Manager may approve or reject pending manager requests only';
    end if;
    if new.decided_by <> current_user_id or new.decided_at is null then
      raise exception 'Manager decision must record its actor and time';
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

revoke all on function private.enforce_swap_request_transition() from public, anon;
