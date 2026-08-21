import assert from "node:assert/strict";
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
    rowCounts: { organizations: 1, profiles: 0 }
  });
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
