import { defaultBranchId, defaultOrganizationId } from "@/lib/app-config";

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

// These accounts exist only inside the browser-based /demo sandbox. They do
// not authenticate against Supabase, create a server session or grant access
// to any production data. Keeping them here makes that boundary explicit.
export const LOCAL_DEMO_USERS = [
  {
    id: "emp-demo-worker",
    firstName: "עובד דמו",
    lastName: "",
    username: "employee",
    nationalId: "111111111",
    email: "employee@example.com",
    role: "employee" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    emailVerified: true,
    mustChangePassword: false
  },
  {
    id: "emp-demo-manager",
    firstName: "מנהלת דמו",
    lastName: "",
    username: "manager",
    nationalId: "222222222",
    email: "manager@example.com",
    role: "manager" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    emailVerified: true,
    mustChangePassword: false
  }
];

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  username?: string;
  email: string;
  role: "employee" | "manager" | "admin";
  organizationId: string;
  branchId: string;
  emailVerified: boolean;
  mustChangePassword?: boolean;
};
