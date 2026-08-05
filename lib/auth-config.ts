import { z } from "zod";
import { defaultBranchId, defaultOrganizationId } from "@/lib/app-config";

export const GOOGLE_USERS_SHEET_URL =
  process.env.GOOGLE_USERS_SHEET_URL ?? "";

export const DEMO_VERIFICATION_CODE = "123456";

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
