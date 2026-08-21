import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = required("SUPABASE_SECRET_KEY");
const productionUrl = (process.env.PRODUCTION_URL ?? "https://www.shiftpilothq.com").replace(/\/$/, "");
const outputPath = resolve(process.env.SCREENSHOT_PATH ?? "artifacts/iphone-6.9-shift-swaps.png");
const admin = createClient(supabaseUrl, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}});
const suffix = randomBytes(8).toString("hex");
const email = `screenshot-${suffix}@shiftpilot.invalid`;
const password = `Screenshot!${randomBytes(18).toString("base64url")}`;
let userId = null;
let browser = null;

try {
  const {data: created, error: createError} = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {first_name: "נועה", last_name: "מנהלת"}
  });
  if (createError || !created.user) throw createError ?? new Error("Disposable user was not created");
  userId = created.user.id;

  const {data: organization, error: organizationError} = await admin
    .from("organizations")
    .select("id")
    .eq("is_demo", true)
    .single();
  if (organizationError) throw organizationError;
  const {data: branch, error: branchError} = await admin
    .from("branches")
    .select("id")
    .eq("organization_id", organization.id)
    .order("created_at")
    .limit(1)
    .single();
  if (branchError) throw branchError;
  const {data: department, error: departmentError} = await admin
    .from("departments")
    .select("id")
    .eq("branch_id", branch.id)
    .order("created_at")
    .limit(1)
    .single();
  if (departmentError) throw departmentError;

  const {error: profileError} = await admin.from("profiles").insert({id: userId, first_name: "נועה", last_name: "מנהלת", color: "#7c3aed"});
  if (profileError) throw profileError;
  const {data: membership, error: membershipError} = await admin.from("organization_memberships").insert({
    organization_id: organization.id,
    branch_id: branch.id,
    user_id: userId,
    role: "owner",
    status: "active",
    joined_at: new Date().toISOString(),
    access_scope: "organization"
  }).select("id").single();
  if (membershipError) throw membershipError;
  const {error: departmentMembershipError} = await admin.from("department_memberships").insert({
    department_id: department.id,
    membership_id: membership.id,
    organization_id: organization.id,
    branch_id: branch.id,
    is_primary: true
  });
  if (departmentMembershipError) throw departmentMembershipError;

  browser = await chromium.launch({headless: true});
  const context = await browser.newContext({
    viewport: {width: 440, height: 956},
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 ShiftPilotNativeApp"
  });
  const page = await context.newPage();
  await page.goto(`${productionUrl}/login`, {waitUntil: "networkidle"});
  await page.getByLabel("כתובת מייל").fill(email);
  await page.getByLabel("סיסמה").fill(password);
  await page.getByRole("button", {name: "כניסה מאובטחת"}).click();
  await page.waitForURL(/\/workspace$/);
  await page.goto(`${productionUrl}/workspace/shift-swaps`, {waitUntil: "networkidle"});
  await page.getByRole("heading", {name: "בקשות החלפה"}).waitFor();
  await page.getByText("ממתינה למנהל/ת", {exact: true}).waitFor();
  await page.addStyleTag({content: "html { scrollbar-width: none; } ::-webkit-scrollbar { display: none; }"});
  await mkdir(dirname(outputPath), {recursive: true});
  await page.screenshot({path: outputPath, fullPage: false});
  console.log(`Captured ${outputPath}`);
} finally {
  await browser?.close();
  if (userId) {
    const {error} = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
}
