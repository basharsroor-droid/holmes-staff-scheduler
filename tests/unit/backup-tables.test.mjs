import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_USERS_KEY,
  BACKUP_TABLE_NAMES,
  BACKUP_TABLES,
  LEGACY_V1_TABLES,
  SYNTHETIC_EMAIL_DOMAIN,
  SYNTHETIC_TOKEN_PREFIX,
  anonymizeAuthUser,
  anonymizeRow,
  backupKeysForVersion,
  coverageProblems,
  restoreTargetProblem,
  toBackupAuthUser
} from "../../lib/backup-tables.mjs";
import * as outbound from "../../lib/outbound.ts";

const id = "0b7e3c1a-1111-4222-8333-944455556666";
const otherId = "9f000000-aaaa-4bbb-8ccc-dddddddddddd";

test("personal data is replaced; ids, relationships and non-personal fields are kept", () => {
  const profile = anonymizeRow("profiles", {
    id,
    first_name: "דנה",
    last_name: "כהן",
    phone: "0521234567",
    color: "#12ab34",
    created_at: "2026-09-01T00:00:00Z"
  });
  assert.equal(profile.id, id);
  assert.equal(profile.color, "#12ab34");
  assert.equal(profile.created_at, "2026-09-01T00:00:00Z");
  assert.notEqual(profile.first_name, "דנה");
  assert.ok(!profile.last_name.includes("כהן"));
  assert.equal(profile.phone, "0500000000");

  const membership = anonymizeRow("organization_memberships", {
    id,
    organization_id: otherId,
    user_id: otherId,
    employee_number: "1234",
    access_scope: "self"
  });
  assert.equal(membership.organization_id, otherId);
  assert.equal(membership.access_scope, "self");
  assert.notEqual(membership.employee_number, "1234");
});

test("null stays null", () => {
  assert.equal(anonymizeRow("profiles", { id, first_name: "דנה", last_name: null, phone: null, color: "#000000" }).phone, null);
});

test("synthetic emails and push tokens are unique per row and undeliverable", () => {
  const invitation = (rowId) =>
    anonymizeRow("organization_invitations", { id: rowId, email: "real@example.com", first_name: "A", last_name: "B", status: "pending" });
  assert.notEqual(invitation(id).email, invitation(otherId).email);
  assert.ok(invitation(id).email.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`));

  const device = anonymizeRow("push_devices", { id, token: "a1b2c3", platform: "ios", environment: "production" });
  assert.ok(device.token.startsWith(SYNTHETIC_TOKEN_PREFIX));
  assert.equal(device.platform, "ios");
});

test("organization names and slugs still satisfy the schema's checks", () => {
  const organization = anonymizeRow("organizations", {
    id,
    name: "Holmes Place",
    slug: "holmes-place",
    timezone: "Asia/Jerusalem",
    schedule_cadence: "monthly"
  });
  assert.match(organization.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(organization.name.length >= 2 && organization.name.length <= 120);
  assert.ok(!organization.name.includes("Holmes"));
  assert.equal(organization.timezone, "Asia/Jerusalem");
});

test("free text and JSON are replaced, and nothing restored is left waiting to be sent", () => {
  const job = anonymizeRow("email_delivery_queue", {
    id,
    recipient: "dana@example.com",
    template_key: "schedule_published",
    payload: { name: "דנה" },
    idempotency_key: "invite-dana@example.com",
    status: "pending",
    provider_message_id: null,
    last_error: "bounced dana@example.com"
  });
  assert.deepEqual(job.payload, { anonymized: true });
  assert.equal(job.status, "failed");
  assert.equal(job.template_key, "schedule_published");
  for (const value of [job.recipient, job.idempotency_key, job.last_error]) assert.ok(!value.includes("dana@example.com"));
  assert.equal(anonymizeRow("email_delivery_queue", { id, status: "sent" }).status, "sent");
});

test("auth users keep their UUID; the backup never holds a password hash; the restore drops everything personal", () => {
  const backedUp = toBackupAuthUser({
    id,
    email: "dana@example.com",
    phone: "972521234567",
    encrypted_password: "$2a$10$hash",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "דנה כהן" },
    created_at: "2026-09-01T00:00:00Z"
  });
  assert.equal("encrypted_password" in backedUp, false);

  const restored = anonymizeAuthUser(backedUp);
  assert.equal(restored.id, id);
  assert.equal(restored.email, `user-${id.replace(/-/g, "")}@${SYNTHETIC_EMAIL_DOMAIN}`);
  assert.equal(restored.phone, null);
  assert.deepEqual(restored.user_metadata, {});
  assert.deepEqual(restored.app_metadata, { provider: "email", providers: ["email"] });
});

test("a restore can only target the staging project", () => {
  const refused = [
    ["postgresql://postgres.forstsmvakpsreffdiwb:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres", /production/],
    ["postgresql://postgres:pw@db.forstsmvakpsreffdiwb.supabase.co:5432/postgres", /production/],
    ["postgresql://postgres:pw@db.someotherproject.supabase.co:5432/postgres", /not the staging project/],
    ["postgresql://postgres:pw@127.0.0.1:54322/postgres", /not the staging project/],
    ["https://sqmstwwrdoenfumligmf.supabase.co", /not a Postgres connection URL/],
    ["not a url", /not a valid/]
  ];
  for (const [url, reason] of refused) assert.match(restoreTargetProblem(url), reason, url);

  assert.equal(restoreTargetProblem("postgresql://postgres.sqmstwwrdoenfumligmf:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"), null);
  assert.equal(restoreTargetProblem("postgresql://postgres:pw@db.sqmstwwrdoenfumligmf.supabase.co:5432/postgres"), null);
});

function schemaMatchingDefinitions() {
  return {
    tables: [...BACKUP_TABLE_NAMES],
    textColumns: Object.entries(BACKUP_TABLES).flatMap(([table, definition]) =>
      Object.keys(definition.columns).map((column) => ({ table_name: table, column_name: column, udt_name: "text" }))
    ),
    primaryKeys: Object.entries(BACKUP_TABLES).map(([table, definition]) => ({ table_name: table, columns: definition.key }))
  };
}

test("coverage passes when the schema matches lib/backup-tables.mjs", () => {
  assert.deepEqual(coverageProblems(schemaMatchingDefinitions()), []);
});

test("a new table fails CI until it is backed up", () => {
  const schema = schemaMatchingDefinitions();
  schema.tables.push("loyalty_cards");
  assert.match(coverageProblems(schema).join("\n"), /public\.loyalty_cards is not in the backup/);
});

test("a new text column fails CI until it has a restore rule", () => {
  const schema = schemaMatchingDefinitions();
  schema.textColumns.push({ table_name: "profiles", column_name: "nickname", udt_name: "text" });
  assert.match(coverageProblems(schema).join("\n"), /profiles\.nickname \(text\) has no restore rule/);
});

test("a dropped table, a dropped column and a changed primary key are reported", () => {
  const schema = schemaMatchingDefinitions();
  schema.tables = schema.tables.filter((table) => table !== "plans");
  schema.textColumns = schema.textColumns.filter((row) => !(row.table_name === "profiles" && row.column_name === "phone"));
  schema.primaryKeys = schema.primaryKeys.map((row) => (row.table_name === "subscriptions" ? { ...row, columns: ["id"] } : row));
  const problems = coverageProblems(schema).join("\n");
  assert.match(problems, /lists plans, but the schema has no such table/);
  assert.match(problems, /rule for profiles\.phone/);
  assert.match(problems, /subscriptions primary key is \(id\)/);
});

test("format 2 carries every table plus auth.users; format 1 is the original 23", () => {
  assert.deepEqual(backupKeysForVersion(2), [...BACKUP_TABLE_NAMES, AUTH_USERS_KEY]);
  assert.deepEqual(LEGACY_V1_TABLES, [
    "organizations", "branches", "profiles", "organization_memberships", "organization_invitations",
    "departments", "department_memberships", "shift_templates", "schedule_periods",
    "availability_submissions", "availability_entries", "leave_requests", "shifts", "shift_assignments",
    "swap_requests", "swap_request_events", "notifications", "notification_preferences",
    "email_delivery_queue", "audit_logs", "operational_events", "platform_support_agents", "support_tickets"
  ]);
});

test("every column rule is 'keep' or a function", () => {
  for (const [table, definition] of Object.entries(BACKUP_TABLES)) {
    for (const [column, rule] of Object.entries(definition.columns)) {
      assert.ok(rule === "keep" || typeof rule === "function", `${table}.${column}`);
    }
  }
});

test("the restore and the outbound guard agree on what is synthetic", () => {
  assert.equal(outbound.SYNTHETIC_EMAIL_DOMAIN, SYNTHETIC_EMAIL_DOMAIN);
  assert.equal(outbound.SYNTHETIC_TOKEN_PREFIX, SYNTHETIC_TOKEN_PREFIX);
});
