// One-time (idempotent) setup for the dedicated sales-demo tenant --
// "פיט־זון", a fictional two-branch gym chain, unrelated to any real
// customer. Creates the login accounts, org/branch/department structure,
// and shift templates, then calls reset_demo_environment() (see the
// 20260816103122_demo_sales_environment.sql migration) to populate the
// actual schedule data.
//
// Safe to re-run: every step checks for an existing row by a stable key
// (email, slug, name) before creating anything, so running this twice
// does not create duplicates or new accounts with different passwords.
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY (service_role), plus
// DEMO_OWNER_PASSWORD, DEMO_MANAGER_PASSWORD and DEMO_EMPLOYEE_PASSWORD. Keep
// those passwords in the deployment secret store; they are never committed.
//
// Usage: node scripts/seed-demo-environment.mjs

import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false }
});

const ORG_SLUG = "fitzone-demo";
const ORG_NAME = "פיט־זון";

// Dedicated, externally-managed demo credentials. The email addresses are
// public aliases, but the passwords live only in the deployment secret store.
//
// Access model, deliberately distinct per account so the demo actually
// shows off department-scoped permissions rather than having every login
// see the same thing:
//   - owner:    access_scope "organization" -> sees every branch and every
//               department. Represents the business owner (or, equally, a
//               branch/site manager -- the schema gives both the same
//               "sees everything" scope).
//   - manager:  access_scope "department", linked to exactly ONE
//               department (reception). Represents a department head, who
//               must NOT see other departments' schedules/staff.
//   - employee: access_scope "department", linked to that same one
//               department -- ordinary staff-level access.
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
  const { data: existing } = await supabase.from("organizations").select("id").eq("slug", ORG_SLUG).maybeSingle();
  if (existing) {
    console.log(`  organization already exists (${existing.id})`);
    // Make sure is_demo is set even if the row predates the migration.
    await supabase.from("organizations").update({ is_demo: true }).eq("id", existing.id);
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
  const { data: existing } = await supabase
    .from("branches")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("branches")
    .insert({ organization_id: organizationId, name })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create branch ${name}: ${error.message}`);
  return data.id;
}

async function ensureDepartment(organizationId, branchId, name) {
  const { data: existing } = await supabase
    .from("departments")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("branch_id", branchId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("departments")
    .insert({ organization_id: organizationId, branch_id: branchId, name })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create department ${name}: ${error.message}`);
  return data.id;
}

async function ensureTemplate(organizationId, branchId, departmentId, name, shiftType, startTime, endTime, requiredEmployees) {
  const { data: existing } = await supabase
    .from("shift_templates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("department_id", departmentId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("shift_templates")
    .insert({
      organization_id: organizationId,
      branch_id: branchId,
      department_id: departmentId,
      name,
      shift_type: shiftType,
      start_time: startTime,
      end_time: endTime,
      required_employees: requiredEmployees
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create shift template ${name}: ${error.message}`);
  return data.id;
}

async function ensureMembership(organizationId, branchId, userId, account) {
  const { data: existing } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("organization_memberships")
    .insert({
      organization_id: organizationId,
      branch_id: branchId,
      user_id: userId,
      role: account.role,
      status: "active",
      access_scope: account.accessScope
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create membership for ${account.email}: ${error.message}`);
  return data.id;
}

async function ensureDepartmentMembership(organizationId, branchId, departmentId, membershipId, isPrimary) {
  const { data: existing } = await supabase
    .from("department_memberships")
    .select("membership_id")
    .eq("department_id", departmentId)
    .eq("membership_id", membershipId)
    .maybeSingle();
  if (existing) return;
  const { error } = await supabase
    .from("department_memberships")
    .insert({ organization_id: organizationId, branch_id: branchId, department_id: departmentId, membership_id: membershipId, is_primary: isPrimary });
  if (error) throw new Error(`Failed to link department membership: ${error.message}`);
}

// Convergent, not just additive: removes any department_memberships for this
// membership that are NOT in the desired set. This matters specifically
// because a previous version of this script over-granted the demo manager
// access to every department in the branch (see below) -- without this
// pruning step, re-running the corrected script would add the right rows
// but leave the wrong one in place too.
async function syncDepartmentMemberships(organizationId, branchId, membershipId, desired) {
  for (const entry of desired) {
    await ensureDepartmentMembership(organizationId, branchId, entry.departmentId, membershipId, entry.isPrimary);
  }
  const desiredIds = new Set(desired.map((entry) => entry.departmentId));
  const { data: current, error: fetchError } = await supabase
    .from("department_memberships")
    .select("department_id")
    .eq("membership_id", membershipId);
  if (fetchError) throw new Error(`Failed to read department memberships: ${fetchError.message}`);
  const stale = (current ?? []).filter((row) => !desiredIds.has(row.department_id));
  for (const row of stale) {
    const { error: deleteError } = await supabase
      .from("department_memberships")
      .delete()
      .eq("membership_id", membershipId)
      .eq("department_id", row.department_id);
    if (deleteError) throw new Error(`Failed to remove stale department membership: ${deleteError.message}`);
    console.log(`  removed stale department membership (department ${row.department_id})`);
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
    const membershipId = await ensureMembership(organizationId, branchTlv, userId, account);
    membershipByKey[account.key] = membershipId;
  }

  console.log("Ensuring department assignments...");
  // Manager is a department head: reception ONLY, never the trainers
  // department too -- see the ACCOUNTS comment above. syncDepartmentMemberships
  // also removes any extra department link left over from an earlier run.
  await syncDepartmentMemberships(organizationId, branchTlv, membershipByKey.manager, [
    { departmentId: deptReception, isPrimary: true }
  ]);
  await syncDepartmentMemberships(organizationId, branchTlv, membershipByKey.employee, [
    { departmentId: deptReception, isPrimary: true }
  ]);

  console.log("Resetting operational data to baseline (schedule, shifts, availability, swap request, ticket)...");
  const { error: resetError } = await supabase.rpc("reset_demo_environment", { target_organization_id: organizationId });
  if (resetError) throw new Error(`reset_demo_environment failed: ${resetError.message}`);

  console.log("\nDone. Demo login credentials:");
  for (const account of ACCOUNTS) {
    console.log(`  ${account.role.padEnd(8)} ${account.email}  /  ${account.password}`);
  }
  console.log(`\nOrganization ID: ${organizationId} (is_demo=true)`);
  console.log("To reset the schedule back to this baseline at any time, run:");
  console.log(`  select reset_demo_environment('${organizationId}');`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
