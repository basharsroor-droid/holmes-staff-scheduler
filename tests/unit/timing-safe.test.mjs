import assert from "node:assert/strict";
import test from "node:test";

import { bearerMatches, safeEqual } from "../../lib/timing-safe.ts";

test("safeEqual: equal and unequal strings, including different lengths", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false); // must not throw on length mismatch
  assert.equal(safeEqual("", ""), true);
  assert.equal(safeEqual("שלום", "שלום"), true); // UTF-8
});

test("bearerMatches accepts only the exact bearer header", () => {
  const secret = "s3cr3t-value";
  assert.equal(bearerMatches("Bearer s3cr3t-value", secret), true);
  assert.equal(bearerMatches("Bearer s3cr3t-valuX", secret), false);
  assert.equal(bearerMatches("bearer s3cr3t-value", secret), false); // same case as before
  assert.equal(bearerMatches("s3cr3t-value", secret), false);
  assert.equal(bearerMatches(null, secret), false);
});

test("bearerMatches rejects everything when the secret is unset or empty", () => {
  assert.equal(bearerMatches("Bearer ", ""), false);
  assert.equal(bearerMatches("Bearer undefined", undefined), false);
  assert.equal(bearerMatches(null, undefined), false);
});
