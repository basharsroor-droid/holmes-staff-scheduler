// Restores a backup made by scripts/backup-database.mjs.
//
// Deliberately NOT wired into any workflow: a restore is a human decision.
// Pass exactly one mode:
//
//   --verify-only      decrypt and check the backup (checksum, table set, row
//                      counts). Touches no database.
//   --staging-restore  restore into the staging project, with every name,
//                      email, phone number and free-text field replaced by a
//                      synthetic value (lib/backup-tables.mjs). Any other
//                      target -- production above all -- is refused.
//                      Add --rollback to run every step and check, then roll
//                      back instead of committing.
//   --staging-cleanup  empty what a staging restore wrote.
//
// Restoring real, un-anonymized data into a new project is a disaster-
// recovery decision for the owner; it is deliberately not a mode here.
//
// Usage:
//   BACKUP_AGE_PRIVATE_KEY=... node scripts/restore-database.mjs <backup.json.age> --verify-only
//   RESTORE_DATABASE_URL=<staging Postgres URL> BACKUP_AGE_PRIVATE_KEY=... \
//     node scripts/restore-database.mjs <backup.json.age> --staging-restore [--rollback]
//   RESTORE_DATABASE_URL=<staging Postgres URL> node scripts/restore-database.mjs --staging-cleanup
//
// The staging restore is one transaction:
//   1. refuse a target that isn't empty, or whose schema has a table or text
//      column this backup format doesn't know;
//   2. insert auth.users (same UUIDs, synthetic emails, no password -- nobody
//      can sign in as a restored user) and every public table;
//   3. re-check every foreign key, compare every table's row count with the
//      backup, and confirm no real email address or push token got through;
//   4. commit only if all of that passed.
//
// Triggers: step 2 runs under session_replication_role = replica, set with SET
// LOCAL inside this transaction and switched back before step 3. Replica mode
// skips the app's guard triggers (they reject writes without a signed-in
// user) and also the FK triggers -- which is why step 3 checks every FK
// itself. It cannot outlive the transaction.

import * as age from "age-encryption";
import { readFileSync } from "node:fs";
import pg from "pg";

import { validateBackupPayload } from "../lib/backup-format.mjs";
import {
  AUTH_USERS_KEY,
  BACKUP_TABLE_NAMES,
  BACKUP_TABLES,
  SEEDED_BY_MIGRATIONS,
  STAGING_PROJECT_REF,
  SYNTHETIC_EMAIL_DOMAIN,
  SYNTHETIC_TOKEN_PREFIX,
  anonymizeAuthUser,
  anonymizeRow,
  backupKeysForVersion,
  readSchemaCoverage,
  restoreTargetProblem
} from "../lib/backup-tables.mjs";

const MODES = ["--verify-only", "--staging-restore", "--staging-cleanup"];
const BATCH_SIZE = 500;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) fail(`Missing required environment variable: ${name}`);
  return value;
}

async function readBackup(path) {
  const decrypter = new age.Decrypter();
  decrypter.addIdentity(requireEnv("BACKUP_AGE_PRIVATE_KEY"));
  const decrypted = await decrypter.decrypt(age.armor.decode(readFileSync(path, "utf8")), "text");
  const payload = JSON.parse(decrypted);
  const verification = validateBackupPayload(payload, backupKeysForVersion(payload.format_version));

  console.log(`Backup integrity: ${verification.integrity} (format ${verification.formatVersion ?? "legacy"})`);
  console.log("Row counts:", verification.rowCounts);
  return payload;
}

async function connectToStaging() {
  const databaseUrl = requireEnv("RESTORE_DATABASE_URL");
  const problem = restoreTargetProblem(databaseUrl);
  if (problem) fail(`Refusing to continue: RESTORE_DATABASE_URL ${problem}.`);

  // Supabase signs its Postgres certificate with its own CA, so it can't be
  // verified against the system store. The connection is still encrypted, and
  // the only possible target is staging, holding anonymized rows.
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

const tableName = (client, table) => (table === AUTH_USERS_KEY ? "auth.users" : `public.${client.escapeIdentifier(table)}`);

async function countRows(client, table) {
  const { rows } = await client.query(`select count(*)::int as n from ${tableName(client, table)}`);
  return rows[0].n;
}

async function targetColumns(client, table) {
  const { rows } = await client.query(
    `select column_name::text as name, is_generated::text as generated, identity_generation::text as identity
     from information_schema.columns
     where table_schema = 'public' and table_name = $1`,
    [table]
  );
  return {
    all: new Set(rows.map((row) => row.name)),
    // Computed by Postgres from other columns: never inserted, recomputed.
    generated: new Set(rows.filter((row) => row.generated !== "NEVER").map((row) => row.name)),
    // GENERATED ALWAYS AS IDENTITY (audit_logs.id): the restored ids must be
    // kept, which Postgres only allows with OVERRIDING SYSTEM VALUE.
    identityAlways: rows.some((row) => row.identity === "ALWAYS")
  };
}

// Restored rows keep their ids, so each sequence must start after them --
// otherwise the first new row in the restored database collides.
async function syncSequences(client) {
  const e = (name) => client.escapeIdentifier(name);
  const { rows } = await client.query(`
    select table_name::text as table_name, column_name::text as column_name,
      pg_get_serial_sequence(format('public.%I', table_name), column_name) as sequence
    from information_schema.columns
    where table_schema = 'public' and pg_get_serial_sequence(format('public.%I', table_name), column_name) is not null`);
  for (const row of rows) {
    await client.query(
      `select setval($1, coalesce((select max(${e(row.column_name)}) from public.${e(row.table_name)}), 0) + 1, false)`,
      [row.sequence]
    );
  }
  console.log(`Sequences moved past the restored ids: ${rows.length}`);
}

async function insertRows(client, table, rows) {
  if (!rows.length) return;
  const e = (name) => client.escapeIdentifier(name);
  const target = await targetColumns(client, table);
  const columns = Object.keys(rows[0]).filter((column) => !target.generated.has(column));
  const unknown = columns.filter((column) => !target.all.has(column));
  if (unknown.length) throw new Error(`${table}: the backup has columns the target doesn't: ${unknown.join(", ")}`);

  const key = BACKUP_TABLES[table].key;
  const list = columns.map(e).join(", ");
  const updates = columns.filter((column) => !key.includes(column)).map((column) => `${e(column)} = excluded.${e(column)}`);
  const conflict = `on conflict (${key.map(e).join(", ")}) do ${updates.length ? `update set ${updates.join(", ")}` : "nothing"}`;
  const qualified = tableName(client, table);

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    await client.query(
      `insert into ${qualified} (${list}) ${target.identityAlways ? "overriding system value" : ""}
       select ${list} from jsonb_populate_recordset(null::${qualified}, $1::jsonb)
       ${conflict}`,
      [JSON.stringify(rows.slice(start, start + BATCH_SIZE))]
    );
  }
}

async function insertAuthUsers(client, users) {
  if (!users.length) return;
  // The empty strings: GoTrue can't load a user whose token columns are NULL.
  // encrypted_password '' means no password sign-in is possible.
  await client.query(
    `insert into auth.users (
       instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, phone, phone_confirmed_at,
       last_sign_in_at, banned_until, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous,
       confirmation_token, recovery_token, email_change_token_new, email_change)
     select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '',
       u.email_confirmed_at, u.phone, u.phone_confirmed_at, u.last_sign_in_at, u.banned_until,
       coalesce(u.app_metadata, '{}'), coalesce(u.user_metadata, '{}'), u.created_at,
       coalesce(u.updated_at, u.created_at), coalesce(u.is_anonymous, false), '', '', '', ''
     from jsonb_to_recordset($1::jsonb) as u(
       id uuid, email text, phone text, email_confirmed_at timestamptz, phone_confirmed_at timestamptz,
       last_sign_in_at timestamptz, banned_until timestamptz, app_metadata jsonb, user_metadata jsonb,
       created_at timestamptz, updated_at timestamptz, is_anonymous boolean)`,
    [JSON.stringify(users)]
  );
  await client.query(
    `insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
     select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', u.email_confirmed_at is not null, 'phone_verified', false),
       'email', u.created_at, u.created_at
     from auth.users u
     where u.email like $1`,
    [`%@${SYNTHETIC_EMAIL_DOMAIN}`]
  );
}

async function foreignKeyOrphans(client) {
  const e = (name) => client.escapeIdentifier(name);
  const { rows: constraints } = await client.query(`
    select c.conname::text as name, cn.nspname::text as child_schema, cc.relname::text as child_table,
      pn.nspname::text as parent_schema, pc.relname::text as parent_table,
      array(select a.attname::text from unnest(c.conkey) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum order by k.ord) as child_columns,
      array(select a.attname::text from unnest(c.confkey) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum order by k.ord) as parent_columns
    from pg_constraint c
    join pg_class cc on cc.oid = c.conrelid join pg_namespace cn on cn.oid = cc.relnamespace
    join pg_class pc on pc.oid = c.confrelid join pg_namespace pn on pn.oid = pc.relnamespace
    where c.contype = 'f' and cn.nspname = 'public'`);

  const broken = [];
  for (const fk of constraints) {
    const present = fk.child_columns.map((column) => `c.${e(column)} is not null`).join(" and ");
    const match = fk.child_columns.map((column, index) => `p.${e(fk.parent_columns[index])} = c.${e(column)}`).join(" and ");
    const { rows } = await client.query(
      `select count(*)::int as n from ${e(fk.child_schema)}.${e(fk.child_table)} c
       where ${present} and not exists (select 1 from ${e(fk.parent_schema)}.${e(fk.parent_table)} p where ${match})`
    );
    if (rows[0].n) broken.push(`${fk.child_table}.${fk.name}: ${rows[0].n} row(s) point at a missing ${fk.parent_schema}.${fk.parent_table} row`);
  }
  console.log(`Foreign keys checked: ${constraints.length}, broken: ${broken.length}`);
  return broken;
}

async function countMismatches(client, payload) {
  const report = [];
  for (const table of [AUTH_USERS_KEY, ...BACKUP_TABLE_NAMES]) {
    report.push({ table, backup: payload.tables[table].length, restored: await countRows(client, table) });
  }
  console.table(report);
  return report.filter((row) => row.backup !== row.restored).map((row) => `${row.table}: backup ${row.backup}, restored ${row.restored}`);
}

async function realContactDetailsLeft(client) {
  const email = `%@${SYNTHETIC_EMAIL_DOMAIN}`;
  const checks = [
    ["auth.users emails", `select count(*)::int as n from auth.users where email is not null and email not like $1`, [email]],
    ["auth.users phones", `select count(*)::int as n from auth.users where phone is not null`, []],
    ["invitation emails", `select count(*)::int as n from public.organization_invitations where email not like $1`, [email]],
    ["email queue recipients", `select count(*)::int as n from public.email_delivery_queue where recipient not like $1`, [email]],
    ["push device tokens", `select count(*)::int as n from public.push_devices where token not like $1`, [`${SYNTHETIC_TOKEN_PREFIX}%`]],
    ["push queue tokens", `select count(*)::int as n from public.push_delivery_queue where device_token not like $1`, [`${SYNTHETIC_TOKEN_PREFIX}%`]]
  ];
  const leaks = [];
  for (const [label, sql, params] of checks) {
    const { rows } = await client.query(sql, params);
    if (rows[0].n) leaks.push(`${label}: ${rows[0].n}`);
  }
  return leaks;
}

async function stagingRestore(path, { rollback }) {
  const payload = await readBackup(path);
  if (payload.format_version !== 2) {
    fail("This backup predates auth.users export (format 1) and can't be restored. Take a new backup first.");
  }

  const client = await connectToStaging();
  try {
    await client.query("begin");

    const { problems } = await readSchemaCoverage(client);
    if (problems.length) throw new Error(`The staging schema doesn't match this backup format:\n  ${problems.join("\n  ")}`);

    const occupied = [];
    for (const table of [AUTH_USERS_KEY, ...BACKUP_TABLE_NAMES]) {
      if (SEEDED_BY_MIGRATIONS.includes(table)) continue;
      const rows = await countRows(client, table);
      if (rows) occupied.push(`${table} (${rows})`);
    }
    if (occupied.length) {
      throw new Error(`Staging must be empty before a restore; it has rows in ${occupied.join(", ")}. Clean it first.`);
    }

    console.log(`Restoring into staging (${STAGING_PROJECT_REF}) with anonymized personal data...`);
    await client.query("set local session_replication_role = replica");
    await insertAuthUsers(client, payload.tables[AUTH_USERS_KEY].map(anonymizeAuthUser));
    for (const table of BACKUP_TABLE_NAMES) {
      await insertRows(client, table, payload.tables[table].map((row) => anonymizeRow(table, row)));
    }
    await client.query("set local session_replication_role = origin");
    await syncSequences(client);

    const orphans = await foreignKeyOrphans(client);
    if (orphans.length) throw new Error(`Foreign keys broken after the restore:\n  ${orphans.join("\n  ")}`);
    const mismatches = await countMismatches(client, payload);
    if (mismatches.length) throw new Error(`Row counts differ from the backup:\n  ${mismatches.join("\n  ")}`);
    const leaks = await realContactDetailsLeft(client);
    if (leaks.length) throw new Error(`Real contact details reached staging:\n  ${leaks.join("\n  ")}`);

    if (rollback) {
      await client.query("rollback");
      console.log("Every check passed. Rolled back (--rollback); staging is unchanged.");
    } else {
      await client.query("commit");
      console.log("Restore committed: every row count matches the backup and every foreign key holds.");
    }
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function stagingCleanup() {
  const client = await connectToStaging();
  const email = `%@${SYNTHETIC_EMAIL_DOMAIN}`;
  try {
    await client.query("begin");
    const { rows } = await client.query(`select count(*)::int as n from auth.users where email is null or email not like $1`, [email]);
    if (rows[0].n) {
      throw new Error(`Staging has ${rows[0].n} user(s) a restore didn't create (a test run?). Refusing to wipe it.`);
    }

    // TRUNCATE fires no row triggers, so the guard triggers don't get a say.
    const tables = BACKUP_TABLE_NAMES.filter((table) => !SEEDED_BY_MIGRATIONS.includes(table));
    await client.query(`truncate ${tables.map((table) => tableName(client, table)).join(", ")}`);
    const deleted = await client.query(`delete from auth.users where email like $1`, [email]);

    const left = [];
    for (const table of [AUTH_USERS_KEY, ...tables]) {
      const n = await countRows(client, table);
      if (n) left.push(`${table} (${n})`);
    }
    if (left.length) throw new Error(`Rows left after cleanup: ${left.join(", ")}`);

    await client.query("commit");
    console.log(`Staging cleaned: ${tables.length} tables emptied, ${deleted.rowCount} restored users deleted.`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const modes = MODES.filter((mode) => args.includes(mode));
  if (modes.length !== 1) fail(`Pass exactly one of: ${MODES.join(", ")}`);
  const [mode] = modes;
  if (mode === "--staging-cleanup") return stagingCleanup();

  const path = args.find((arg) => !arg.startsWith("--"));
  if (!path) fail("Usage: node scripts/restore-database.mjs <backup.json.age> --verify-only | --staging-restore [--rollback]");
  if (mode === "--verify-only") {
    await readBackup(path);
    console.log("Backup verification complete; no database was touched.");
    return;
  }
  return stagingRestore(path, { rollback: args.includes("--rollback") });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
