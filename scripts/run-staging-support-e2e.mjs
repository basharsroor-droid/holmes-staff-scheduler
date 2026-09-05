import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const expectedHost = "ctibuhkkbmyzawjhwujn.supabase.co";
const url = process.env.STAGING_SUPABASE_URL;
const key = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.STAGING_SUPABASE_SECRET_KEY;

if (!url || !key || !secret) throw new Error("Staging Supabase URL, publishable key and secret key are required");
const hostname = new URL(url).hostname;
if (hostname !== expectedHost || url.includes("forstsmvakpsreffdiwb")) {
  throw new Error(`Refusing support E2E outside ShiftPilot Staging: ${hostname}`);
}

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const makeClient = () => createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const runId = process.env.GITHUB_RUN_ID ?? `${Date.now()}-${randomBytes(3).toString("hex")}`;
const password = `${randomBytes(18).toString("base64url")}Aa9!`;
const createdUsers = [];
let organizationId = null;

async function must(promise, label) {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function createUser(label, firstName, lastName) {
  const email = `shiftpilot-support-e2e-${label}-${runId}@example.com`;
  const data = await must(admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName }
  }), `create ${label} user`);
  createdUsers.push(data.user.id);
  await must(admin.from("profiles").upsert({ id: data.user.id, first_name: firstName, last_name: lastName }), `create ${label} profile`);
  return { id: data.user.id, email, password };
}

async function login(credentials) {
  const client = makeClient();
  const { error } = await client.auth.signInWithPassword({ email: credentials.email, password: credentials.password });
  if (error) throw new Error(`login failed for ${credentials.email}: ${error.message}`);
  return client;
}

async function cleanup() {
  const failures = [];
  if (organizationId) {
    const { error } = await admin.from("organizations").delete().eq("id", organizationId);
    if (error) failures.push(`organization cleanup: ${error.message}`);
  }
  for (const userId of createdUsers.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) failures.push(`user ${userId}: ${error.message}`);
  }
  if (failures.length) throw new Error(failures.join("; "));
}

async function main() {
  let testError;
  try {
    const employee = await createUser("employee", "Pilot", "Customer");
    const supportAgent = await createUser("agent", "Pilot", "Support");

    const organization = await must(admin.from("organizations").insert({
      name: `ShiftPilot Support E2E ${runId}`,
      slug: `shiftpilot-support-e2e-${runId}`,
      schedule_cadence: "weekly"
    }).select("id").single(), "create support E2E organization");
    organizationId = organization.id;

    const branch = await must(admin.from("branches").insert({ organization_id: organizationId, name: "Support E2E Branch" }).select("id").single(), "create support E2E branch");
    await must(admin.from("organization_memberships").insert({
      organization_id: organizationId,
      branch_id: branch.id,
      user_id: employee.id,
      role: "employee",
      status: "active",
      access_scope: "self",
      joined_at: new Date().toISOString()
    }), "create employee membership");

    await must(admin.from("platform_support_agents").insert({ user_id: supportAgent.id }), "create platform support agent");

    const employeeClient = await login(employee);
    const agentClient = await login(supportAgent);

    const ticket = await must(employeeClient.from("support_tickets").insert({
      organization_id: organizationId,
      organization_name: "",
      created_by: employee.id,
      category: "feature",
      priority: "normal",
      subject: "Pilot feedback E2E",
      description: "Feedback captured during the isolated ShiftPilot pilot support lifecycle test."
    }).select("id,status,resolution_note,first_responded_at,resolved_at,reopened_count").single(), "employee creates pilot feedback ticket");

    if (ticket.status !== "open") throw new Error(`Expected new support ticket to be open, got ${ticket.status}`);
    if (ticket.resolution_note !== null) throw new Error("New support ticket unexpectedly has a resolution note");

    const accepted = await must(agentClient.from("support_tickets").update({
      status: "in_progress",
      assigned_to: supportAgent.id
    }).eq("id", ticket.id).select("status,assigned_to,first_responded_at").single(), "support agent accepts ticket");
    if (accepted.status !== "in_progress" || accepted.assigned_to !== supportAgent.id) throw new Error("Support ticket was not assigned/in progress");
    if (!accepted.first_responded_at) throw new Error("first_responded_at was not recorded when support accepted the ticket");

    const waiting = await must(agentClient.from("support_tickets").update({
      status: "waiting_customer",
      resolution_note: "נשמח לדעת באיזה שלב בפיילוט נתקלתם בקושי.",
      assigned_to: supportAgent.id
    }).eq("id", ticket.id).select("status,resolution_note").single(), "support waits for customer");
    if (waiting.status !== "waiting_customer") throw new Error("Support ticket did not enter waiting_customer");

    const invalidResolve = await agentClient.from("support_tickets").update({
      status: "resolved",
      resolution_note: null,
      assigned_to: supportAgent.id
    }).eq("id", ticket.id);
    if (!invalidResolve.error) throw new Error("Resolving a support ticket without a customer update unexpectedly succeeded");

    const resolutionNote = "בדקנו את המשוב, תיעדנו אותו לפיילוט והטיפול הושלם.";
    const resolved = await must(agentClient.from("support_tickets").update({
      status: "resolved",
      resolution_note: resolutionNote,
      assigned_to: supportAgent.id
    }).eq("id", ticket.id).select("status,resolution_note,resolved_at,first_responded_at").single(), "resolve support ticket with customer update");
    if (resolved.status !== "resolved" || resolved.resolution_note !== resolutionNote) throw new Error("Support ticket resolution state is incorrect");
    if (!resolved.resolved_at) throw new Error("resolved_at was not recorded");
    if (!resolved.first_responded_at) throw new Error("first_responded_at was lost during resolution");

    const customerView = await must(employeeClient.from("support_tickets").select("status,resolution_note").eq("id", ticket.id).single(), "customer reads resolved ticket");
    if (customerView.status !== "resolved" || customerView.resolution_note !== resolutionNote) {
      throw new Error("Customer cannot see the final support resolution update");
    }

    console.log("Staging support E2E passed: create → accept → waiting_customer → resolution guard → resolved → customer visibility");
  } catch (error) {
    testError = error;
  }

  let cleanupError;
  try {
    await cleanup();
  } catch (error) {
    cleanupError = error;
  }

  if (testError && cleanupError) throw new AggregateError([testError, cleanupError], "Support E2E and cleanup both failed");
  if (cleanupError) throw cleanupError;
  if (testError) throw testError;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
