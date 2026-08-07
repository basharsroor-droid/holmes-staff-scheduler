-- Approve a shift swap atomically: both assignments, request state, and audit event.

create or replace function public.approve_shift_swap(
  target_request_id uuid,
  decision_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  request_value public.swap_requests%rowtype;
  original_assignment public.shift_assignments%rowtype;
  target_assignment public.shift_assignments%rowtype;
  normalized_note text := nullif(trim(decision_note), '');
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if normalized_note is not null and char_length(normalized_note) > 500 then
    raise exception 'Manager note is too long';
  end if;

  select * into request_value
  from public.swap_requests r
  where r.id = target_request_id
  for update;

  if request_value.id is null then raise exception 'Swap request not found'; end if;
  if request_value.status <> 'pending_manager' then raise exception 'Swap request is not awaiting manager approval'; end if;
  if not (select private.has_org_role(
    request_value.organization_id,
    array['owner','admin','manager']::public.member_role[]
  )) then
    raise exception 'Manager permission required';
  end if;
  if request_value.target_user_id is null or request_value.target_shift_id is null then
    raise exception 'Swap request has no valid target';
  end if;

  select * into original_assignment
  from public.shift_assignments a
  where a.id = request_value.original_assignment_id
    and a.organization_id = request_value.organization_id
  for update;

  select * into target_assignment
  from public.shift_assignments a
  where a.shift_id = request_value.target_shift_id
    and a.user_id = request_value.target_user_id
    and a.organization_id = request_value.organization_id
  for update;

  if original_assignment.id is null
    or original_assignment.user_id <> request_value.requested_by then
    raise exception 'Original assignment changed since the request was created';
  end if;
  if target_assignment.id is null then
    raise exception 'Target assignment changed since the request was created';
  end if;

  update public.shift_assignments
  set user_id = request_value.target_user_id,
      assigned_by = current_user_id
  where id = original_assignment.id;

  update public.shift_assignments
  set user_id = request_value.requested_by,
      assigned_by = current_user_id
  where id = target_assignment.id;

  update public.swap_requests
  set status = 'approved',
      manager_note = normalized_note,
      decided_by = current_user_id,
      decided_at = now(),
      updated_at = now()
  where id = request_value.id;

  insert into public.swap_request_events (
    organization_id, swap_request_id, actor_user_id, action, note
  ) values (
    request_value.organization_id, request_value.id,
    current_user_id, 'approved', normalized_note
  );

  return true;
end;
$$;

revoke all on function public.approve_shift_swap(uuid,text) from public, anon;
grant execute on function public.approve_shift_swap(uuid,text) to authenticated;

comment on function public.approve_shift_swap(uuid,text)
  is 'Manager-only atomic swap approval covering both assignments, request decision, and audit event.';
