// CI gate, run by .github/workflows/schema-invariants.yml against the
// database built from supabase/migrations/. Fails when:
//   - a public table isn't in the nightly backup (or the backup lists a table
//     that no longer exists);
//   - a text/JSON column has no restore rule (kept as-is, or anonymized
//     before it may reach staging);
//   - a table's primary key differs from the one the restore upserts on.
// All three live in lib/backup-tables.mjs.

import pg from "pg";

import { BACKUP_TABLE_NAMES, readSchemaCoverage } from "../lib/backup-tables.mjs";

const databaseUrl = process.env.DB_URL;
if (!databaseUrl) {
  console.error("DB_URL is required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
const { problems, textColumnCount } = await readSchemaCoverage(client);
await client.end();

if (problems.length) {
  for (const problem of problems) console.error(`::error::${problem}`);
  process.exit(1);
}
console.log(`Backup coverage OK: ${BACKUP_TABLE_NAMES.length} tables backed up, ${textColumnCount} text/JSON columns classified.`);
