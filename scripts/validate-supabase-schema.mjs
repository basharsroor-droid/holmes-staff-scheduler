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
const availabilityHardeningMigrationUrl = new URL(
  "../supabase/migrations/20260807181000_harden_availability_windows.sql",
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

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Validated ${tenantTables.length} RLS-protected ShiftPilot tables with privileged auth, shift-swap, and availability-window hardening.`
);
