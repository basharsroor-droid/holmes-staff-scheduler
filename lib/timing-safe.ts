// Constant-time string comparison for shared secrets (E5 in
// docs/REMEDIATION_PLAN.md).
//
// `a === b` returns as soon as the first character differs, so in principle
// the response time leaks how much of a guessed secret was right. With a
// high-entropy secret this isn't practically exploitable, but the fix is
// one line of intent.
//
// crypto.timingSafeEqual throws on inputs of different lengths, and an
// explicit length check would itself leak the secret's length. Hashing both
// sides first gives two 32-byte digests, compared in constant time.
//
// No "@/" imports on purpose: tests/unit loads this file directly with
// Node's type stripping.

import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** True when both strings are equal, in time independent of where they differ. */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * Checks an `Authorization: Bearer <secret>` header against the expected
 * secret. False when the secret is unset or empty, so an unconfigured
 * environment never accepts requests.
 */
export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  return safeEqual(header ?? "", `Bearer ${secret}`);
}
