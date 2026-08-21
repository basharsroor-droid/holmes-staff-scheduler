import { existsSync, readFileSync } from "node:fs";

const schema = readFileSync(new URL("../db/supabase-scheduler-schema.sql", import.meta.url), "utf8");
const hardeningMigrationUrl = new URL(
  "../supabase/migrations/20260807051000_harden_privileged_auth_rpcs.sql",
  import.meta.url
);
const swapHardeningMigrationUrl = new URL(
  "../supabase/migrations/20260807175000_harden_shift_swap_transitions.sql",
  import.meta.url
);
const pendingInvitationUniquenessMigrationUrl = new URL(
  "../supabase/migrations/20260816121707_pending_invitation_email_uniqueness.sql",
  import.meta.url
);
const availabilityHardeningMigrationUrl = new URL(
  "../supabase/migrations/20260807181000_harden_availability_windows.sql",
  import.meta.url
);
const swapEventHardeningMigrationUrl = new URL(
  "../supabase/migrations/20260807183000_harden_swap_audit_events.sql",
  import.meta.url
);
const draftScheduleProtectionMigrationUrl = new URL(
  "../supabase/migrations/20260807190000_protect_draft_schedules.sql",
  import.meta.url
);
const atomicPublishingMigrationUrl = new URL(
  "../supabase/migrations/20260807193000_atomic_schedule_publishing.sql",
  import.meta.url
);
const atomicSwapApprovalMigrationUrl = new URL(
  "../supabase/migrations/20260807195000_atomic_shift_swap_approval.sql",
  import.meta.url
);
const managementAuditMigrationUrl = new URL(
  "../supabase/migrations/20260807202000_management_audit_log.sql",
  import.meta.url
);
const inAppNotificationsMigrationUrl = new URL(
  "../supabase/migrations/20260808003000_in_app_schedule_notifications.sql",
  import.meta.url
);
const swapNotificationsMigrationUrl = new URL(
  "../supabase/migrations/20260808010000_shift_swap_notifications.sql",
  import.meta.url
);
const overlapPreventionMigrationUrl = new URL(
  "../supabase/migrations/20260808124000_prevent_overlapping_shift_assignments.sql",
  import.meta.url
);
const lastOwnerProtectionMigrationUrl = new URL(
  "../supabase/migrations/20260808131500_protect_last_active_owner.sql",
  import.meta.url
);
const ownershipTransferMigrationUrl = new URL(
  "../supabase/migrations/20260808133000_transfer_organization_ownership.sql",
  import.meta.url
);
const swapManagerTargetOverlapMigrationUrl = new URL(
  "../supabase/migrations/20260808141500_fix_swap_transition_manager_target_overlap.sql",
  import.meta.url
);
const unpublishScheduleMigrationUrl = new URL(
  "../supabase/migrations/20260808150000_unpublish_schedule_period.sql",
  import.meta.url
);
const releaseFutureShiftsMigrationUrl = new URL(
  "../supabase/migrations/20260808154500_release_future_shifts_on_suspension.sql",
  import.meta.url
);
const invitationResendCooldownMigrationUrl = new URL(
  "../supabase/migrations/20260808160000_invitation_resend_cooldown.sql",
  import.meta.url
);
const duplicateSchedulePeriodMigrationUrl = new URL(
  "../supabase/migrations/20260808163000_duplicate_schedule_period.sql",
  import.meta.url
);
const leaveRequestsMigrationUrl = new URL(
  "../supabase/migrations/20260808170000_leave_requests.sql",
  import.meta.url
);
const weeklyHoursLimitMigrationUrl = new URL(
  "../supabase/migrations/20260809050000_weekly_hours_limit.sql",
  import.meta.url
);
const minRestHoursMigrationUrl = new URL(
  "../supabase/migrations/20260809080000_min_rest_hours.sql",
  import.meta.url
);
const cancelShiftsForDayMigrationUrl = new URL(
  "../supabase/migrations/20260809100000_cancel_shifts_for_day.sql",
  import.meta.url
);
const fixDeadExpiredInvitationUpdateMigrationUrl = new URL(
  "../supabase/migrations/20260809110000_fix_dead_expired_invitation_update.sql",
  import.meta.url
);
const secureInvitationRevocationMigrationUrl = new URL(
  "../supabase/migrations/20260810193000_secure_invitation_revocation.sql",
  import.meta.url
);
const emailNotificationDeliveryMigrationUrl = new URL(
  "../supabase/migrations/20260814090000_email_notification_delivery.sql",
  import.meta.url
);
const departmentsFoundationMigrationUrl = new URL(
  "../supabase/migrations/20260814160000_departments_foundation.sql",
  import.meta.url
);
const departmentScopedSchedulingMigrationUrl = new URL(
  "../supabase/migrations/20260814180000_department_scoped_scheduling.sql",
  import.meta.url
);
const customerSupportMigrationUrl = new URL(
  "../supabase/migrations/20260814193000_customer_support_center.sql",
  import.meta.url
);
const platformSupportConsoleMigrationUrl = new URL(
  "../supabase/migrations/20260814203000_platform_support_console.sql",
  import.meta.url
);
const advisorHardeningMigrationUrl = new URL(
  "../supabase/migrations/20260815210000_advisor_hardening_indexes.sql",
  import.meta.url
);
const demoSalesEnvironmentMigrationUrl = new URL(
  "../supabase/migrations/20260816103122_demo_sales_environment.sql",
  import.meta.url
);
const departmentMembershipsActiveOnlyMigrationUrl = new URL(
  "../supabase/migrations/20260816123500_department_memberships_select_active_only.sql",
  import.meta.url
);
const supportTicketResponseMetricsMigrationUrl = new URL(
  "../supabase/migrations/20260817182653_support_ticket_response_metrics.sql",
  import.meta.url
);
const departmentAuthorizationPoliciesMigrationUrl = new URL(
  "../supabase/migrations/20260821123000_department_authorization_policies.sql",
  import.meta.url
);
const departmentAuthorizationRpcsMigrationUrl = new URL(
  "../supabase/migrations/20260821124000_department_authorization_rpcs.sql",
  import.meta.url
);
const policyHelperExecutionMigrationUrl = new URL(
  "../supabase/migrations/20260821125000_policy_helper_execution.sql",
  import.meta.url
);
const protectDemoOrganizationsMigrationUrl = new URL(
  "../supabase/migrations/20260821130000_protect_demo_organizations_from_deletion.sql",
  import.meta.url
);
const organizationDeletionCascadeMigrationUrl = new URL(
  "../supabase/migrations/20260821133000_fix_organization_deletion_audit_cascades.sql",
  import.meta.url
);

const tenantTables = [
  "organizations",
  "branches",
  "profiles",
  "organization_memberships",
  "shift_templates",
  "schedule_periods",
  "availability_submissions",
  "availability_entries",
  "shifts",
  "shift_assignments",
  "swap_requests",
  "swap_request_events",
  "notifications",
  "audit_logs"
];

const failures = [];

if (!existsSync(policyHelperExecutionMigrationUrl)) {
  failures.push("RLS policy helper execution migration is missing");
} else {
  const helperExecutionMigration = readFileSync(policyHelperExecutionMigrationUrl, "utf8");
  for (const helper of [
    "private.can_access_branch(uuid)",
    "private.can_access_membership(uuid)",
    "private.can_manage_invitation_branch(uuid, uuid)",
    "private.can_manage_swap_request(uuid)",
    "private.can_access_schedule_period(uuid)",
    "private.can_manage_schedule_period(uuid)"
  ]) {
    if (!helperExecutionMigration.includes(`grant execute on function ${helper} to authenticated`)) {
      failures.push(`authenticated RLS helper grant is missing: ${helper}`);
    }
  }
}

if (!existsSync(departmentAuthorizationPoliciesMigrationUrl)) {
  failures.push("department authorization policy migration is missing");
} else {
  const policyMigration = readFileSync(departmentAuthorizationPoliciesMigrationUrl, "utf8");
  for (const requiredRule of [
    "private.can_access_branch",
    "private.can_access_membership",
    "private.can_manage_invitation_branch",
    "private.can_manage_swap_request",
    "memberships_select_scoped",
    "profiles_select_scoped",
    "invitations_select_scoped",
    "leave_requests_select_scoped",
    "swaps_select_scoped",
    "swap_events_select_scoped",
    "notifications_select_self"
  ]) {
    if (!policyMigration.includes(requiredRule)) {
      failures.push(`department authorization policy rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(departmentAuthorizationRpcsMigrationUrl)) {
  failures.push("department authorization RPC migration is missing");
} else {
  const rpcMigration = readFileSync(departmentAuthorizationRpcsMigrationUrl, "utf8");
  for (const requiredRule of [
    "private.can_manage_schedule_period(period_value.id)",
    "Source and target periods must be in the same department",
    "private.can_manage_swap_request(request_value.id)",
    "private.can_manage_invitation_branch(target_organization_id, target_branch_id)",
    "department_membership.department_id = period_value.department_id",
    "'department_id', period_value.department_id"
  ]) {
    if (!rpcMigration.includes(requiredRule)) {
      failures.push(`department authorization RPC rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(advisorHardeningMigrationUrl)) {
  failures.push("Supabase advisor hardening migration is missing");
} else {
  const advisorMigration = readFileSync(advisorHardeningMigrationUrl, "utf8");
  for (const requiredRule of [
    "email_delivery_queue_deny_authenticated",
    "using (false)",
    "with check (false)",
    "departments_branch_org_fk_idx",
    "department_memberships_department_scope_idx",
    "department_memberships_membership_scope_idx",
    "schedule_periods_department_scope_fk_idx",
    "shift_templates_department_scope_fk_idx",
    "email_delivery_queue_organization_idx",
    "email_delivery_queue_user_idx",
    "notification_preferences_user_idx",
    "support_tickets_assigned_to_idx"
  ]) {
    if (!advisorMigration.includes(requiredRule)) {
      failures.push(`Supabase advisor hardening rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(platformSupportConsoleMigrationUrl)) {
  failures.push("platform support console migration is missing");
} else {
  const consoleMigration = readFileSync(platformSupportConsoleMigrationUrl, "utf8");
  for (const requiredRule of [
    "support_tickets add column organization_name",
    "set_support_ticket_organization_name",
    "alter column organization_name set not null",
    "from public, anon, authenticated"
  ]) {
    if (!consoleMigration.includes(requiredRule)) failures.push(`support console rule is missing: ${requiredRule}`);
  }
}

if (!existsSync(customerSupportMigrationUrl)) {
  failures.push("customer support migration is missing");
} else {
  const supportMigration = readFileSync(customerSupportMigrationUrl, "utf8");
  for (const requiredRule of [
    "alter table public.support_tickets enable row level security",
    "support_tickets_select_allowed",
    "support_tickets_insert_member",
    "support_tickets_update_agent",
    "private.is_platform_support_agent",
    "queue_support_ticket_email",
    "support_ticket_created",
    "support_ticket_updated",
    "revoke insert, update, delete on public.platform_support_agents from authenticated",
    "created_by = (select auth.uid())",
    "revoke delete on public.support_tickets from authenticated"
  ]) {
    if (!supportMigration.includes(requiredRule)) failures.push(`customer support rule is missing: ${requiredRule}`);
  }
}

if (!existsSync(departmentsFoundationMigrationUrl)) {
  failures.push("departments foundation migration is missing");
} else {
  const departmentsMigration = readFileSync(departmentsFoundationMigrationUrl, "utf8");
  for (const requiredRule of [
    "alter table public.departments enable row level security",
    "alter table public.department_memberships enable row level security",
    "private.can_access_department",
    "private.can_manage_department",
    "set_membership_departments",
    "Employees must belong to at least one department",
    "from public, anon"
  ]) {
    if (!departmentsMigration.includes(requiredRule)) failures.push(`department authorization rule is missing: ${requiredRule}`);
  }
}

if (!existsSync(departmentScopedSchedulingMigrationUrl)) {
  failures.push("department-scoped scheduling migration is missing");
} else {
  const scopedSchedulingMigration = readFileSync(departmentScopedSchedulingMigrationUrl, "utf8");
  for (const requiredRule of [
    "shift_templates add column department_id",
    "schedule_periods add column department_id",
    "private.can_manage_schedule_period",
    "templates_select_scoped",
    "periods_select_scoped",
    "shifts_select_allowed",
    "submissions_select_scoped",
    "assignments_select_scoped",
    "Assigned worker must belong to the schedule department",
    "Shift template and availability period must belong to the same department"
  ]) {
    if (!scopedSchedulingMigration.includes(requiredRule)) failures.push(`department scheduling rule is missing: ${requiredRule}`);
  }
}

if (!existsSync(emailNotificationDeliveryMigrationUrl)) {
  failures.push("email notification delivery migration is missing");
} else {
  const emailMigration = readFileSync(emailNotificationDeliveryMigrationUrl, "utf8");
  for (const requiredRule of [
    "alter table public.notification_preferences enable row level security",
    "alter table public.email_delivery_queue enable row level security",
    "idempotency_key text not null unique",
    "for update skip locked",
    "Service role required",
    "queue_email_for_in_app_notification"
  ]) {
    if (!emailMigration.includes(requiredRule)) failures.push(`email delivery rule is missing: ${requiredRule}`);
  }
}

for (const table of tenantTables) {
  if (!schema.includes(`alter table public.${table} enable row level security;`)) {
    failures.push(`${table}: RLS is not enabled`);
  }
}

for (const unsafePattern of ["auth.role()", "raw_user_meta_data", "service_role"]) {
  if (schema.includes(unsafePattern)) failures.push(`unsafe pattern found: ${unsafePattern}`);
}

if (!schema.includes("set search_path = ''")) {
  failures.push("private authorization helpers do not pin search_path");
}

if (!schema.includes("revoke all on schema private from public")) {
  failures.push("private schema is not revoked from public");
}

if (!existsSync(hardeningMigrationUrl)) {
  failures.push("privileged auth RPC hardening migration is missing");
} else {
  const hardeningMigration = readFileSync(hardeningMigrationUrl, "utf8");

  for (const functionName of [
    "create_organization_workspace",
    "create_organization_invitation",
    "accept_organization_invitation"
  ]) {
    if (!hardeningMigration.includes(`function public.${functionName}`)) {
      failures.push(`${functionName}: hardening definition is missing`);
    }
  }

  if (!hardeningMigration.includes("email_confirmed_at")) {
    failures.push("privileged auth RPCs do not require a verified email");
  }

  if (!hardeningMigration.includes("from public, anon")) {
    failures.push("privileged auth RPCs are not explicitly revoked from anonymous callers");
  }
}

if (!existsSync(pendingInvitationUniquenessMigrationUrl)) {
  failures.push("pending-invitation email uniqueness migration is missing");
} else {
  const pendingInvitationMigration = readFileSync(pendingInvitationUniquenessMigrationUrl, "utf8");
  if (!pendingInvitationMigration.includes("create unique index if not exists organization_invitations_pending_email_idx")) {
    failures.push("pending-invitation email uniqueness index is missing -- create_organization_invitation()'s update-then-insert-if-not-found pattern has a TOCTOU race without it (two concurrent invites to the same email can both insert)");
  }
  if (!pendingInvitationMigration.includes("where status = 'pending'")) {
    failures.push("pending-invitation email uniqueness index must be scoped to status = 'pending' (a resent/re-invited email after acceptance or revocation must be allowed a new pending row)");
  }
}

if (!existsSync(swapHardeningMigrationUrl)) {
  failures.push("shift swap transition hardening migration is missing");
} else {
  const swapMigration = readFileSync(swapHardeningMigrationUrl, "utf8");
  for (const requiredRule of [
    "You may request a swap only for your own assignment",
    "Swap request identity fields are immutable",
    "Manager may approve or reject pending manager requests only",
    "Target employee may accept or reject a pending request only",
    "Requester may cancel pending requests only"
  ]) {
    if (!swapMigration.includes(requiredRule)) {
      failures.push(`shift swap hardening rule is missing: ${requiredRule}`);
    }
  }
  if (!swapMigration.includes("before insert or update on public.swap_requests")) {
    failures.push("shift swap transition trigger is missing");
  }
}

if (!existsSync(availabilityHardeningMigrationUrl)) {
  failures.push("availability window hardening migration is missing");
} else {
  const availabilityMigration = readFileSync(availabilityHardeningMigrationUrl, "utf8");
  for (const requiredRule of [
    "Availability submission window is closed",
    "Employees may write their own availability only",
    "Manager may update the internal note only",
    "Availability entry identity fields are immutable",
    "Availability date is outside the schedule period"
  ]) {
    if (!availabilityMigration.includes(requiredRule)) {
      failures.push(`availability hardening rule is missing: ${requiredRule}`);
    }
  }
  for (const triggerTarget of [
    "before insert or update or delete on public.availability_submissions",
    "before insert or update or delete on public.availability_entries"
  ]) {
    if (!availabilityMigration.includes(triggerTarget)) {
      failures.push(`availability trigger is missing: ${triggerTarget}`);
    }
  }
}

if (!existsSync(swapEventHardeningMigrationUrl)) {
  failures.push("swap audit event hardening migration is missing");
} else {
  const eventMigration = readFileSync(swapEventHardeningMigrationUrl, "utf8");
  for (const requiredRule of [
    "Invalid swap event actor",
    "Swap event does not match the current request state",
    "swap_request_events_action_once_idx",
    "before insert on public.swap_request_events"
  ]) {
    if (!eventMigration.includes(requiredRule)) {
      failures.push(`swap event hardening rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(draftScheduleProtectionMigrationUrl)) {
  failures.push("draft schedule protection migration is missing");
} else {
  const draftMigration = readFileSync(draftScheduleProtectionMigrationUrl, "utf8");
  for (const requiredRule of [
    "status = 'published'",
    "shifts_select_allowed",
    "assignments_select_allowed",
    "employees see published shifts",
    "employees see assignments for published shifts only"
  ]) {
    if (!draftMigration.includes(requiredRule)) {
      failures.push(`draft schedule protection is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(atomicPublishingMigrationUrl)) {
  failures.push("atomic schedule publishing migration is missing");
} else {
  const publishingMigration = readFileSync(atomicPublishingMigrationUrl, "utf8");
  for (const requiredRule of [
    "publish_schedule_period",
    "Manager permission required",
    "Cannot publish an empty schedule",
    "for update",
    "status = 'published'",
    "from public, anon"
  ]) {
    if (!publishingMigration.includes(requiredRule)) {
      failures.push(`atomic publishing rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(atomicSwapApprovalMigrationUrl)) {
  failures.push("atomic shift swap approval migration is missing");
} else {
  const approvalMigration = readFileSync(atomicSwapApprovalMigrationUrl, "utf8");
  for (const requiredRule of [
    "approve_shift_swap",
    "Swap request is not awaiting manager approval",
    "Manager permission required",
    "Original assignment changed since the request was created",
    "Target assignment changed since the request was created",
    "insert into public.swap_request_events",
    "from public, anon"
  ]) {
    if (!approvalMigration.includes(requiredRule)) {
      failures.push(`atomic swap approval rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(managementAuditMigrationUrl)) {
  failures.push("management audit log migration is missing");
} else {
  const auditMigration = readFileSync(managementAuditMigrationUrl, "utf8");
  for (const requiredRule of [
    "write_management_audit_log",
    "audit_organizations_update",
    "audit_branches_write",
    "audit_memberships_write",
    "audit_shift_templates_write",
    "audit_schedule_periods_write",
    "excludes emails, tokens, notes, and credentials"
  ]) {
    if (!auditMigration.includes(requiredRule)) {
      failures.push(`management audit rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(inAppNotificationsMigrationUrl)) {
  failures.push("in-app notifications migration is missing");
} else {
  const notificationMigration = readFileSync(inAppNotificationsMigrationUrl, "utf8");
  for (const requiredRule of [
    "read_at",
    "notifications_schedule_published_once_idx",
    "schedule_published",
    "mark_my_notifications_read",
    "where user_id = current_user_id",
    "from public, anon"
  ]) {
    if (!notificationMigration.includes(requiredRule)) {
      failures.push(`in-app notification rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(swapNotificationsMigrationUrl)) {
  failures.push("shift swap notifications migration is missing");
} else {
  const swapNotificationMigration = readFileSync(swapNotificationsMigrationUrl, "utf8");
  for (const requiredRule of [
    "notifications_swap_event_once_idx",
    "swap_request_received",
    "swap_waiting_manager",
    "swap_approved",
    "swap_rejected",
    "swap_cancelled",
    "notify_shift_swap_change",
    "on conflict do nothing"
  ]) {
    if (!swapNotificationMigration.includes(requiredRule)) {
      failures.push(`shift swap notification rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(overlapPreventionMigrationUrl)) {
  failures.push("overlapping shift assignment prevention migration is missing");
} else {
  const overlapMigration = readFileSync(overlapPreventionMigrationUrl, "utf8");
  for (const requiredRule of [
    "check_shift_assignment_overlap",
    "before insert or update of shift_id, user_id on public.shift_assignments",
    "Employee is already assigned to an overlapping shift",
    "from public, anon"
  ]) {
    if (!overlapMigration.includes(requiredRule)) {
      failures.push(`overlap prevention rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(lastOwnerProtectionMigrationUrl)) {
  failures.push("last active owner protection migration is missing");
} else {
  const lastOwnerMigration = readFileSync(lastOwnerProtectionMigrationUrl, "utf8");
  for (const requiredRule of [
    "check_last_active_owner",
    "before update or delete on public.organization_memberships",
    "Cannot remove the last active owner of an organization",
    "from public, anon"
  ]) {
    if (!lastOwnerMigration.includes(requiredRule)) {
      failures.push(`last owner protection rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(ownershipTransferMigrationUrl)) {
  failures.push("ownership transfer migration is missing");
} else {
  const transferMigration = readFileSync(ownershipTransferMigrationUrl, "utf8");
  for (const requiredRule of [
    "transfer_organization_ownership",
    "Only an active owner can transfer ownership",
    "Target user is not an active member of this organization",
    "from public, anon"
  ]) {
    if (!transferMigration.includes(requiredRule)) {
      failures.push(`ownership transfer rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(swapManagerTargetOverlapMigrationUrl)) {
  failures.push("swap transition manager/target overlap fix migration is missing");
} else {
  const overlapFixMigration = readFileSync(swapManagerTargetOverlapMigrationUrl, "utf8");
  for (const requiredRule of [
    "old.status = 'pending_employee' and current_user_id = old.target_user_id",
    "old.status = 'pending_manager' and caller_is_manager",
    "Target employee may accept or reject a pending request only",
    "Manager may approve or reject pending manager requests only"
  ]) {
    if (!overlapFixMigration.includes(requiredRule)) {
      failures.push(`swap transition overlap fix rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(unpublishScheduleMigrationUrl)) {
  failures.push("unpublish schedule period migration is missing");
} else {
  const unpublishMigration = readFileSync(unpublishScheduleMigrationUrl, "utf8");
  for (const requiredRule of [
    "unpublish_schedule_period",
    "Manager permission required",
    "Only a published schedule can be unpublished",
    "from public, anon"
  ]) {
    if (!unpublishMigration.includes(requiredRule)) {
      failures.push(`unpublish schedule period rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(releaseFutureShiftsMigrationUrl)) {
  failures.push("release future shifts on suspension migration is missing");
} else {
  const releaseFutureShiftsMigration = readFileSync(releaseFutureShiftsMigrationUrl, "utf8");
  for (const requiredRule of [
    "release_future_shifts_on_suspension",
    "new.status = 'suspended' and old.status is distinct from 'suspended'",
    "s.shift_date >= current_date",
    "from public, anon"
  ]) {
    if (!releaseFutureShiftsMigration.includes(requiredRule)) {
      failures.push(`release future shifts on suspension rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(invitationResendCooldownMigrationUrl)) {
  failures.push("invitation resend cooldown migration is missing");
} else {
  const resendCooldownMigration = readFileSync(invitationResendCooldownMigrationUrl, "utf8");
  for (const requiredRule of ["last_notified_at", "organization_invitations"]) {
    if (!resendCooldownMigration.includes(requiredRule)) {
      failures.push(`invitation resend cooldown rule is missing: ${requiredRule}`);
    }
  }
}

const notifyRouteSource = readFileSync(new URL("../app/api/invitations/notify/route.ts", import.meta.url), "utf8");
for (const requiredRule of ["RESEND_COOLDOWN_MS", "last_notified_at"]) {
  if (!notifyRouteSource.includes(requiredRule)) {
    failures.push(`invitation notify route is missing resend-cooldown enforcement: ${requiredRule}`);
  }
}

if (!existsSync(duplicateSchedulePeriodMigrationUrl)) {
  failures.push("duplicate schedule period migration is missing");
} else {
  const duplicatePeriodMigration = readFileSync(duplicateSchedulePeriodMigrationUrl, "utf8");
  for (const requiredRule of [
    "duplicate_schedule_period",
    "dense_rank() over (partition by extract(dow from s.shift_date)",
    "Target period already has shifts",
    "m.status = 'active'"
  ]) {
    if (!duplicatePeriodMigration.includes(requiredRule)) {
      failures.push(`duplicate schedule period rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(leaveRequestsMigrationUrl)) {
  failures.push("leave requests migration is missing");
} else {
  const leaveRequestsMigration = readFileSync(leaveRequestsMigrationUrl, "utf8");
  for (const requiredRule of [
    "alter table public.leave_requests enable row level security",
    "leave_requests_select_allowed",
    "leave_requests_insert_self",
    "leave_requests_delete_self",
    "audit_leave_requests_write"
  ]) {
    if (!leaveRequestsMigration.includes(requiredRule)) {
      failures.push(`leave requests rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(weeklyHoursLimitMigrationUrl)) {
  failures.push("weekly hours limit migration is missing");
} else {
  const weeklyHoursLimitMigration = readFileSync(weeklyHoursLimitMigrationUrl, "utf8");
  for (const requiredRule of ["weekly_hours_limit", "weekly_hours_limit is null or weekly_hours_limit > 0"]) {
    if (!weeklyHoursLimitMigration.includes(requiredRule)) {
      failures.push(`weekly hours limit rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(minRestHoursMigrationUrl)) {
  failures.push("min rest hours migration is missing");
} else {
  const minRestHoursMigration = readFileSync(minRestHoursMigrationUrl, "utf8");
  for (const requiredRule of ["min_rest_hours", "min_rest_hours is null or min_rest_hours > 0"]) {
    if (!minRestHoursMigration.includes(requiredRule)) {
      failures.push(`min rest hours rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(cancelShiftsForDayMigrationUrl)) {
  failures.push("cancel shifts for day migration is missing");
} else {
  const cancelShiftsForDayMigration = readFileSync(cancelShiftsForDayMigrationUrl, "utf8");
  for (const requiredRule of ["cancel_shifts_for_day", "status <> 'cancelled'", "delete from public.shift_assignments"]) {
    if (!cancelShiftsForDayMigration.includes(requiredRule)) {
      failures.push(`cancel shifts for day rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(fixDeadExpiredInvitationUpdateMigrationUrl)) {
  failures.push("fix dead expired-invitation update migration is missing");
} else {
  const fixDeadExpiredInvitationMigration = readFileSync(fixDeadExpiredInvitationUpdateMigrationUrl, "utf8");
  for (const requiredRule of ["accept_organization_invitation", "raise exception 'Invitation expired'"]) {
    if (!fixDeadExpiredInvitationMigration.includes(requiredRule)) {
      failures.push(`fix dead expired-invitation update rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(secureInvitationRevocationMigrationUrl)) {
  failures.push("secure invitation revocation migration is missing");
} else {
  const invitationRevocationMigration = readFileSync(secureInvitationRevocationMigrationUrl, "utf8");
  for (const requiredRule of [
    "drop policy if exists invitations_update_manager",
    "revoke_organization_invitation",
    "Manager permission required",
    "Only a pending invitation can be revoked",
    "for update"
  ]) {
    if (!invitationRevocationMigration.includes(requiredRule)) {
      failures.push(`secure invitation revocation rule is missing: ${requiredRule}`);
    }
  }
}

const employeesClientSource = readFileSync(
  new URL("../app/workspace/employees/employees-client.tsx", import.meta.url),
  "utf8"
);
if (!employeesClientSource.includes('rpc("revoke_organization_invitation"')) {
  failures.push("employee management UI does not use the secured invitation revocation RPC");
}

const scheduleBuilderSource = readFileSync(
  new URL("../app/workspace/schedule-builder/schedule-builder-client.tsx", import.meta.url),
  "utf8"
);
for (const crossPeriodRule of [
  "const activeShifts = shifts.filter",
  "return activeShifts\n      .filter",
  "for (const other of activeShifts)"
]) {
  if (!scheduleBuilderSource.includes(crossPeriodRule)) {
    failures.push(`cross-period scheduling check is missing: ${crossPeriodRule}`);
  }
}
if (employeesClientSource.includes('from("organization_invitations").update')) {
  failures.push("employee management UI still updates invitation rows directly");
}

if (!existsSync(demoSalesEnvironmentMigrationUrl)) {
  failures.push("demo sales environment migration is missing");
} else {
  const demoSalesEnvironmentMigration = readFileSync(demoSalesEnvironmentMigrationUrl, "utf8");
  for (const requiredRule of [
    "add column if not exists is_demo",
    "if not org.is_demo then",
    "set local session_replication_role = replica",
    "grant execute on function public.reset_demo_environment(uuid) to service_role",
    "revoke all on function public.reset_demo_environment(uuid) from public, anon, authenticated"
  ]) {
    if (!demoSalesEnvironmentMigration.includes(requiredRule)) {
      failures.push(`demo sales environment rule is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(protectDemoOrganizationsMigrationUrl)) {
  failures.push("demo organization deletion protection migration is missing");
} else {
  const protectDemoOrganizationsMigration = readFileSync(protectDemoOrganizationsMigrationUrl, "utf8");
  for (const requiredRule of [
    "prevent_demo_organization_deletion",
    "if old.is_demo then",
    "before delete on public.organizations",
    "revoke all on function public.prevent_demo_organization_deletion() from public, anon, authenticated"
  ]) {
    if (!protectDemoOrganizationsMigration.includes(requiredRule)) {
      failures.push(`demo organization deletion protection is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(organizationDeletionCascadeMigrationUrl)) {
  failures.push("organization deletion cascade fix migration is missing");
} else {
  const organizationDeletionCascadeMigration = readFileSync(organizationDeletionCascadeMigrationUrl, "utf8");
  for (const requiredRule of [
    "create or replace function private.write_management_audit_log()",
    "not exists (",
    "from public.organizations organization_row",
    "drop constraint if exists leave_requests_organization_id_fkey",
    "on delete cascade",
    "revoke all on function private.write_management_audit_log() from public, anon, authenticated"
  ]) {
    if (!organizationDeletionCascadeMigration.includes(requiredRule)) {
      failures.push(`organization deletion cascade fix is missing: ${requiredRule}`);
    }
  }
}

if (!existsSync(departmentMembershipsActiveOnlyMigrationUrl)) {
  failures.push("department_memberships suspended-member SELECT fix migration is missing");
} else {
  const departmentMembershipsActiveOnlyMigration = readFileSync(departmentMembershipsActiveOnlyMigrationUrl, "utf8");
  if (!departmentMembershipsActiveOnlyMigration.includes("alter policy department_memberships_select_scoped")) {
    failures.push("department_memberships_select_scoped policy fix is missing");
  }
  if (!departmentMembershipsActiveOnlyMigration.includes("own_membership.status = 'active'")) {
    failures.push("department_memberships_select_scoped must require an active membership -- a suspended employee should not be able to read their own (now-stale) department assignment");
  }
}

if (!existsSync(supportTicketResponseMetricsMigrationUrl)) {
  failures.push("support ticket response-metrics migration is missing");
} else {
  const supportMetricsMigration = readFileSync(supportTicketResponseMetricsMigrationUrl, "utf8");
  for (const requiredRule of [
    "add column first_responded_at",
    "add column reopened_count",
    "old.status = 'open' and new.status <> 'open' and old.first_responded_at is null",
    "new.reopened_count := old.reopened_count + 1"
  ]) {
    if (!supportMetricsMigration.includes(requiredRule)) {
      failures.push(`support ticket response-metrics rule is missing: ${requiredRule}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Validated ${tenantTables.length + 2} RLS-protected ShiftPilot tables with authorization, department-scoped access, workflow integrity, privacy, atomic operations, audit, deduplicated notification, scheduling-overlap, last-owner protection, ownership transfer, manager/target swap-transition protection, schedule unpublishing, automatic future-shift release on suspension, invitation resend rate-limiting, previous-month schedule duplication, self-service leave requests, per-employee weekly hour limits, minimum rest time between shifts, bulk shift cancellation by day, and correct expired-invitation handling, a resettable and deletion-protected demo-sales environment, safe tenant-deletion cascades, concurrent-invitation race protection, active-only department-membership visibility, and support-ticket first-response/reopen tracking.`
);
