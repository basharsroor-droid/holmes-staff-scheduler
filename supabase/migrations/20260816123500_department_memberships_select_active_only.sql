-- Continuation of the systematic edge-case pass (roadmap: what happens
-- to a suspended employee's already-open session). Investigated whether
-- suspension truly cuts off access immediately at the RLS layer, not
-- just via page-level redirects.
--
-- Found that the two core RLS helpers (private.has_org_role,
-- private.is_org_member) both correctly require status = 'active', and
-- every RLS policy referencing organization_memberships goes through one
-- of them -- except one: department_memberships_select_scoped's first
-- OR-branch let a caller read a department_memberships row as long as
-- they owned the parent organization_memberships row, with no check on
-- that membership's status. A suspended employee could still SELECT
-- their own (now-stale) department assignment.
--
-- Real-world impact is low -- it's SELECT-only, and scoped to a fact the
-- suspended user already knows about themselves (which department they
-- were in), not other employees' data or any write path. Fixed anyway
-- for consistency with every other policy in the schema and to close
-- the access-control-matrix gap cleanly, per the P0/P1-04 plan's own
-- closure criterion ("every permission tested").
alter policy department_memberships_select_scoped
on public.department_memberships
using (
  exists (
    select 1 from public.organization_memberships own_membership
    where own_membership.id = department_memberships.membership_id
      and own_membership.user_id = (select auth.uid())
      and own_membership.status = 'active'
  )
  or (select private.can_manage_department(department_memberships.department_id))
);
