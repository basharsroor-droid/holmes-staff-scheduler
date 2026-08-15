-- Address Supabase security and performance advisor findings without changing application data.

-- The delivery queue is service-role only. Keep that boundary explicit so future
-- grants cannot accidentally expose queued recipient and message metadata.
drop policy if exists email_delivery_queue_deny_authenticated
  on public.email_delivery_queue;

create policy email_delivery_queue_deny_authenticated
on public.email_delivery_queue
for all
to authenticated
using (false)
with check (false);

-- Cover tenant and department composite foreign keys in their declared order.
create index if not exists departments_branch_org_fk_idx
  on public.departments (branch_id, organization_id);

create index if not exists department_memberships_branch_org_idx
  on public.department_memberships (branch_id, organization_id);

create index if not exists department_memberships_department_scope_idx
  on public.department_memberships (department_id, organization_id, branch_id);

create index if not exists department_memberships_membership_scope_idx
  on public.department_memberships (membership_id, organization_id, branch_id);

create index if not exists department_memberships_organization_idx
  on public.department_memberships (organization_id);

create index if not exists schedule_periods_department_scope_fk_idx
  on public.schedule_periods (department_id, organization_id, branch_id);

create index if not exists shift_templates_department_scope_fk_idx
  on public.shift_templates (department_id, organization_id, branch_id);

-- Cover single-column foreign keys used by queue, preferences and support cleanup.
create index if not exists email_delivery_queue_organization_idx
  on public.email_delivery_queue (organization_id);

create index if not exists email_delivery_queue_user_idx
  on public.email_delivery_queue (user_id);

create index if not exists notification_preferences_user_idx
  on public.notification_preferences (user_id);

create index if not exists support_tickets_assigned_to_idx
  on public.support_tickets (assigned_to);
