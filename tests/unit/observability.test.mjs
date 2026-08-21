import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeErrorMessage, sanitizeRoute } from "../../lib/observability.ts";

test("error telemetry removes common personal and secret values", () => {
  const value = sanitizeErrorMessage("Failed for person@example.com with Bearer abc.def.ghi and eyJabcdefghijk.abcdefghijk.abcdefghijk");
  assert.equal(value.includes("person@example.com"), false);
  assert.equal(value.includes("abc.def.ghi"), false);
  assert.match(value, /\[email\]/);
  assert.match(value, /\[redacted\]|\[token\]/);
});

test("error telemetry normalizes and bounds messages", () => {
  assert.equal(sanitizeErrorMessage("  broken\n\nrequest  "), "broken request");
  assert.equal(sanitizeErrorMessage("error ".repeat(200)).length, 500);
  assert.equal(sanitizeErrorMessage(null), "Unknown client error");
});

test("telemetry routes never retain query strings", () => {
  assert.equal(sanitizeRoute("/workspace?token=secret#part"), "/workspace");
  assert.equal(sanitizeRoute("https://evil.example"), "/unknown");
});
