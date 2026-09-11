// Short aliases for the three seeded demo accounts, so the email field also
// accepts "owner", "manager" or "employee" on their own.
//
// Why this exists: the demo accounts are real Supabase users with real
// addresses (see scripts/seed-demo-environment.mjs, which creates them in the
// "פיט־זון" organization), but nobody wants to type
// employee-demo@shiftpilothq.com from a phone keyboard -- and App Review's
// Sign-In Information field is easier to fill with a short name too.
//
// This is expansion, not a bypass: the alias only decides WHICH account is
// being signed into, and the password is still checked by Supabase exactly as
// it is for anyone else. Anything containing "@" is passed through untouched,
// so real addresses can never be shadowed by an alias.
export const DEMO_ACCOUNT_ALIASES: Record<string, string> = {
  owner: "owner-demo@shiftpilothq.com",
  manager: "manager-demo@shiftpilothq.com",
  employee: "employee-demo@shiftpilothq.com"
};

export function resolveLoginEmail(input: string): string {
  const value = input.trim();
  if (value.includes("@")) return value;
  return DEMO_ACCOUNT_ALIASES[value.toLowerCase()] ?? value;
}
