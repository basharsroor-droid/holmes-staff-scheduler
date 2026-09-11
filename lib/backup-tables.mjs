// The single source of truth for the nightly backup (scripts/backup-database.mjs)
// and the restore drill (scripts/restore-database.mjs):
//
// - which tables are exported, and each one's primary key;
// - how every text/JSON column is treated when a backup is restored into
//   staging, where no real name, email or phone number may land.
//
// scripts/check-backup-coverage.mjs compares this file with a database built
// from supabase/migrations/ on every PR, so a new table or a new text column
// fails CI until it is added here. A table can't silently drop out of the
// backup again -- eight did between 2026-08-16 and 2026-09-11 (subscriptions
// and billing among them), found only by the first real restore drill.

export const PRODUCTION_PROJECT_REF = "forstsmvakpsreffdiwb";
export const STAGING_PROJECT_REF = "sqmstwwrdoenfumligmf";

// Stored in the backup next to the public tables: the fields needed to
// recreate each user with the same UUID. Never a password hash.
export const AUTH_USERS_KEY = "auth.users";

// Synthetic values a staging restore writes. lib/outbound.ts refuses to
// deliver email or push to them, whatever runtime tries.
export const SYNTHETIC_EMAIL_DOMAIN = "restore.invalid";
export const SYNTHETIC_TOKEN_PREFIX = "restore-";

// Tables the migrations seed themselves, so they are not empty in a fresh
// project. The restore upserts them and a cleanup leaves them in place.
export const SEEDED_BY_MIGRATIONS = ["plans"];

export const TEXT_LIKE_TYPES = ["text", "varchar", "bpchar", "citext", "json", "jsonb", "xml", "inet", "_text", "_varchar", "_jsonb"];

const hex = (value) => String(value).replace(/-/g, "");
const short = (value) => hex(value).slice(0, 12);

// A rule is "keep" or a function (value, row, rowKey) -> synthetic value.
// Rules only run on non-null values, so nullability is preserved.
const keep = "keep";
const text = () => "[anonymized]";
const json = () => ({ anonymized: true });
const fixed = (value) => () => value;
const label = (prefix) => (_value, _row, key) => `${prefix} ${short(key)}`;
const email = (_value, _row, key) => `user-${hex(key)}@${SYNTHETIC_EMAIL_DOMAIN}`;
const token = (_value, _row, key) => `${SYNTHETIC_TOKEN_PREFIX}${hex(key)}`;
const opaqueId = (_value, _row, key) => `anon_${hex(key)}`;
const slug = (_value, _row, key) => `restored-${hex(key)}`;
const phone = fixed("0500000000");
// Nothing restored is ever waiting to be sent.
const queueStatus = (value) => (["pending", "processing", "retry"].includes(value) ? "failed" : value);

export const BACKUP_TABLES = {
  organizations: {
    key: ["id"],
    columns: { name: label("Restored organization"), slug, timezone: keep, schedule_cadence: keep }
  },
  branches: { key: ["id"], columns: { name: label("Branch"), address: text } },
  profiles: { key: ["id"], columns: { first_name: fixed("Restored"), last_name: label("User"), phone, color: keep } },
  organization_memberships: {
    key: ["id"],
    columns: { employee_number: label("E"), seniority_level: keep, access_scope: keep }
  },
  organization_invitations: {
    key: ["id"],
    columns: { email, first_name: fixed("Invited"), last_name: label("User"), status: keep }
  },
  departments: { key: ["id"], columns: { name: label("Department") } },
  department_memberships: { key: ["department_id", "membership_id"], columns: {} },
  shift_templates: { key: ["id"], columns: { name: keep, shift_type: keep } },
  schedule_periods: { key: ["id"], columns: {} },
  availability_submissions: { key: ["id"], columns: { manager_note: text } },
  availability_entries: { key: ["id"], columns: { note: text } },
  leave_requests: { key: ["id"], columns: { note: text, manager_note: text } },
  shifts: { key: ["id"], columns: { name: keep, manager_note: text } },
  shift_assignments: { key: ["id"], columns: {} },
  swap_requests: { key: ["id"], columns: { reason: text, manager_note: text } },
  swap_request_events: { key: ["id"], columns: { action: keep, note: text } },
  notifications: {
    key: ["id"],
    columns: { channel: keep, template_key: keep, payload: json, error_message: text }
  },
  notification_preferences: { key: ["organization_id", "user_id"], columns: {} },
  email_delivery_queue: {
    key: ["id"],
    columns: {
      recipient: email,
      template_key: keep,
      payload: json,
      idempotency_key: opaqueId,
      status: queueStatus,
      provider_message_id: keep,
      last_error: text
    }
  },
  audit_logs: { key: ["id"], columns: { action: keep, entity_type: keep, metadata: json } },
  operational_events: {
    key: ["id"],
    columns: {
      event_type: keep,
      event_name: keep,
      severity: keep,
      route: keep,
      release: keep,
      fingerprint: keep,
      metadata: json
    }
  },
  platform_support_agents: { key: ["user_id"], columns: {} },
  support_tickets: {
    key: ["id"],
    columns: { subject: text, description: text, resolution_note: text, organization_name: text }
  },
  // Not backed up before 2026-09-11:
  open_shift_requests: { key: ["id"], columns: { employee_note: text, manager_note: text } },
  schedule_templates: { key: ["id"], columns: { name: keep } },
  schedule_template_items: { key: ["id"], columns: { name: keep } },
  push_devices: { key: ["id"], columns: { token, platform: keep, environment: keep } },
  push_delivery_queue: {
    key: ["id"],
    columns: {
      device_token: token,
      environment: keep,
      template_key: keep,
      payload: json,
      status: queueStatus,
      apns_id: keep,
      last_error: text
    }
  },
  plans: { key: ["id"], columns: { id: keep, name: keep } },
  subscriptions: {
    key: ["organization_id"],
    columns: {
      plan_id: keep,
      billing_period: keep,
      billing_provider: keep,
      provider_customer_id: opaqueId,
      provider_subscription_id: opaqueId,
      provider_payment_method_id: opaqueId,
      currency: keep
    }
  },
  billing_events: {
    key: ["id"],
    columns: {
      provider: keep,
      provider_event_id: opaqueId,
      event_type: keep,
      processing_status: keep,
      payload: json,
      processing_error: text
    }
  }
};

export const BACKUP_TABLE_NAMES = Object.keys(BACKUP_TABLES);

// Format 1 backups (before 2026-09-11) have these tables and no auth.users.
export const LEGACY_V1_TABLES = BACKUP_TABLE_NAMES.slice(0, 23);

export function backupKeysForVersion(version) {
  return version === 2 ? [...BACKUP_TABLE_NAMES, AUTH_USERS_KEY] : LEGACY_V1_TABLES;
}

// The only auth.users fields a backup keeps.
export function toBackupAuthUser(user) {
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone || null,
    created_at: user.created_at ?? null,
    updated_at: user.updated_at ?? null,
    email_confirmed_at: user.email_confirmed_at ?? null,
    phone_confirmed_at: user.phone_confirmed_at ?? null,
    last_sign_in_at: user.last_sign_in_at ?? null,
    banned_until: user.banned_until ?? null,
    is_anonymous: user.is_anonymous ?? false,
    app_metadata: user.app_metadata ?? {},
    user_metadata: user.user_metadata ?? {}
  };
}

export function anonymizeRow(table, row) {
  const definition = BACKUP_TABLES[table];
  if (!definition) throw new Error(`No backup definition for table ${table}`);
  const rowKey = definition.key.map((column) => row[column]).join("-");
  const result = { ...row };
  for (const [column, rule] of Object.entries(definition.columns)) {
    if (rule === keep || result[column] === null || result[column] === undefined) continue;
    result[column] = rule(result[column], row, rowKey);
  }
  return result;
}

// app_metadata (sign-in provider) stays; user_metadata can hold a name.
export function anonymizeAuthUser(user) {
  return {
    ...user,
    email: `user-${hex(user.id)}@${SYNTHETIC_EMAIL_DOMAIN}`,
    phone: null,
    phone_confirmed_at: null,
    user_metadata: {}
  };
}

// A restore may only ever write to the staging project.
export function restoreTargetProblem(databaseUrl) {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    return "is not a valid Postgres connection URL";
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) return "is not a Postgres connection URL";
  if (databaseUrl.includes(PRODUCTION_PROJECT_REF)) return `points at the production project (${PRODUCTION_PROJECT_REF})`;
  const target = `${decodeURIComponent(url.username)}@${url.hostname}`;
  if (!target.includes(STAGING_PROJECT_REF)) return `is not the staging project (${STAGING_PROJECT_REF})`;
  return null;
}

export const INTROSPECTION_SQL = {
  tables: `
    select table_name::text as table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by 1`,
  textColumns: `
    select c.table_name::text as table_name, c.column_name::text as column_name, c.udt_name::text as udt_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.udt_name = any($1::text[])
    order by 1, 2`,
  primaryKeys: `
    select cl.relname::text as table_name, array_agg(a.attname::text order by k.ord) as columns
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
    where c.contype = 'p' and c.connamespace = 'public'::regnamespace
    group by cl.relname`
};

export function coverageProblems({ tables, textColumns, primaryKeys }) {
  const problems = [];
  const inSchema = new Set(tables);

  for (const table of tables) {
    if (!BACKUP_TABLES[table]) problems.push(`public.${table} is not in the backup -- add it to lib/backup-tables.mjs`);
  }
  for (const table of BACKUP_TABLE_NAMES) {
    if (!inSchema.has(table)) problems.push(`lib/backup-tables.mjs lists ${table}, but the schema has no such table`);
  }

  const classified = new Set();
  for (const { table_name: table, column_name: column, udt_name: type } of textColumns) {
    if (!BACKUP_TABLES[table]) continue;
    classified.add(`${table}.${column}`);
    if (!(column in BACKUP_TABLES[table].columns)) {
      problems.push(`${table}.${column} (${type}) has no restore rule -- mark it "keep" or anonymize it in lib/backup-tables.mjs`);
    }
  }
  for (const [table, definition] of Object.entries(BACKUP_TABLES)) {
    if (!inSchema.has(table)) continue;
    for (const column of Object.keys(definition.columns)) {
      if (!classified.has(`${table}.${column}`)) {
        problems.push(`lib/backup-tables.mjs has a rule for ${table}.${column}, which is not a text/JSON column in the schema`);
      }
    }
  }

  const keys = new Map(primaryKeys.map((row) => [row.table_name, row.columns]));
  for (const [table, definition] of Object.entries(BACKUP_TABLES)) {
    if (!inSchema.has(table)) continue;
    const actual = keys.get(table) ?? [];
    if (actual.join(",") !== definition.key.join(",")) {
      problems.push(`${table} primary key is (${actual.join(", ")}), lib/backup-tables.mjs says (${definition.key.join(", ")})`);
    }
  }
  return problems;
}

// client: a connected pg client (or anything with the same query()).
export async function readSchemaCoverage(client) {
  const tables = (await client.query(INTROSPECTION_SQL.tables)).rows.map((row) => row.table_name);
  const textColumns = (await client.query(INTROSPECTION_SQL.textColumns, [TEXT_LIKE_TYPES])).rows;
  const primaryKeys = (await client.query(INTROSPECTION_SQL.primaryKeys)).rows;
  return { problems: coverageProblems({ tables, textColumns, primaryKeys }), textColumnCount: textColumns.length };
}
