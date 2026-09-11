// Nightly encrypted logical backup of every tenant table's data.
//
// This deliberately does NOT try to be a pg_dump replacement -- schema/DDL
// is already fully version-controlled in supabase/migrations/, so a fresh
// Supabase project can be brought to the right *shape* by replaying those
// migrations. What migrations can't reconstruct is the *data* that existed
// at a point in time, which is what this script captures: every row of
// every public table (lib/backup-tables.mjs), plus the auth.users fields
// needed to recreate each user with the same UUID -- never a password hash --
// as JSON, encrypted with age so the ciphertext is safe to store outside
// Supabase even though the repository is public.
//
// Requires:
//   NEXT_PUBLIC_SUPABASE_URL   -- already public, not a secret
//   SUPABASE_SECRET_KEY        -- service_role key, bypasses RLS by design
//                                  (this script must see every row, not just
//                                  what a scoped user could see)
//   BACKUP_AGE_PUBLIC_KEY      -- age recipient (public key) to encrypt to.
//                                  Only the matching private key (kept by a
//                                  human, never stored in this repo or in
//                                  CI) can decrypt. Encryption doesn't need
//                                  the private key at all, so a compromised
//                                  CI run still can't read past backups.
//
// Usage: node scripts/backup-database.mjs [output-file]
// Output defaults to backups/shiftpilot-<UTC timestamp>.json.age (armored,
// so it's plain text and diffs/stores cleanly in git).

import { createClient } from "@supabase/supabase-js";
import * as age from "age-encryption";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { createBackupPayload } from "../lib/backup-format.mjs";
import { AUTH_USERS_KEY, BACKUP_TABLE_NAMES, BACKUP_TABLES, toBackupAuthUser } from "../lib/backup-tables.mjs";

// PostgREST returns at most 1000 rows per request, so a single select("*")
// would silently cut any larger table short. Page through in key order.
const PAGE_SIZE = 1000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function exportTable(supabase, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select("*");
    for (const column of BACKUP_TABLES[table].key) query = query.order(column, { ascending: true });
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to export "${table}": ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

async function exportAuthUsers(supabase) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`Failed to export auth.users: ${error.message}`);
    users.push(...data.users.map(toBackupAuthUser));
    if (data.users.length < PAGE_SIZE) return users;
  }
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SECRET_KEY");
  const recipient = requireEnv("BACKUP_AGE_PUBLIC_KEY");

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  console.log(`Exporting ${BACKUP_TABLE_NAMES.length} tables and auth.users...`);
  const tables = {};
  for (const table of BACKUP_TABLE_NAMES) tables[table] = await exportTable(supabase, table);
  tables[AUTH_USERS_KEY] = await exportAuthUsers(supabase);
  const rowCounts = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length]));
  console.log("Row counts:", rowCounts);

  const payload = createBackupPayload({
    exportedAt: new Date().toISOString(),
    projectUrl: supabaseUrl,
    tables
  });

  const encrypter = new age.Encrypter();
  encrypter.addRecipient(recipient);
  const ciphertext = await encrypter.encrypt(JSON.stringify(payload));
  const armored = age.armor.encode(ciphertext);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = process.argv[2] ?? `backups/shiftpilot-${timestamp}.json.age`;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, armored, "utf8");

  console.log(`Encrypted backup written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
