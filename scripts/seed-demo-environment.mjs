// Idempotent setup for the dedicated fictional sales-demo tenant.
// By default this only synchronizes the demo structure/accounts. Operational
// schedule data is reset only when --reset is passed explicitly.
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY (service_role), plus
// DEMO_OWNER_PASSWORD, DEMO_MANAGER_PASSWORD and DEMO_EMPLOYEE_PASSWORD.
//
// Usage:
//   node scripts/seed-demo-environment.mjs
//   node scripts/seed-demo-environment.mjs --reset

import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const shouldReset = process.argv.includes("--reset");
const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false }
});

const ORG_SLUG = "fitzone-demo";
const ORG_NAME = "פיט־זון";

const ACCOUNTS = [
  { key: "owner", email: "owner-demo@shiftpilothq.com", password: requireEnv("DEMO_OWNER_PASSWORD"), role: "owner", firstName: "מיכל", lastName: "בעלים", accessScope: "organization" },
  { key: "manager", email: "manager-demo@shiftpilothq.com", password: requireEnv("DEMO_MANAGER_PASSWORD"), role: "manager", firstName: "רון", lastName: "מנהל", accessScope: "department" },
  { key: "employee", email: "employee-demo@shiftpilothq.com", password: requireEnv("DEMO_EMPLOYEE_PASSWORD"), role: "employee", firstName: "דנה", lastName: "עובדת", accessScope: "department" }
];

async function ensureUser(account) {
  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = existing?.users.find((user) => user.email === account.email);
  if (found) {
    const { error } = await supabase.auth.admin.updateUserById(found.id, { password: account.password });
    if (error) throw new Error(`Failed to update demo password for ${account.email}: ${error.message}`);
    console.log(`  user ${account.email} already exists; password synchronized (${found.id})`);
    return found.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true
  });
  if (error) throw new Error(`Failed to create user ${account.email}: ${error.message}`);
  console.log(`  created user ${account.email} (${data.user.id})`);
  return data.user.id;
}

async function ensureProfile(userId, account) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, first_name: account.firstName, last_name: account.lastName }, { onConflict: "id" });
  if (error) throw new Error(`Failed to upsert profile for ${account.email}: ${error.message}`);
}

async function ensureOrganization() {
  const { data: existing, error: fetchError } = await supabase
    .from("organizations")
    .select("id,name,is_demo")
    .eq("slug", ORG_SLUG)
    .maybeSingle();
  if (fetchError) throw new Error(`Failed to read demo organization: ${fetchError.message}`);

  if (existing) {
    if (existing.is_demo !== true) {
      throw new Error(`Refusing to reuse organization ${existing.id}: slug ${ORG_SLUG} exists but is_demo is false`);
    }
    if (existing.name !== ORG_NAME) {
      throw new Error(`Refusing to reuse organization ${existing.id}: expected demo name ${ORG_NAME}`);
    }
    console.log(`  verified existing demo organization (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert({ name: ORG_NAME, slug: ORG_SLUG, is_demo: true })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create organization: ${error.message}`);
  console.log(`  created organization ${ORG_NAME} (${data.id})`);
  return data.id;
}

async function ensureBranch(organizationId, name) {
  const { data: existing } = await supabase.from("branches").select("id").eq("organization_id", organizationId).eq("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("branches").insert({ organization_id: organizationId, name }).select("id").single();
  if (error) throw new Error(`Failed to create branch ${name}: ${error.message}`);
  return data.id;
}

async function ensureDepartment(organizationId, branchId, name) {
  const { data: existing } = await supabase.from("departments").select("id").eq("organization_id", organizationId).eq("branch_id", branchId).eq("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("departments").insert({ organization_id: organizationId, branch_id: branchId, name }).select("id").single();
  if (error) throw new Error(`Failed to create department ${name}: ${error.message}`);
  return data.id;
}

async function ensureTemplate(organizationId, branchId, departmentId, name, shiftType, startTime, endTime, requiredEmployees) {
  const { data: existing } = await supabase.from("shift_templates").select("id").eq("organization_id", organizationId).eq("department_id", departmentId).eq("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("shift_templates").insert({
    organization_id: organizationId,
    branch_id: branchId,
    department_id: departmentId,
    name,
    shift_type: shiftType,
    start_time: startTime,
    end_time: endTime,
    required_employees: requiredEmployees
  }).select("id").single();
  if (error) throw new Error(`Failed to create shift template ${name}: ${error.message}`);
  return data.id;
}

async function ensureMembership(organizationId, branchId, userId, account) {
  const { data: existing } = await supabase.from("organization_memberships").select("id").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("organization_memberships").insert({
    organization_id: organizationId,
    branch_id: branchId,
    user_id: userId,
    role: account.role,
    status: "active",
    access_scope: account.accessScope
  }).select("id").single();
  if (error) throw new Error(`Failed to create membership for ${account.email}: ${error.message}`);
  return data.id;
}

async function ensureDepartmentMembership(organizationId, branchId, departmentId, membershipId, isPrimary) {
  const { data: existing } = await supabase.from("department_memberships").select("membership_id").eq("department_id", departmentId).eq("membership_id", membershipId).maybeSingle();
  if (existing) return;
  const { error } = await supabase.from("department_memberships").insert({ organization_id: organizationId, branch_id: branchId, department_id: departmentId, membership_id: membershipId, is_primary: isPrimary });
  if (error) throw new Error(`Failed to link department membership: ${error.message}`);
}

async function syncDepartmentMemberships(organizationId, branchId, membershipId, desired) {
  for (const entry of desired) await ensureDepartmentMembership(organizationId, branchId, entry.departmentId, membershipId, entry.isPrimary);
  const desiredIds = new Set(desired.map((entry) => entry.departmentId));
  const { data: current, error: fetchError } = await supabase.from("department_memberships").select("department_id").eq("membership_id", membershipId);
  if (fetchError) throw new Error(`Failed to read department memberships: ${fetchError.message}`);
  for (const row of (current ?? []).filter((entry) => !desiredIds.has(entry.department_id))) {
    const { error } = await supabase.from("department_memberships").delete().eq("membership_id", membershipId).eq("department_id", row.department_id);
    if (error) throw new Error(`Failed to remove stale department membership: ${error.message}`);
  }
}

async function main() {
  console.log("Ensuring organization...");
  const organizationId = await ensureOrganization();

  console.log("Ensuring branches...");
  const branchTlv = await ensureBranch(organizationId, "סניף תל אביב");
  const branchHaifa = await ensureBranch(organizationId, "סניף חיפה");

  console.log("Ensuring departments...");
  const deptReception = await ensureDepartment(organizationId, branchTlv, "קבלה ודלפק");
  const deptTrainers = await ensureDepartment(organizationId, branchTlv, "מאמנים אישיים");
  await ensureDepartment(organizationId, branchHaifa, "ניקיון ותחזוקה");

  console.log("Ensuring shift templates...");
  await ensureTemplate(organizationId, branchTlv, deptReception, "פתיחה", "opening", "06:00", "14:00", 1);
  await ensureTemplate(organizationId, branchTlv, deptReception, "סגירה", "closing", "14:00", "22:00", 1);
  await ensureTemplate(organizationId, branchTlv, deptTrainers, "אימונים", "custom", "08:00", "16:00", 1);

  console.log("Ensuring accounts...");
  const membershipByKey = {};
  for (const account of ACCOUNTS) {
    const userId = await ensureUser(account);
    await ensureProfile(userId, account);
    membershipByKey[account.key] = await ensureMembership(organizationId, branchTlv, userId, account);
  }

  console.log("Ensuring department assignments...");
  await syncDepartmentMemberships(organizationId, branchTlv, membershipByKey.manager, [{ departmentId: deptReception, isPrimary: true }]);
  await syncDepartmentMemberships(organizationId, branchTlv, membershipByKey.employee, [{ departmentId: deptReception, isPrimary: true }]);

  if (shouldReset) {
    console.log("Resetting demo operational data to baseline...");
    const { error } = await supabase.rpc("reset_demo_environment", { target_organization_id: organizationId });
    if (error) throw new Error(`reset_demo_environment failed: ${error.message}`);
  } else {
    console.log("Operational data not reset. Pass --reset explicitly to rebuild demo schedule data.");
  }

  console.log("\nDone. Demo accounts synchronized:");
  for (const account of ACCOUNTS) console.log(`  ${account.role.padEnd(8)} ${account.email}`);
  console.log(`\nOrganization ID: ${organizationId} (verified is_demo=true)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
