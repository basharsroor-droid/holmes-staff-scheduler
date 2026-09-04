import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const expectedHost = "ctibuhkkbmyzawjhwujn.supabase.co";
const url = process.env.STAGING_SUPABASE_URL;
const key = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.STAGING_SUPABASE_SECRET_KEY;
const fixturePath = process.env.STAGING_E2E_FIXTURE_PATH ?? ".staging-e2e-fixture.json";

if (!url || !key || !secret) throw new Error("Staging Supabase URL, publishable key and secret key are required");
if (new URL(url).hostname !== expectedHost || url.includes("forstsmvakpsreffdiwb")) throw new Error("Refusing to run mutation checks outside ShiftPilot Staging");

const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8"));
const makeClient = () => createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

async function login(credentials) {
  const client = makeClient();
  const { error } = await client.auth.signInWithPassword(credentials);
  if (error) throw new Error(`login failed for ${credentials.email}: ${error.message}`);
  return client;
}

async function must(resultPromise, label) {
  const result = await resultPromise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

const employee = await login(fixture.credentials.employee);
const manager = await login(fixture.credentials.manager);

// Marketplace: employee requests an eligible published open shift.
const request = await must(employee.rpc("request_open_shift", {
  target_shift_id: fixture.marketplaceShiftId,
  request_note: "Staging critical E2E"
}), "request open shift");

const requestId = Array.isArray(request) ? request[0]?.id : request?.id;
if (!requestId) {
  const row = await must(employee.from("open_shift_requests").select("id").eq("shift_id", fixture.marketplaceShiftId).eq("user_id", fixture.employeeId).single(), "read marketplace request");
  if (!row?.id) throw new Error("Marketplace request was not created");
}
const resolvedRequestId = requestId ?? (await must(employee.from("open_shift_requests").select("id").eq("shift_id", fixture.marketplaceShiftId).eq("user_id", fixture.employeeId).single(), "resolve marketplace request")).id;

await must(manager.rpc("decide_open_shift_request", {
  target_request_id: resolvedRequestId,
  decision: "approved",
  decision_note: "Approved by staging E2E"
}), "approve marketplace request");

const assignment = await must(admin.from("shift_assignments").select("id,user_id").eq("shift_id", fixture.marketplaceShiftId).eq("user_id", fixture.employeeId).maybeSingle(), "verify marketplace assignment");
if (!assignment) throw new Error("Marketplace approval did not create the assignment");

// Time Off: manager approves request, then DB guardrail must block assignment on that date.
await must(manager.rpc("decide_leave_request", {
  target_request_id: fixture.leaveRequestId,
  decision: "approved",
  decision_note: "Approved by staging E2E"
}), "approve time off");

const blocked = await admin.from("shift_assignments").insert({
  organization_id: fixture.organizationId,
  shift_id: fixture.leaveShiftId,
  user_id: fixture.employeeId,
  assigned_by: fixture.managerId
});
if (!blocked.error || !blocked.error.message.includes("approved time off")) {
  throw new Error(`Expected approved Time Off assignment to be blocked, got: ${blocked.error?.message ?? "no error"}`);
}

// Cadence: staging fixture is weekly and the column must reject unsupported values.
const cadence = await must(admin.from("organizations").select("schedule_cadence").eq("id", fixture.organizationId).single(), "read schedule cadence");
if (cadence.schedule_cadence !== "weekly") throw new Error(`Expected weekly cadence, got ${cadence.schedule_cadence}`);
const invalidCadence = await admin.from("organizations").update({ schedule_cadence: "hourly" }).eq("id", fixture.organizationId);
if (!invalidCadence.error) throw new Error("Invalid schedule cadence unexpectedly succeeded");

console.log("Staging critical mutation checks passed: Marketplace approval, Time Off blocking, cadence guardrail");
