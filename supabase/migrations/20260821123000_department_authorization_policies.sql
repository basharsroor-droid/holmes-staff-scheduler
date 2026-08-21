-- Close the remaining organization-wide read paths for branch and
-- department managers. Owner/admin access stays organization-wide; managers
-- only see employees and operational records inside their assigned scope.

create or replace function private.can_access_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.branches branch
    join public.organization_memberships caller
      on caller.organization_id = branch.organization_id
     and caller.user_id = (select auth.uid())
     and caller.status = 'active'
    where branch.id = target_branch_id
      and (
        caller.access_scope = 'organization'
        or (caller.access_scope = 'branch' and caller.branch_id = branch.id)
        or (
          caller.access_scope = 'department'
          and exists (
            select 1
            from public.department_memberships caller_department
            where caller_department.membership_id = caller.id
              and caller_department.branch_id = branch.id
          )
        )
      )
  );
$$;

create or replace function private.can_access_membership(target_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships target
    join public.organization_memberships caller
      on caller.organization_id = target.organization_id
     and caller.user_id = (select auth.uid())
     and caller.status = 'active'
    where target.id = target_membership_id
      and (
        target.user_id = (select auth.uid())
        or caller.role in ('owner', 'admin')
        or (
          caller.role = 'manager'
          and target.role = 'employee'
          and (
            (
              caller.access_scope = 'branch'
              and caller.branch_id is not null
              and caller.branch_id = target.branch_id
            )
            or (
              caller.access_scope = 'department'
              and exists (
                select 1
                from public.department_memberships caller_department
                join public.department_memberships target_department
                  on target_department.department_id = caller_department.department_id
                 and target_department.membership_id = target.id
                where caller_department.membership_id = caller.id
              )
            )
          )
        )
      )
  );
$$;

create or replace function private.can_manage_invitation_branch(
  target_organization_id uuid,
  target_branch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships caller
    where caller.organization_id = target_organization_id
      and caller.user_id = (select auth.uid())
      and caller.status = 'active'
      and (
        caller.role in ('owner', 'admin')
        or (
          caller.role = 'manager'
          and caller.access_scope = 'branch'
          and caller.branch_id = target_branch_id
        )
      )
  );
$$;

create or replace function private.can_manage_swap_request(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.swap_requests request
    join public.shift_assignments original_assignment
      on original_assignment.id = request.original_assignment_id
     and original_assignment.organization_id = request.organization_id
    join public.shifts original_shift
      on original_shift.id = original_assignment.shift_id
     and original_shift.organization_id = request.organization_id
    where request.id = target_request_id
      and (select private.can_manage_schedule_period(original_shift.schedule_period_id))
      and (
        request.target_shift_id is null
        or exists (
          select 1
          from public.shifts target_shift
          where target_shift.id = request.target_shift_id
            and target_shift.organization_id = request.organization_id
            and (select private.can_manage_schedule_period(target_shift.schedule_period_id))
        )
      )
  );
$$;

revoke all on function private.can_access_branch(uuid) from public, anon, authenticated;
revoke all on function private.can_access_membership(uuid) from public, anon, authenticated;
revoke all on function private.can_manage_invitation_branch(uuid, uuid) from public, anon, authenticated;
revoke all on function private.can_manage_swap_request(uuid) from public, anon, authenticated;

drop policy if exists branches_select_member on public.branches;
create policy branches_select_scoped on public.branches
for select to authenticated
using ((select private.can_access_branch(branches.id)));

drop policy if exists memberships_select_allowed on public.organization_memberships;
create policy memberships_select_scoped on public.organization_memberships
for select to authenticated
using ((select private.can_access_membership(organization_memberships.id)));

drop policy if exists profiles_select_allowed on public.profiles;
create policy profiles_select_scoped on public.profiles
for select to authenticated
using (
  profiles.id = (select auth.uid())
  or exists (
    select 1
    from public.organization_memberships target_membership
    where target_membership.user_id = profiles.id
      and (select private.can_access_membership(target_membership.id))
  )
);

drop policy if exists invitations_select_manager on public.organization_invitations;
create policy invitations_select_scoped on public.organization_invitations
for select to authenticated
using ((select private.can_manage_invitation_branch(
  organization_invitations.organization_id,
  organization_invitations.branch_id
)));

drop policy if exists leave_requests_select_allowed on public.leave_requests;
create policy leave_requests_select_scoped on public.leave_requests
for select to authenticated
using (
  leave_requests.user_id = (select auth.uid())
  or exists (
    select 1
    from public.organization_memberships target_membership
    where target_membership.organization_id = leave_requests.organization_id
      and target_membership.user_id = leave_requests.user_id
      and target_membership.status = 'active'
      and (select private.can_access_membership(target_membership.id))
  )
);

drop policy if exists swaps_select_allowed on public.swap_requests;
create policy swaps_select_scoped on public.swap_requests
for select to authenticated
using (
  swap_requests.requested_by = (select auth.uid())
  or swap_requests.target_user_id = (select auth.uid())
  or (select private.can_manage_swap_request(swap_requests.id))
);

drop policy if exists swaps_update_allowed on public.swap_requests;
create policy swaps_update_scoped on public.swap_requests
for update to authenticated
using (
  swap_requests.requested_by = (select auth.uid())
  or swap_requests.target_user_id = (select auth.uid())
  or (select private.can_manage_swap_request(swap_requests.id))
)
with check (
  swap_requests.requested_by = (select auth.uid())
  or swap_requests.target_user_id = (select auth.uid())
  or (select private.can_manage_swap_request(swap_requests.id))
);

drop policy if exists swap_events_select_allowed on public.swap_request_events;
create policy swap_events_select_scoped on public.swap_request_events
for select to authenticated
using (exists (
  select 1
  from public.swap_requests request
  where request.id = swap_request_events.swap_request_id
    and request.organization_id = swap_request_events.organization_id
    and (
      request.requested_by = (select auth.uid())
      or request.target_user_id = (select auth.uid())
      or (select private.can_manage_swap_request(request.id))
    )
));

drop policy if exists swap_events_insert_allowed on public.swap_request_events;
create policy swap_events_insert_scoped on public.swap_request_events
for insert to authenticated
with check (
  swap_request_events.actor_user_id = (select auth.uid())
  and exists (
    select 1
    from public.swap_requests request
    where request.id = swap_request_events.swap_request_id
      and request.organization_id = swap_request_events.organization_id
      and (
        request.requested_by = (select auth.uid())
        or request.target_user_id = (select auth.uid())
        or (select private.can_manage_swap_request(request.id))
      )
  )
);

-- Notification rows are private to their recipient. All production writes
-- happen in vetted SECURITY DEFINER functions or through the service role.
drop policy if exists notifications_select_allowed on public.notifications;
drop policy if exists notifications_insert_manager on public.notifications;
drop policy if exists notifications_update_manager on public.notifications;
drop policy if exists notifications_delete_manager on public.notifications;
create policy notifications_select_self on public.notifications
for select to authenticated
using (notifications.user_id = (select auth.uid()));

comment on function private.can_access_membership(uuid) is
  'Owner/admin see the organization; branch and department managers see only employees inside their assigned scope.';
comment on function private.can_manage_swap_request(uuid) is
  'Requires management access to every schedule period participating in a swap request.';
