import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createBackupPayload, validateBackupPayload } from "../../lib/backup-format.mjs";

const expectedTables = ["organizations", "profiles"];

test("new backups include verifiable row counts and checksum", () => {
  const payload = createBackupPayload({
    exportedAt: "2026-08-21T12:00:00.000Z",
    projectUrl: "https://example.supabase.co",
    tables: { organizations: [{ id: "1" }], profiles: [] }
  });
  assert.deepEqual(validateBackupPayload(payload, expectedTables), {
    integrity: "verified",
    formatVersion: 2,
    rowCounts: { organizations: 1, profiles: 0 }
  });
});

test("format 1 backups still verify", () => {
  const tables = { organizations: [{ id: "1" }], profiles: [] };
  const payload = {
    format_version: 1,
    exported_at: "2026-09-11T02:17:00.000Z",
    supabase_project_url: "https://example.supabase.co",
    row_counts: { organizations: 1, profiles: 0 },
    tables_checksum_sha256: createHash("sha256").update(JSON.stringify(tables)).digest("hex"),
    tables
  };
  assert.equal(validateBackupPayload(payload, expectedTables).formatVersion, 1);
});

test("an unknown format version is refused", () => {
  const payload = createBackupPayload({
    exportedAt: "2026-08-21T12:00:00.000Z",
    projectUrl: "https://example.supabase.co",
    tables: { organizations: [], profiles: [] }
  });
  payload.format_version = 3;
  assert.throws(() => validateBackupPayload(payload, expectedTables), /Unsupported backup format version: 3/);
});

test("tampered backup data fails checksum validation", () => {
  const payload = createBackupPayload({
    exportedAt: "2026-08-21T12:00:00.000Z",
    projectUrl: "https://example.supabase.co",
    tables: { organizations: [], profiles: [] }
  });
  payload.tables.profiles.push({ id: "unexpected" });
  assert.throws(() => validateBackupPayload(payload, expectedTables), /checksum mismatch/);
});

test("missing or unexpected tables fail before a restore can write", () => {
  const payload = createBackupPayload({
    exportedAt: "2026-08-21T12:00:00.000Z",
    projectUrl: "https://example.supabase.co",
    tables: { organizations: [] }
  });
  assert.throws(() => validateBackupPayload(payload, expectedTables), /table set mismatch/);
});
