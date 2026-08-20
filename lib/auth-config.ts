import { z } from "zod";
import { defaultBranchId, defaultOrganizationId } from "@/lib/app-config";

export const GOOGLE_USERS_SHEET_URL =
  process.env.GOOGLE_USERS_SHEET_URL ?? "";

export const DEMO_VERIFICATION_CODE = "123456";

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

export const demoLoginUsers = [
  {
    id: "emp-demo-worker",
    firstName: "עובד דמו",
    lastName: "",
    username: "employee",
    nationalId: "111111111",
    email: "employee@example.com",
    password: "Demo-1234",
    role: "employee" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    mustChangePassword: false
  },
  {
    id: "emp-demo-manager",
    firstName: "מנהלת דמו",
    lastName: "",
    username: "manager",
    nationalId: "222222222",
    email: "manager@example.com",
    password: "Admin-1234",
    role: "manager" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    mustChangePassword: false
  },
  {
    id: "emp-demo-cafe-manager",
    firstName: "דנה",
    lastName: "",
    username: "דנה",
    nationalId: "333333333",
    email: "cafe-manager@example.com",
    password: "123456",
    role: "manager" as const,
    organizationId: "demo-cafe",
    branchId: "demo-cafe-main",
    mustChangePassword: true
  }
];

export const registerUserSchema = z.object({
  firstName: z.string().min(2, "שם פרטי קצר מדי"),
  lastName: z.string().min(2, "שם משפחה קצר מדי"),
  nationalId: z
    .string()
    .regex(/^\d{5,10}$/, "ת.ז צריכה להכיל ספרות בלבד"),
  password: z.string().min(6, "סיסמה חייבת לפחות 6 תווים"),
  email: z.string().email("מייל לא תקין")
});

export const loginSchema = z.object({
  nationalId: z.string().min(1),
  password: z.string().min(1)
});

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
