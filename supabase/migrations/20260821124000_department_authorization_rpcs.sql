-- Re-authorize every privileged RPC against the concrete branch/department
-- record it mutates. These functions bypass table RLS by design, so their
-- scope checks must be explicit and cannot stop at organization membership.

create or replace function public.publish_schedule_period(target_period_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  period_value public.schedule_periods%rowtype;
  published_shift_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into period_value
  from public.schedule_periods period
  where period.id = target_period_id
  for update;

  if period_value.id is null then raise exception 'Schedule period not found'; end if;
  if not (select private.can_manage_schedule_period(period_value.id)) then
    raise exception 'Manager permission required for this department';
  end if;
  if period_value.status = 'archived' then raise exception 'Archived schedule cannot be published'; end if;

  select count(*)::integer into published_shift_count
  from public.shifts shift
  where shift.schedule_period_id = period_value.id
    and shift.organization_id = period_value.organization_id
    and shift.status <> 'cancelled';

  if published_shift_count = 0 then raise exception 'Cannot publish an empty schedule'; end if;

  update public.shifts
  set status = 'published', updated_at = now()
  where schedule_period_id = period_value.id
    and organization_id = period_value.organization_id
    and status <> 'cancelled';

  update public.schedule_periods
  set status = 'published',
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where id = period_value.id;

  insert into public.notifications (
    organization_id, user_id, channel, template_key, payload, status, scheduled_for
  )
  select
    period_value.organization_id,
    membership.user_id,
    'in_app',
    'schedule_published',
    jsonb_build_object(
      'schedule_period_id', period_value.id,
      'year', period_value.year,
      'month', period_value.month,
      'branch_id', period_value.branch_id,
      'department_id', period_value.department_id
    ),
    'pending',
    now()
  from public.organization_memberships membership
  where membership.organization_id = period_value.organization_id
    and membership.status = 'active'
    and (
      membership.access_scope = 'organization'
      or (membership.access_scope = 'branch' and membership.branch_id = period_value.branch_id)
      or exists (
        select 1
        from public.department_memberships department_membership
        where department_membership.membership_id = membership.id
          and department_membership.department_id = period_value.department_id
      )
    )
  on conflict do nothing;

  return published_shift_count;
end;
$$;

create or replace function public.unpublish_schedule_period(target_period_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  period_value public.schedule_periods%rowtype;
  reverted_shift_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into period_value
  from public.schedule_periods period
  where period.id = target_period_id
  for update;

  if period_value.id is null then raise exception 'Schedule period not found'; end if;
  if not (select private.can_manage_schedule_period(period_value.id)) then
    raise exception 'Manager permission required for this department';
  end if;
  if period_value.status <> 'published' then
    raise exception 'Only a published schedule can be unpublished';
  end if;

  update public.shifts
  set status = 'draft', updated_at = now()
  where schedule_period_id = period_value.id
    and organization_id = period_value.organization_id
    and status = 'published';
  get diagnostics reverted_shift_count = row_count;

  update public.schedule_periods
  set status = 'draft', updated_at = now()
  where id = period_value.id;

  return reverted_shift_count;
end;
$$;

create or replace function public.cancel_shifts_for_day(target_period_id uuid, target_date date)
returns table(shifts_cancelled integer, assignments_removed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  period_value public.schedule_periods%rowtype;
  v_shifts_cancelled integer := 0;
  v_assignments_removed integer := 0;
  removed_count integer;
  shift_value record;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into period_value
  from public.schedule_periods period
  where period.id = target_period_id
  for update;

  if period_value.id is null then raise exception 'Schedule period not found'; end if;
  if not (select private.can_manage_schedule_period(period_value.id)) then
    raise exception 'Manager permission required for this department';
  end if;

  for shift_value in
    select shift.id
    from public.shifts shift
    where shift.schedule_period_id = period_value.id
      and shift.organization_id = period_value.organization_id
      and shift.shift_date = target_date
      and shift.status <> 'cancelled'
    for update
  loop
    delete from public.shift_assignments assignment
    where assignment.shift_id = shift_value.id
      and assignment.organization_id = period_value.organization_id;
    get diagnostics removed_count = row_count;
    v_assignments_removed := v_assignments_removed + removed_count;

    update public.shifts
    set status = 'cancelled', updated_at = now()
    where id = shift_value.id
      and organization_id = period_value.organization_id;
    v_shifts_cancelled := v_shifts_cancelled + 1;
  end loop;

  return query select v_shifts_cancelled, v_assignments_removed;
end;
$$;

create or replace function public.duplicate_schedule_period(source_period_id uuid, target_period_id uuid)
returns table(shifts_created integer, assignments_created integer, assignments_skipped_inactive integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  source_period public.schedule_periods%rowtype;
  target_period public.schedule_periods%rowtype;
  existing_target_shifts integer;
  v_shifts_created integer := 0;
  v_assignments_created integer := 0;
  v_assignments_skipped integer := 0;
  shift_value record;
  target_date date;
  new_shift_id uuid;
  inserted_assignments integer;
  source_assignment_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into source_period from public.schedule_periods where id = source_period_id for update;
  select * into target_period from public.schedule_periods where id = target_period_id for update;

  if source_period.id is null or target_period.id is null then raise exception 'Schedule period not found'; end if;
  if source_period.id = target_period.id then raise exception 'Source and target periods must be different'; end if;
  if source_period.organization_id <> target_period.organization_id
     or source_period.branch_id <> target_period.branch_id
     or source_period.department_id <> target_period.department_id then
    raise exception 'Source and target periods must be in the same department';
  end if;
  if not (select private.can_manage_schedule_period(source_period.id))
     or not (select private.can_manage_schedule_period(target_period.id)) then
    raise exception 'Manager permission required for both schedule periods';
  end if;

  select count(*) into existing_target_shifts
  from public.shifts
  where schedule_period_id = target_period.id;
  if existing_target_shifts > 0 then
    raise exception 'Target period already has shifts; duplicate only works into an empty schedule';
  end if;

  for shift_value in
    select
      shift.id, shift.shift_template_id, shift.shift_date, shift.name,
      shift.start_time, shift.end_time, shift.required_employees,
      dense_rank() over (partition by extract(dow from shift.shift_date) order by shift.shift_date) as occurrence,
      extract(dow from shift.shift_date)::int as weekday
    from public.shifts shift
    where shift.schedule_period_id = source_period.id
      and shift.status <> 'cancelled'
    order by shift.shift_date
  loop
    select generated_day::date into target_date
    from (
      select generated_day, row_number() over (order by generated_day) as occurrence
      from generate_series(
        make_date(target_period.year, target_period.month, 1),
        (make_date(target_period.year, target_period.month, 1) + interval '1 month - 1 day')::date,
        interval '1 day'
      ) generated_day
      where extract(dow from generated_day)::int = shift_value.weekday
    ) matching_weekday
    where occurrence = shift_value.occurrence;

    if target_date is null then continue; end if;

    insert into public.shifts (
      organization_id, schedule_period_id, shift_template_id, shift_date, name,
      start_time, end_time, required_employees, status
    ) values (
      target_period.organization_id, target_period.id, shift_value.shift_template_id,
      target_date, shift_value.name, shift_value.start_time, shift_value.end_time,
      shift_value.required_employees, 'draft'
    ) returning id into new_shift_id;
    v_shifts_created := v_shifts_created + 1;

    select count(*) into source_assignment_count
    from public.shift_assignments assignment
    where assignment.shift_id = shift_value.id;

    insert into public.shift_assignments (organization_id, shift_id, user_id)
    select target_period.organization_id, new_shift_id, assignment.user_id
    from public.shift_assignments assignment
    where assignment.shift_id = shift_value.id
      and exists (
        select 1
        from public.organization_memberships membership
        where membership.user_id = assignment.user_id
          and membership.organization_id = target_period.organization_id
          and membership.status = 'active'
          and (
            membership.access_scope = 'organization'
            or (membership.access_scope = 'branch' and membership.branch_id = target_period.branch_id)
            or exists (
              select 1
              from public.department_memberships department_membership
              where department_membership.membership_id = membership.id
                and department_membership.department_id = target_period.department_id
            )
          )
      );
    get diagnostics inserted_assignments = row_count;
    v_assignments_created := v_assignments_created + inserted_assignments;
    v_assignments_skipped := v_assignments_skipped + (source_assignment_count - inserted_assignments);
  end loop;

  return query select v_shifts_created, v_assignments_created, v_assignments_skipped;
end;
$$;

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
  from public.swap_requests request
  where request.id = target_request_id
  for update;

  if request_value.id is null then raise exception 'Swap request not found'; end if;
  if request_value.status <> 'pending_manager' then raise exception 'Swap request is not awaiting manager approval'; end if;
  if not (select private.can_manage_swap_request(request_value.id)) then
    raise exception 'Manager permission required for every department in this swap';
  end if;
  if request_value.target_user_id is null or request_value.target_shift_id is null then
    raise exception 'Swap request has no valid target';
  end if;

  select * into original_assignment
  from public.shift_assignments assignment
  where assignment.id = request_value.original_assignment_id
    and assignment.organization_id = request_value.organization_id
  for update;

  select * into target_assignment
  from public.shift_assignments assignment
  where assignment.shift_id = request_value.target_shift_id
    and assignment.user_id = request_value.target_user_id
    and assignment.organization_id = request_value.organization_id
  for update;

  if original_assignment.id is null or original_assignment.user_id <> request_value.requested_by then
    raise exception 'Original assignment changed since the request was created';
  end if;
  if target_assignment.id is null then
    raise exception 'Target assignment changed since the request was created';
  end if;

  update public.shift_assignments
  set user_id = request_value.target_user_id, assigned_by = current_user_id
  where id = original_assignment.id;

  update public.shift_assignments
  set user_id = request_value.requested_by, assigned_by = current_user_id
  where id = target_assignment.id;

  update public.swap_requests
  set status = 'approved', manager_note = normalized_note,
      decided_by = current_user_id, decided_at = now(), updated_at = now()
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

create or replace function public.create_organization_invitation(
  target_organization_id uuid,
  target_branch_id uuid,
  target_email text,
  target_first_name text,
  target_last_name text default '',
  target_role public.member_role default 'employee'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_user_confirmed_at timestamptz;
  normalized_email text := lower(trim(target_email));
  invitation_token uuid := gen_random_uuid();
  caller_role public.member_role;
  existing_user_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select user_record.email_confirmed_at into current_user_confirmed_at
  from auth.users user_record
  where user_record.id = current_user_id;
  if current_user_confirmed_at is null then raise exception 'Verified email required'; end if;

  select membership.role into caller_role
  from public.organization_memberships membership
  where membership.organization_id = target_organization_id
    and membership.user_id = current_user_id
    and membership.status = 'active';

  if not (select private.can_manage_invitation_branch(target_organization_id, target_branch_id)) then
    raise exception 'Insufficient permission for this branch';
  end if;
  if caller_role = 'manager' and target_role <> 'employee' then
    raise exception 'Managers may invite employees only';
  end if;
  if target_role not in ('admin', 'manager', 'employee') then raise exception 'Invalid invitation role'; end if;
  if char_length(normalized_email) < 5 or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'Invalid email';
  end if;
  if char_length(trim(target_first_name)) < 1 or char_length(trim(target_first_name)) > 80 then
    raise exception 'Invalid first name';
  end if;
  if char_length(trim(target_last_name)) > 80 then raise exception 'Invalid last name'; end if;
  if not exists (
    select 1 from public.branches branch
    where branch.id = target_branch_id
      and branch.organization_id = target_organization_id
      and branch.active
  ) then raise exception 'Invalid branch'; end if;

  select user_record.id into existing_user_id
  from auth.users user_record
  where lower(user_record.email) = normalized_email
  limit 1;

  if existing_user_id is not null and exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = existing_user_id
  ) then raise exception 'User is already a member'; end if;

  update public.organization_invitations
  set token = invitation_token,
      branch_id = target_branch_id,
      first_name = trim(target_first_name),
      last_name = trim(target_last_name),
      role = target_role,
      invited_by = current_user_id,
      expires_at = now() + interval '7 days',
      updated_at = now()
  where organization_id = target_organization_id
    and email = normalized_email
    and status = 'pending';

  if not found then
    insert into public.organization_invitations (
      organization_id, branch_id, email, first_name, last_name, role, token, invited_by
    ) values (
      target_organization_id, target_branch_id, normalized_email,
      trim(target_first_name), trim(target_last_name), target_role,
      invitation_token, current_user_id
    );
  end if;

  return invitation_token;
end;
$$;

create or replace function public.revoke_organization_invitation(invitation_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  invitation public.organization_invitations%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into invitation
  from public.organization_invitations invitation_row
  where invitation_row.token = invitation_token
  for update;

  if invitation.id is null then raise exception 'Invitation not found'; end if;
  if not (select private.can_manage_invitation_branch(invitation.organization_id, invitation.branch_id)) then
    raise exception 'Insufficient permission for this branch';
  end if;
  if invitation.status <> 'pending' then
    raise exception 'Only a pending invitation can be revoked';
  end if;

  update public.organization_invitations
  set status = 'revoked', updated_at = now()
  where id = invitation.id;
  return true;
end;
$$;

revoke all on function public.publish_schedule_period(uuid) from public, anon;
revoke all on function public.unpublish_schedule_period(uuid) from public, anon;
revoke all on function public.cancel_shifts_for_day(uuid, date) from public, anon;
revoke all on function public.duplicate_schedule_period(uuid, uuid) from public, anon;
revoke all on function public.approve_shift_swap(uuid, text) from public, anon;
revoke all on function public.create_organization_invitation(uuid, uuid, text, text, text, public.member_role) from public, anon;
revoke all on function public.revoke_organization_invitation(uuid) from public, anon;

grant execute on function public.publish_schedule_period(uuid) to authenticated;
grant execute on function public.unpublish_schedule_period(uuid) to authenticated;
grant execute on function public.cancel_shifts_for_day(uuid, date) to authenticated;
grant execute on function public.duplicate_schedule_period(uuid, uuid) to authenticated;
grant execute on function public.approve_shift_swap(uuid, text) to authenticated;
grant execute on function public.create_organization_invitation(uuid, uuid, text, text, text, public.member_role) to authenticated;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;

comment on function public.publish_schedule_period(uuid) is
  'Publishes only a schedule period the authenticated manager can manage and notifies only members who can access its department.';
comment on function public.approve_shift_swap(uuid, text) is
  'Atomically approves a swap only when the manager can manage every participating schedule department.';
