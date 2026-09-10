-- B4 from docs/REMEDIATION_PLAN.md (Wave 1).
--
-- Clears the two performance-advisor findings that matter at scale
-- (get_advisors(performance), 2026-09-10):
--
-- 1. unindexed_foreign_keys (9): the tables added in August (push_*,
--    schedule_templates, schedule_template_items) were created without
--    covering indexes on their FKs. Every delete/update of a parent row
--    (organization, branch, department, device, user, shift template)
--    sequentially scans these tables to check references. The tables are
--    small today, so plain CREATE INDEX (not CONCURRENTLY, which cannot run
--    inside the migration transaction) is safe.
--
-- 2. auth_rls_initplan (4): four policies call auth.uid() bare, so Postgres
--    re-evaluates it for every row. Wrapping it as (select auth.uid()) makes
--    it an init-plan evaluated once per statement -- the pattern the other
--    63 policies already follow. ALTER POLICY keeps each policy's name,
--    command and roles; the expressions below are the live definitions
--    (pg_policies, 2026-09-10) with only that wrapping changed.

-- 1. Covering indexes for foreign keys ---------------------------------------

create index if not exists push_delivery_queue_device_id_idx on public.push_delivery_queue (device_id);
create index if not exists push_delivery_queue_organization_id_idx on public.push_delivery_queue (organization_id);
create index if not exists push_delivery_queue_user_id_idx on public.push_delivery_queue (user_id);
create index if not exists push_devices_organization_id_idx on public.push_devices (organization_id);
create index if not exists schedule_template_items_organization_id_idx on public.schedule_template_items (organization_id);
create index if not exists schedule_template_items_shift_template_id_idx on public.schedule_template_items (shift_template_id);
create index if not exists schedule_templates_branch_id_idx on public.schedule_templates (branch_id);
create index if not exists schedule_templates_created_by_idx on public.schedule_templates (created_by);
create index if not exists schedule_templates_department_id_idx on public.schedule_templates (department_id);

-- 2. Evaluate auth.uid() once per statement -----------------------------------

alter policy "employees request open shifts" on public.open_shift_requests
  with check (
    user_id = (select auth.uid())
    and status = 'pending'::public.open_shift_request_status
    and decided_by is null
    and decided_at is null
    and cancelled_at is null
    and exists (
      select 1
      from public.shifts s
      join public.schedule_periods sp
        on sp.id = s.schedule_period_id and sp.organization_id = s.organization_id
      join public.organization_memberships om
        on om.organization_id = s.organization_id and om.user_id = (select auth.uid())
      where s.id = open_shift_requests.shift_id
        and s.organization_id = open_shift_requests.organization_id
        and s.open_for_requests = true
        and s.status = 'published'::public.shift_status
        and om.status = 'active'::public.member_status
        and om.role = any (array['employee'::public.member_role, 'manager'::public.member_role])
        and exists (
          select 1
          from public.department_memberships dm
          where dm.membership_id = om.id
            and dm.organization_id = om.organization_id
            and dm.department_id = sp.department_id
        )
    )
  );

alter policy "open shift requests scoped select" on public.open_shift_requests
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.organization_memberships om
      join public.schedule_periods sp on sp.organization_id = om.organization_id
      join public.shifts s on s.schedule_period_id = sp.id and s.organization_id = sp.organization_id
      where om.user_id = (select auth.uid())
        and om.status = 'active'::public.member_status
        and om.organization_id = open_shift_requests.organization_id
        and s.id = open_shift_requests.shift_id
        and (
          om.role = any (array['owner'::public.member_role, 'admin'::public.member_role])
          or (
            om.role = 'manager'::public.member_role
            and exists (
              select 1
              from public.department_memberships dm
              where dm.membership_id = om.id
                and dm.organization_id = om.organization_id
                and dm.department_id = sp.department_id
            )
          )
        )
    )
  );

alter policy "managers read schedule templates" on public.schedule_templates
  using (
    exists (
      select 1
      from public.organization_memberships om
      where om.organization_id = schedule_templates.organization_id
        and om.user_id = (select auth.uid())
        and om.status = 'active'::public.member_status
        and (
          om.role = any (array['owner'::public.member_role, 'admin'::public.member_role])
          or (
            om.role = 'manager'::public.member_role
            and exists (
              select 1
              from public.department_memberships dm
              where dm.membership_id = om.id
                and dm.organization_id = om.organization_id
                and dm.department_id = schedule_templates.department_id
            )
          )
        )
    )
  );

alter policy "managers read schedule template items" on public.schedule_template_items
  using (
    exists (
      select 1
      from public.schedule_templates st
      join public.organization_memberships om on om.organization_id = st.organization_id
      where st.id = schedule_template_items.schedule_template_id
        and om.user_id = (select auth.uid())
        and om.status = 'active'::public.member_status
        and (
          om.role = any (array['owner'::public.member_role, 'admin'::public.member_role])
          or (
            om.role = 'manager'::public.member_role
            and exists (
              select 1
              from public.department_memberships dm
              where dm.membership_id = om.id
                and dm.organization_id = om.organization_id
                and dm.department_id = st.department_id
            )
          )
        )
    )
  );
