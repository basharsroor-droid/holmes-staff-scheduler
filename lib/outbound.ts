// Email and push only leave the system from a runtime wired to the production
// database. Staging (the E2E suites, a restore drill) holds test or
// anonymized data, and a message sent from there could still reach a real
// person -- so from anywhere else, sending fails instead.
//
// Synthetic recipients written by a staging restore (lib/backup-tables.mjs)
// are refused everywhere, production included.

const PRODUCTION_SUPABASE_REF = "forstsmvakpsreffdiwb";
export const SYNTHETIC_EMAIL_DOMAIN = "restore.invalid";
export const SYNTHETIC_TOKEN_PREFIX = "restore-";

export class OutboundBlockedError extends Error {
  constructor(reason: string) {
    super(`Outbound message blocked: ${reason}`);
    this.name = "OutboundBlockedError";
  }
}

export function outboundBlockReason(recipient: string, env: Record<string, string | undefined> = process.env) {
  if (!(env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes(PRODUCTION_SUPABASE_REF)) {
    return "this runtime is not connected to the production database";
  }
  const value = recipient.trim().toLowerCase();
  if (value.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`) || value.startsWith(SYNTHETIC_TOKEN_PREFIX)) {
    return "the recipient is a synthetic value from a restore";
  }
  return null;
}

export function assertOutboundAllowed(recipient: string) {
  const reason = outboundBlockReason(recipient);
  if (reason) throw new OutboundBlockedError(reason);
}
