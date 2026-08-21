// Decrypts a backup produced by backup-database.mjs and replays its rows
// into a target Supabase project.
//
// Deliberately NOT wired into any automated workflow -- a restore is a
// destructive, high-stakes, human-decided action, not something that should
// ever run unattended in CI. Run it by hand, and only ever point it at a
// throwaway Supabase branch (a real disaster-recovery drill) or a fresh
// project, never at the real production project.
//
// Usage:
//   RESTORE_SUPABASE_URL=... RESTORE_SUPABASE_SECRET_KEY=... \
//   BACKUP_AGE_PRIVATE_KEY=... \
//   node scripts/restore-database.mjs backups/shiftpilot-2026-08-16T...json.age
//
// Target project must already have the schema in place (apply every
// migration under supabase/migrations/ first) -- this only restores rows,
// it does not create tables.

import { createClient } from "@supabase/supabase-js";
import * as age from "age-encryption";
import { readFileSync } from "node:fs";

import { validateBackupPayload } from "../lib/backup-format.mjs";

const TABLES = [
  "organizations", "branches", "profiles", "organization_memberships", "organization_invitations",
  "departments", "department_memberships", "shift_templates", "schedule_periods",
  "availability_submissions", "availability_entries", "leave_requests", "shifts", "shift_assignments",
  "swap_requests", "swap_request_events", "notifications", "notification_preferences",
  "email_delivery_queue", "audit_logs", "operational_events", "platform_support_agents", "support_tickets"
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/restore-database.mjs <path-to-backup.json.age>");
    process.exit(1);
  }

  const privateKey = requireEnv("BACKUP_AGE_PRIVATE_KEY");
  const verifyOnly = process.argv.includes("--verify-only");
  const supabaseUrl = verifyOnly ? null : requireEnv("RESTORE_SUPABASE_URL");
  const serviceKey = verifyOnly ? null : requireEnv("RESTORE_SUPABASE_SECRET_KEY");

  // Refuse to run against what looks like the real production project as a
  // last-resort safety net -- this is not a substitute for pointing it at
  // the right place on purpose, just a guard against a copy-pasted env var.
  if (supabaseUrl?.includes("forstsmvakpsreffdiwb")) {
    console.error(
      "RESTORE_SUPABASE_URL points at the production project (forstsmvakpsreffdiwb). " +
        "Restores must target a Supabase branch or a separate project. Refusing to continue."
    );
    process.exit(1);
  }

  const armored = readFileSync(inputPath, "utf8");
  const decrypter = new age.Decrypter();
  decrypter.addIdentity(privateKey);
  const ciphertext = age.armor.decode(armored);
  const decrypted = await decrypter.decrypt(ciphertext, "text");
  const payload = JSON.parse(decrypted);
  const verification = validateBackupPayload(payload, TABLES);

  console.log(`Backup integrity: ${verification.integrity}`);
  console.log("Row counts:", verification.rowCounts);
  if (verifyOnly) {
    console.log("Backup verification complete; no database writes were attempted.");
    return;
  }

  console.log(`Backup exported at ${payload.exported_at} from ${payload.supabase_project_url}`);
  console.log(`Restoring into ${supabaseUrl}...`);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  for (const [table, rows] of Object.entries(payload.tables)) {
    if (!rows.length) {
      console.log(`  ${table}: 0 rows, skipping`);
      continue;
    }
    const { error } = await supabase.from(table).upsert(rows);
    if (error) {
      throw new Error(`Failed to restore "${table}": ${error.message}`);
    }
    console.log(`  ${table}: restored ${rows.length} rows`);
  }

  console.log("Restore complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
