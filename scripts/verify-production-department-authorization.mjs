import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  { auth: { persistSession: false } }
);

const email = required("E2E_MANAGER_EMAIL");
const password = required("E2E_MANAGER_PASSWORD");
const organizationId = required("E2E_MANAGER_ORGANIZATION_ID");
const allowedDepartmentId = required("E2E_MANAGER_ALLOWED_DEPARTMENT_ID");
const forbiddenDepartmentId = required("E2E_MANAGER_FORBIDDEN_DEPARTMENT_ID");
const forbiddenBranchId = required("E2E_MANAGER_FORBIDDEN_BRANCH_ID");

const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) throw signInError;

async function rows(table, columns = "*") {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("organization_id", organizationId);
  if (error) throw error;
  return data ?? [];
}

const departments = await rows("departments", "id");
if (!departments.some(({ id }) => id === allowedDepartmentId)) {
  throw new Error("Manager cannot read the assigned department");
}
if (departments.some(({ id }) => id === forbiddenDepartmentId)) {
  throw new Error("Manager can read a forbidden department");
}

const branches = await rows("branches", "id");
if (branches.some(({ id }) => id === forbiddenBranchId)) {
  throw new Error("Manager can read a forbidden branch");
}

const memberships = await rows("organization_memberships", "id, role, user_id");
if (memberships.some(({ role }) => role === "owner" || role === "admin")) {
  throw new Error("Manager can read an owner/admin membership");
}

const profiles = await supabase.from("profiles").select("id");
if (profiles.error) throw profiles.error;
const visibleMembershipUsers = new Set(memberships.map(({ user_id }) => user_id));
if ((profiles.data ?? []).some(({ id }) => !visibleMembershipUsers.has(id))) {
  throw new Error("Manager can read an out-of-scope profile");
}

const schedulePeriods = await rows("schedule_periods", "id, department_id");
if (schedulePeriods.some(({ department_id }) => department_id !== allowedDepartmentId)) {
  throw new Error("Manager can read a schedule from a forbidden department");
}

const { error: inviteError } = await supabase.rpc("create_organization_invitation", {
  target_organization_id: organizationId,
  target_branch_id: forbiddenBranchId,
  target_email: `authorization-probe-${Date.now()}@example.invalid`,
  target_first_name: "Authorization",
  target_last_name: "Probe",
  target_role: "employee"
});
if (!inviteError?.message.includes("Insufficient permission for this branch")) {
  throw new Error("Forbidden-branch invitation was not rejected by the RPC");
}

await supabase.auth.signOut();
console.log("Production department authorization checks passed.");
