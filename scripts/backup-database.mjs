// Nightly encrypted logical backup of every tenant table's data.
//
// This deliberately does NOT try to be a pg_dump replacement -- schema/DDL
// is already fully version-controlled in supabase/migrations/, so a fresh
// Supabase project can be brought to the right *shape* by replaying those
// migrations. What migrations can't reconstruct is the *data* that existed
// at a point in time, which is what this script captures: every row of
// every table, as JSON, encrypted with age so the ciphertext is safe to
// store outside Supabase (including in this repo's own git history) even
// though the repository is public.
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

// Every table in the public schema as of 2026-08-16 (confirmed against the
// live project via list_tables). Add new tables here when a migration adds
// one -- this list is not derived automatically on purpose, so a forgotten
// table shows up as a visible diff in this file's PR, not a silent gap in
// backup coverage.
const TABLES = [
  "organizations",
  "branches",
  "profiles",
  "organization_memberships",
  "organization_invitations",
  "departments",
  "department_memberships",
  "shift_templates",
  "schedule_periods",
  "availability_submissions",
  "availability_entries",
  "leave_requests",
  "shifts",
  "shift_assignments",
  "swap_requests",
  "swap_request_events",
  "notifications",
  "notification_preferences",
  "email_delivery_queue",
  "audit_logs",
  "platform_support_agents",
  "support_tickets"
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function exportAllTables(supabase) {
  const tables = {};
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      throw new Error(`Failed to export "${table}": ${error.message}`);
    }
    tables[table] = data;
  }
  return tables;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SECRET_KEY");
  const recipient = requireEnv("BACKUP_AGE_PUBLIC_KEY");

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  console.log(`Exporting ${TABLES.length} tables...`);
  const tables = await exportAllTables(supabase);
  const rowCounts = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length]));
  console.log("Row counts:", rowCounts);

  const payload = {
    exported_at: new Date().toISOString(),
    supabase_project_url: supabaseUrl,
    tables
  };

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
