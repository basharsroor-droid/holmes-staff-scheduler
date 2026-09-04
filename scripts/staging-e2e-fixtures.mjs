import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const expectedHost = "ctibuhkkbmyzawjhwujn.supabase.co";
const url = process.env.STAGING_SUPABASE_URL;
const secret = process.env.STAGING_SUPABASE_SECRET_KEY;
const action = process.argv[2] ?? "seed";
const fixturePath = process.env.STAGING_E2E_FIXTURE_PATH ?? ".staging-e2e-fixture.json";

if (!url || !secret) throw new Error("STAGING_SUPABASE_URL and STAGING_SUPABASE_SECRET_KEY are required");
const parsed = new URL(url);
if (parsed.hostname !== expectedHost) throw new Error(`Refusing staging fixture operation for unexpected Supabase host: ${parsed.hostname}`);
if (url.includes("forstsmvakpsreffdiwb")) throw new Error("Refusing to operate on Production");

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

async function must(promise, label) {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function cleanupFixture(fixture) {
  if (fixture?.organizationId) {
    const { error } = await admin.from("organizations").delete().eq("id", fixture.organizationId);
    if (error) console.warn(`organization cleanup: ${error.message}`);
  }
  for (const userId of fixture?.userIds ?? []) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.warn(`user cleanup ${userId}: ${error.message}`);
  }
}

if (action === "cleanup") {
  const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8"));
  await cleanupFixture(fixture);
  await fs.rm(fixturePath, { force: true });
  console.log("Staging E2E fixture cleaned");
  process.exit(0);
}
if (action !== "seed") throw new Error(`Unknown action: ${action}`);

const runId = process.env.GITHUB_RUN_ID ?? `${Date.now()}`;
const password = `ShiftPilot-E2E-${runId}-A9!`;
const ownerEmail = `shiftpilot-e2e-owner-${runId}@example.com`;
const managerEmail = `shiftpilot-e2e-manager-${runId}@example.com`;
const employeeEmail = `shiftpilot-e2e-employee-${runId}@example.com`;
const createdUsers = [];
let organizationId = null;

try {
  const createUser = async (email, firstName, lastName) => {
    const data = await must(admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName } }), `create user ${email}`);
    createdUsers.push(data.user.id);
    await must(admin.from("profiles").upsert({ id: data.user.id, first_name: firstName, last_name: lastName }), `profile ${email}`);
    return data.user.id;
  };

  const ownerId = await createUser(ownerEmail, "Pilot", "Owner");
  const managerId = await createUser(managerEmail, "Pilot", "Manager");
  const employeeId = await createUser(employeeEmail, "Pilot", "Employee");

  const organization = await must(admin.from("organizations").insert({ name: `ShiftPilot E2E ${runId}`, slug: `shiftpilot-e2e-${runId}`, schedule_cadence: "weekly", min_rest_hours: 8 }).select("id").single(), "create organization");
  organizationId = organization.id;
  const branch = await must(admin.from("branches").insert({ organization_id: organizationId, name: "E2E Branch" }).select("id").single(), "create branch");
  const department = await must(admin.from("departments").insert({ organization_id: organizationId, branch_id: branch.id, name: "E2E Operations" }).select("id").single(), "create department");

  const memberships = await must(admin.from("organization_memberships").insert([
    { organization_id: organizationId, branch_id: branch.id, user_id: ownerId, role: "owner", status: "active", access_scope: "organization", joined_at: new Date().toISOString() },
    { organization_id: organizationId, branch_id: branch.id, user_id: managerId, role: "manager", status: "active", access_scope: "department", joined_at: new Date().toISOString() },
    { organization_id: organizationId, branch_id: branch.id, user_id: employeeId, role: "employee", status: "active", access_scope: "self", joined_at: new Date().toISOString(), weekly_hours_limit: 40 }
  ]).select("id,user_id"), "create memberships");

  await must(admin.from("department_memberships").insert(memberships.map((membership) => ({ department_id: department.id, membership_id: membership.id, organization_id: organizationId, branch_id: branch.id, is_primary: true }))), "create department memberships");

  const year = new Date().getUTCFullYear() + 1;
  const period = await must(admin.from("schedule_periods").insert({ organization_id: organizationId, branch_id: branch.id, department_id: department.id, year, month: 1, status: "published", submission_opens_at: `${year}-01-01T00:00:00Z`, submission_closes_at: `${year}-01-07T00:00:00Z`, published_at: new Date().toISOString(), created_by: ownerId }).select("id").single(), "create schedule period");
  const template = await must(admin.from("shift_templates").insert({ organization_id: organizationId, branch_id: branch.id, department_id: department.id, name: "E2E Morning", shift_type: "opening", start_time: "08:00", end_time: "16:00", required_employees: 1 }).select("id").single(), "create shift template");

  const shifts = await must(admin.from("shifts").insert([
    { organization_id: organizationId, schedule_period_id: period.id, shift_template_id: template.id, shift_date: `${year}-01-10`, name: "E2E Marketplace", start_time: "08:00", end_time: "16:00", required_employees: 1, status: "published", open_for_requests: true, opened_at: new Date().toISOString(), opened_by: managerId },
    { organization_id: organizationId, schedule_period_id: period.id, shift_template_id: template.id, shift_date: `${year}-01-20`, name: "E2E Time Off Block", start_time: "08:00", end_time: "16:00", required_employees: 1, status: "published" }
  ]).select("id,shift_date"), "create shifts");
  const marketplaceShift = shifts.find((shift) => shift.shift_date === `${year}-01-10`);
  const leaveShift = shifts.find((shift) => shift.shift_date === `${year}-01-20`);

  const leave = await must(admin.from("leave_requests").insert({ organization_id: organizationId, user_id: employeeId, leave_type: "vacation", start_date: `${year}-01-20`, end_date: `${year}-01-20`, note: "E2E Time Off", status: "pending" }).select("id").single(), "create pending leave");

  const fixture = { stagingHost: expectedHost, organizationId, branchId: branch.id, departmentId: department.id, periodId: period.id, marketplaceShiftId: marketplaceShift.id, leaveShiftId: leaveShift.id, leaveRequestId: leave.id, employeeId, managerId, ownerId, userIds: createdUsers, credentials: { owner: { email: ownerEmail, password }, manager: { email: managerEmail, password }, employee: { email: employeeEmail, password } } };
  await fs.writeFile(fixturePath, JSON.stringify(fixture, null, 2));
  console.log(`Staging E2E fixture ready at ${fixturePath}`);
} catch (error) {
  await cleanupFixture({ organizationId, userIds: createdUsers });
  throw error;
}
