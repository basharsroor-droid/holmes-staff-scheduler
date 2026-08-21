// Creates isolated, short-lived production fixtures, runs the authenticated
// workspace suite, and removes every tenant/user in a finally block. No fixed
// password is stored or printed and no real/demo tenant is touched.

import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SECRET_KEY");
if (!supabaseUrl.includes("forstsmvakpsreffdiwb")) {
  throw new Error("Authenticated production E2E must target the ShiftPilot production project.");
}

const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const password = `${randomBytes(18).toString("base64url")}Aa9!`;
const createdUserIds = [];
const createdOrganizationIds = [];

async function createUser(label, firstName, lastName) {
  const email = `qa-${label}-${suffix}@shiftpilothq.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Could not create ${label} user: ${error?.message}`);
  createdUserIds.push(data.user.id);
  const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, first_name: firstName, last_name: lastName });
  if (profileError) throw new Error(`Could not create ${label} profile: ${profileError.message}`);
  return { id: data.user.id, email, password };
}

async function createOrganization(name, slug) {
  const { data, error } = await admin.from("organizations").insert({ name, slug }).select("id").single();
  if (error) throw new Error(`Could not create organization: ${error.message}`);
  createdOrganizationIds.push(data.id);
  const { data: branch, error: branchError } = await admin.from("branches")
    .insert({ organization_id: data.id, name: "סניף QA" }).select("id").single();
  if (branchError) throw new Error(`Could not create branch: ${branchError.message}`);
  return { id: data.id, branchId: branch.id, name };
}

async function createDepartment(organizationId, branchId, name) {
  const { data, error } = await admin.from("departments")
    .insert({ organization_id: organizationId, branch_id: branchId, name })
    .select("id").single();
  if (error) throw new Error(`Could not create department: ${error.message}`);
  return data.id;
}

async function createMembership({ organizationId, branchId, departmentId, userId, role, accessScope }) {
  const { data, error } = await admin.from("organization_memberships").insert({
    organization_id: organizationId,
    branch_id: branchId,
    user_id: userId,
    role,
    status: "active",
    access_scope: accessScope
  }).select("id").single();
  if (error) throw new Error(`Could not create ${role} membership: ${error.message}`);
  if (departmentId) {
    const { error: departmentError } = await admin.from("department_memberships").insert({
      organization_id: organizationId,
      branch_id: branchId,
      department_id: departmentId,
      membership_id: data.id,
      is_primary: true
    });
    if (departmentError) throw new Error(`Could not scope ${role} membership: ${departmentError.message}`);
  }
}

function runPlaywright(env) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["playwright", "test", "-c", "playwright.production.config.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Production Playwright exited with code ${code}`)));
  });
}

async function cleanup() {
  const failures = [];
  for (const organizationId of createdOrganizationIds.reverse()) {
    const { error } = await admin.from("organizations").delete().eq("id", organizationId);
    if (error) failures.push(`organization ${organizationId}: ${error.message}`);
  }
  for (const userId of createdUserIds.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) failures.push(`user ${userId}: ${error.message}`);
  }
  if (failures.length) throw new Error(`Fixture cleanup failed: ${failures.join("; ")}`);
}

async function main() {
  let testError;
  try {
    const firstOrg = await createOrganization(`QA ראשי ${suffix}`, `qa-primary-${suffix}`);
    const secondOrg = await createOrganization(`QA מבודד ${suffix}`, `qa-isolated-${suffix}`);
    const allowedDepartment = `מחלקת QA מורשית ${suffix}`;
    const forbiddenDepartment = `מחלקת QA חסומה ${suffix}`;
    const allowedDepartmentId = await createDepartment(firstOrg.id, firstOrg.branchId, allowedDepartment);
    const forbiddenDepartmentId = await createDepartment(firstOrg.id, firstOrg.branchId, forbiddenDepartment);
    const secondDepartmentId = await createDepartment(secondOrg.id, secondOrg.branchId, `מחלקת QA שנייה ${suffix}`);

    const owner = await createUser("owner", "בעלים", "QA");
    const manager = await createUser("manager", "מנהל", "QA");
    const employee = await createUser("employee", "עובד", "מורשה QA");
    const forbiddenEmployee = await createUser("forbidden", "עובד", "חסום QA");
    const secondOwner = await createUser("second-owner", "בעלים", "מבודד QA");

    await createMembership({ organizationId: firstOrg.id, branchId: firstOrg.branchId, userId: owner.id, role: "owner", accessScope: "organization" });
    await createMembership({ organizationId: firstOrg.id, branchId: firstOrg.branchId, departmentId: allowedDepartmentId, userId: manager.id, role: "manager", accessScope: "department" });
    await createMembership({ organizationId: firstOrg.id, branchId: firstOrg.branchId, departmentId: allowedDepartmentId, userId: employee.id, role: "employee", accessScope: "department" });
    await createMembership({ organizationId: firstOrg.id, branchId: firstOrg.branchId, departmentId: forbiddenDepartmentId, userId: forbiddenEmployee.id, role: "employee", accessScope: "department" });
    await createMembership({ organizationId: secondOrg.id, branchId: secondOrg.branchId, departmentId: secondDepartmentId, userId: secondOwner.id, role: "owner", accessScope: "organization" });

    await runPlaywright({
      PLAYWRIGHT_PRODUCTION_BASE_URL: process.env.PLAYWRIGHT_PRODUCTION_BASE_URL ?? "https://www.shiftpilothq.com",
      E2E_OWNER_EMAIL: owner.email,
      E2E_OWNER_PASSWORD: owner.password,
      E2E_OWNER_ORGANIZATION: firstOrg.name,
      E2E_MANAGER_EMAIL: manager.email,
      E2E_MANAGER_PASSWORD: manager.password,
      E2E_MANAGER_ORGANIZATION: firstOrg.name,
      E2E_MANAGER_ALLOWED_DEPARTMENT: allowedDepartment,
      E2E_MANAGER_FORBIDDEN_DEPARTMENT: forbiddenDepartment,
      E2E_MANAGER_ALLOWED_EMPLOYEE: "עובד מורשה QA",
      E2E_MANAGER_FORBIDDEN_EMPLOYEE: "עובד חסום QA",
      E2E_EMPLOYEE_EMAIL: employee.email,
      E2E_EMPLOYEE_PASSWORD: employee.password,
      E2E_EMPLOYEE_ORGANIZATION: firstOrg.name,
      E2E_SECOND_TENANT_OWNER_EMAIL: secondOwner.email,
      E2E_SECOND_TENANT_OWNER_PASSWORD: secondOwner.password,
      E2E_SECOND_TENANT_OWNER_ORGANIZATION: secondOrg.name
    });
  } catch (error) {
    testError = error;
  }

  let cleanupError;
  try {
    await cleanup();
  } catch (error) {
    cleanupError = error;
  }
  if (testError && cleanupError) throw new AggregateError([testError, cleanupError], "Production E2E and cleanup both failed");
  if (cleanupError) throw cleanupError;
  if (testError) throw testError;
  console.log("Authenticated production E2E passed and all temporary fixtures were removed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
