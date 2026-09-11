-- Employees could not read their own branch.
--
-- private.can_access_branch only granted access for the 'organization',
-- 'branch' and 'department' scopes. Every employee gets access_scope 'self'
-- (the column default, and set_membership_departments assigns it to every
-- non-manager), so an employee's SELECT on their own branch returned nothing.
-- /workspace/availability requires that row and redirects to /workspace
-- without it: employees could not submit availability at all. Found by the
-- first real run of the staging workspace E2E flow.
--
-- A member can now always read their home branch and any branch they hold a
-- department membership in, whatever their scope -- the same rule
-- can_access_department already applies to department memberships. Only the
-- branch row itself is affected; every other table keeps its own policy.

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
        or caller.branch_id = branch.id
        or exists (
          select 1
          from public.department_memberships caller_department
          where caller_department.membership_id = caller.id
            and caller_department.branch_id = branch.id
        )
      )
  );
$$;
