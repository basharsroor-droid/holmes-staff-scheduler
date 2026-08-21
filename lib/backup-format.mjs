import { createHash } from "node:crypto";

export const BACKUP_FORMAT_VERSION = 1;

function checksumTables(tables) {
  return createHash("sha256").update(JSON.stringify(tables)).digest("hex");
}

export function createBackupPayload({ exportedAt, projectUrl, tables }) {
  const rowCounts = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length]));
  return {
    format_version: BACKUP_FORMAT_VERSION,
    exported_at: exportedAt,
    supabase_project_url: projectUrl,
    row_counts: rowCounts,
    tables_checksum_sha256: checksumTables(tables),
    tables
  };
}

export function validateBackupPayload(payload, expectedTables) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Backup payload must be an object");
  if (typeof payload.exported_at !== "string" || Number.isNaN(Date.parse(payload.exported_at))) throw new Error("Backup exported_at is invalid");
  if (typeof payload.supabase_project_url !== "string" || !payload.supabase_project_url.startsWith("https://")) throw new Error("Backup project URL is invalid");
  if (!payload.tables || typeof payload.tables !== "object" || Array.isArray(payload.tables)) throw new Error("Backup tables are invalid");

  const actualNames = Object.keys(payload.tables);
  const missing = expectedTables.filter((name) => !actualNames.includes(name));
  const unexpected = actualNames.filter((name) => !expectedTables.includes(name));
  if (missing.length || unexpected.length) {
    throw new Error(`Backup table set mismatch; missing=${missing.join(",") || "none"}; unexpected=${unexpected.join(",") || "none"}`);
  }
  for (const [name, rows] of Object.entries(payload.tables)) {
    if (!Array.isArray(rows)) throw new Error(`Backup table ${name} is not an array`);
  }

  if (payload.format_version === undefined) {
    return { integrity: "legacy-unverified", rowCounts: Object.fromEntries(actualNames.map((name) => [name, payload.tables[name].length])) };
  }
  if (payload.format_version !== BACKUP_FORMAT_VERSION) throw new Error(`Unsupported backup format version: ${payload.format_version}`);

  const checksum = checksumTables(payload.tables);
  if (payload.tables_checksum_sha256 !== checksum) throw new Error("Backup checksum mismatch");
  for (const name of actualNames) {
    if (payload.row_counts?.[name] !== payload.tables[name].length) throw new Error(`Backup row count mismatch for ${name}`);
  }
  return { integrity: "verified", rowCounts: payload.row_counts };
}
