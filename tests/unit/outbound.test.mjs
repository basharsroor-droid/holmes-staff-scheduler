import assert from "node:assert/strict";
import test from "node:test";

import { OutboundBlockedError, outboundBlockReason } from "../../lib/outbound.ts";

const production = { NEXT_PUBLIC_SUPABASE_URL: "https://forstsmvakpsreffdiwb.supabase.co" };
const staging = { NEXT_PUBLIC_SUPABASE_URL: "https://sqmstwwrdoenfumligmf.supabase.co" };

test("production may send to real recipients", () => {
  assert.equal(outboundBlockReason("dana@example.com", production), null);
  assert.equal(outboundBlockReason("a1b2c3d4e5", production), null);
});

test("staging and unconfigured runtimes may not send at all", () => {
  assert.match(outboundBlockReason("dana@example.com", staging), /not connected to the production database/);
  assert.match(outboundBlockReason("dana@example.com", {}), /not connected to the production database/);
});

test("synthetic restore recipients are refused even from production", () => {
  for (const recipient of ["user-abc@restore.invalid", " USER-ABC@RESTORE.INVALID ", "restore-0b7e3c1a"]) {
    assert.match(outboundBlockReason(recipient, production), /synthetic value from a restore/, recipient);
  }
});

test("a blocked send fails with a named error", () => {
  const error = new OutboundBlockedError("because");
  assert.equal(error.name, "OutboundBlockedError");
  assert.equal(error.message, "Outbound message blocked: because");
});
