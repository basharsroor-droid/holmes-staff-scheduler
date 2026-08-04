import { z } from "zod";
import { defaultBranchId, defaultOrganizationId } from "@/lib/app-config";

export const GOOGLE_USERS_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1rM2bKzVngtF4Ymo1WVKH1J07cNNPbgDxY7wmqBIYp5k/edit";

export const DEMO_VERIFICATION_CODE = "123456";

export const demoLoginUsers = [
  {
    id: "emp-bashar",
    firstName: "בשאר",
    lastName: "",
    username: "בשאר",
    nationalId: "111111111",
    email: "bashar@example.com",
    password: "Bsh-4821",
    role: "employee" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    mustChangePassword: true
  },
  {
    id: "emp-maayan",
    firstName: "מעיין",
    lastName: "",
    username: "מעיין",
    nationalId: "111111112",
    email: "maayan@example.com",
    password: "Myn-9134",
    role: "employee" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    mustChangePassword: true
  },
  {
    id: "emp-ariel",
    firstName: "אריאל",
    lastName: "",
    username: "אריאל",
    nationalId: "111111113",
    email: "ariel@example.com",
    password: "Arl-6725",
    role: "employee" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    mustChangePassword: true
  },
  {
    id: "emp-gili",
    firstName: "גילי",
    lastName: "",
    username: "גילי",
    nationalId: "111111114",
    email: "gili@example.com",
    password: "Gil-2486",
    role: "employee" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    mustChangePassword: true
  },
  {
    id: "emp-lama",
    firstName: "למא",
    lastName: "",
    username: "למא",
    nationalId: "111111115",
    email: "lama@example.com",
    password: "Lma-8053",
    role: "employee" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    mustChangePassword: true
  },
  {
    id: "emp-nagia",
    firstName: "נגיה",
    lastName: "",
    username: "נגיה",
    nationalId: "111111116",
    email: "nagia@example.com",
    password: "Ngy-3917",
    role: "employee" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    mustChangePassword: true
  },
  {
    id: "emp-lior",
    firstName: "ליאור",
    lastName: "",
    username: "ליאור",
    nationalId: "111111117",
    email: "lior@example.com",
    password: "Lio-7642",
    role: "employee" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    mustChangePassword: true
  },
  {
    id: "emp-keren",
    firstName: "קרן",
    lastName: "",
    username: "קרן",
    nationalId: "111111118",
    email: "keren@example.com",
    password: "Krn-5298",
    role: "employee" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    mustChangePassword: true
  },
  {
    id: "emp-valeria",
    firstName: "ולריה",
    lastName: "",
    username: "ולריה",
    nationalId: "222222222",
    email: "valeria@example.com",
    password: "Val-2026",
    role: "manager" as const,
    organizationId: defaultOrganizationId,
    branchId: defaultBranchId,
    mustChangePassword: true
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
