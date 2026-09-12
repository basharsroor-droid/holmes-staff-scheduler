import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

// Seeds, and later removes, a self-contained tenant on the STAGING Supabase
// branch for tests/staging/workspace-scheduling-flow.spec.ts -- the first
// end-to-end test that drives the real /workspace product rather than the
// legacy /demo routes. See docs/REMEDIATION_PLAN.md (D1).
//
// It deliberately seeds only the STARTING state: people, the org structure, one
// shift type, and an availability window that is open right now. Everything the
// product itself is supposed to do -- submit availability, generate and staff
// shifts, publish, request a swap, accept it, approve it -- is left for the
// browser test to do through the UI. Seeding any of that would be testing the
// seeder, not the product.
//
// The marketplace/time-off API checks keep their own fixture
// (scripts/staging-e2e-fixtures.mjs); the two need different starting states.

const expectedHost = "sqmstwwrdoenfumligmf.supabase.co";
const url = process.env.STAGING_SUPABASE_URL;
const secret = process.env.STAGING_SUPABASE_SECRET_KEY;
const action = process.argv[2] ?? "seed";
const fixturePath = process.env.STAGING_WORKSPACE_FIXTURE_PATH ?? ".staging-workspace-fixture.json";

if (!url || !secret) throw new Error("STAGING_SUPABASE_URL and STAGING_SUPABASE_SECRET_KEY are required");
const parsed = new URL(url);
if (parsed.hostname !== expectedHost) throw new Error(`Refusing staging fixture operation for unexpected Supabase host: ${parsed.hostname}`);
if (url.includes("forstsmvakpsreffdiwb")) throw new Error("Refusing to operate on Production");

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

function describeError(error) {
  const parts = [error.message || error.name || "unknown error"];
  if (error.status) parts.push(`status ${error.status}`);
  if (error.code) parts.push(`code ${error.code}`);
  return parts.join(", ");
}

async function must(promise, label) {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${describeError(result.error)}`);
  return result.data;
}

// Supabase auth on staging occasionally fails transiently: a network error or
// timeout that arrives with an empty message and no HTTP status. Retry those
// (and 5xx) a couple of times; a real rejection (4xx) still fails at once.
async function mustRetry(run, label, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    const result = await run();
    if (!result.error) return result.data;
    const retryable =
      !result.error.status || result.error.status >= 500 || result.error.name === "AuthRetryableFetchError";
    if (!retryable || attempt >= attempts)
      throw new Error(`${label}: ${describeError(result.error)}${attempt > 1 ? ` (after ${attempt} attempts)` : ""}`);
    console.warn(`${label}: ${describeError(result.error)} -- retrying (${attempt}/${attempts - 1})`);
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
}

// Returns every failure instead of only warning: a cleanup that leaves data
// behind must fail the job, or staging silently fills up with test tenants
// (it did, 2026-09-11, until the availability guards allowed cascade deletes).
async function cleanup(fixture) {
  const failures = [];
  // operational_events' FKs are ON DELETE SET NULL (production keeps anonymous
  // metrics after an account is deleted), so a run's events must go while they
  // still point at its tenant -- afterwards nothing links them to the run, and
  // every run left ~50 behind until a restore drill found 424 on 2026-09-11.
  const eventScope = [
    fixture?.organizationId && `organization_id.eq.${fixture.organizationId}`,
    ...(fixture?.userIds ?? []).map((userId) => `actor_user_id.eq.${userId}`)
  ].filter(Boolean);
  if (eventScope.length) {
    const { error } = await admin.from("operational_events").delete().or(eventScope.join(","));
    if (error) failures.push(`operational events cleanup: ${error.message}`);
  }
  if (fixture?.organizationId) {
    const { error } = await admin.from("organizations").delete().eq("id", fixture.organizationId);
    if (error) failures.push(`organization cleanup: ${error.message}`);
  }
  for (const userId of fixture?.userIds ?? []) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) failures.push(`user cleanup ${userId}: ${error.message}`);
  }
  for (const failure of failures) console.error(failure);
  return failures;
}

if (action === "cleanup") {
  let fixture = null;
  try {
    fixture = JSON.parse(await fs.readFile(fixturePath, "utf8"));
  } catch {
    console.log("No workspace fixture to clean up");
    process.exit(0);
  }
  const failures = await cleanup(fixture);
  if (failures.length) {
    console.error("Staging cleanup failed: test data was left behind (see above).");
    process.exit(1);
  }
  await fs.rm(fixturePath, { force: true });
  console.log("Staging workspace fixture cleaned");
  process.exit(0);
}
if (action !== "seed") throw new Error(`Unknown action: ${action}`);

const runId = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT ?? "1"}`
  : `${Date.now()}`;
const password = `ShiftPilot-E2E-${runId}-A9!`;
// These values are deliberately presentation-ready: the same isolated
// staging flow produces the public product-tour screenshots. Keep the data
// fictional and natural-looking so the captures explain the product instead
// of exposing test jargon such as "E2E".
const templateName = "משמרת בוקר";

// Next calendar month, so every generated shift lies in the future: the swap
// form only offers upcoming shifts.
const now = new Date();
const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
const year = target.getUTCFullYear();
const month = target.getUTCMonth() + 1;

const createdUsers = [];
let organizationId = null;

try {
  const createUser = async (key, firstName, lastName) => {
    const email = `sp-e2e-ws-${key}-${runId}@example.com`;
    const data = await mustRetry(() => admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName }
    }), `create user ${key}`);
    createdUsers.push(data.user.id);
    await must(admin.from("profiles").upsert({ id: data.user.id, first_name: firstName, last_name: lastName }), `profile ${key}`);
    return { email, password, userId: data.user.id, name: `${firstName} ${lastName}` };
  };

  const owner = await createUser("owner", "מיכל", "כהן");
  const alice = await createUser("alice", "נועה", "לוי");
  const bob = await createUser("bob", "עומר", "ישראלי");

  // min_rest_hours left unset on purpose: this test is about the flow, and a
  // rest warning would add an extra confirm() that is not what's under test.
  const organization = await must(admin.from("organizations")
    .insert({ name: "סטודיו פיט", slug: `sp-ws-e2e-${runId}`.toLowerCase(), schedule_cadence: "weekly" })
    .select("id").single(), "create organization");
  organizationId = organization.id;

  const branch = await must(admin.from("branches")
    .insert({ organization_id: organizationId, name: "סניף הכרמל" }).select("id").single(), "create branch");
  const department = await must(admin.from("departments")
    .insert({ organization_id: organizationId, branch_id: branch.id, name: "צוות קבלה" }).select("id").single(), "create department");
  // A second department with no shift types: the flow starts it from a ready
  // template (I1). The owner has organization scope, so no memberships needed.
  await must(admin.from("departments")
    .insert({ organization_id: organizationId, branch_id: branch.id, name: "צוות מסעדה" }), "create empty department");

  const joinedAt = new Date().toISOString();
  const memberships = await must(admin.from("organization_memberships").insert([
    { organization_id: organizationId, branch_id: branch.id, user_id: owner.userId, role: "owner", status: "active", access_scope: "organization", joined_at: joinedAt },
    { organization_id: organizationId, branch_id: branch.id, user_id: alice.userId, role: "employee", status: "active", access_scope: "self", joined_at: joinedAt },
    { organization_id: organizationId, branch_id: branch.id, user_id: bob.userId, role: "employee", status: "active", access_scope: "self", joined_at: joinedAt }
  ]).select("id,user_id"), "create memberships");

  // Only the two employees belong to the department, so the builder's worker
  // list is exactly Alice and Bob -- the owner manages but is not scheduled.
  await must(admin.from("department_memberships").insert(
    memberships
      .filter((membership) => membership.user_id !== owner.userId)
      .map((membership) => ({ department_id: department.id, membership_id: membership.id, organization_id: organizationId, branch_id: branch.id, is_primary: true }))
  ), "create department memberships");

  await must(admin.from("shift_templates").insert({
    organization_id: organizationId, branch_id: branch.id, department_id: department.id,
    name: templateName, shift_type: "opening", start_time: "08:00", end_time: "16:00", required_employees: 1
  }), "create shift template");

  const period = await must(admin.from("schedule_periods").insert({
    organization_id: organizationId, branch_id: branch.id, department_id: department.id,
    year, month, status: "collecting",
    submission_opens_at: new Date(Date.now() - 86_400_000).toISOString(),
    submission_closes_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    created_by: owner.userId
  }).select("id").single(), "create collecting schedule period");

  const fixture = {
    stagingHost: expectedHost, runId, organizationId, branchId: branch.id, departmentId: department.id,
    periodId: period.id, year, month, templateName,
    owner, alice, bob, userIds: createdUsers
  };
  await fs.writeFile(fixturePath, JSON.stringify(fixture, null, 2));
  console.log(`Staging workspace fixture ready at ${fixturePath} (${year}-${String(month).padStart(2, "0")})`);
} catch (error) {
  await cleanup({ organizationId, userIds: createdUsers });
  throw error;
}
