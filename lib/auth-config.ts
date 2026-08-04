import { z } from "zod";

export const GOOGLE_USERS_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1rM2bKzVngtF4Ymo1WVKH1J07cNNPbgDxY7wmqBIYp5k/edit";

export const DEMO_VERIFICATION_CODE = "123456";

export const demoLoginUsers = [
  {
    id: "emp-bashar",
    firstName: "בשאר",
    lastName: "",
    nationalId: "111111111",
    email: "bashar@example.com",
    password: "123456",
    role: "employee" as const,
    mustChangePassword: true
  },
  {
    id: "emp-valeria",
    firstName: "ולריה",
    lastName: "",
    nationalId: "222222222",
    email: "valeria@example.com",
    password: "123456",
    role: "manager" as const,
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
  email: string;
  role: "employee" | "manager" | "admin";
  emailVerified: boolean;
  mustChangePassword?: boolean;
};
