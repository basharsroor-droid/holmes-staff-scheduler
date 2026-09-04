import { expect, type Page, test } from "@playwright/test";

type Credentials = {
  email: string;
  password: string;
  organization: string;
};

function requiredCredentials(prefix: "OWNER" | "MANAGER" | "EMPLOYEE"): Credentials {
  const email = process.env[`E2E_${prefix}_EMAIL`];
  const password = process.env[`E2E_${prefix}_PASSWORD`];
  const organization = process.env[`E2E_${prefix}_ORGANIZATION`];

  if (!email || !password || !organization) {
    throw new Error(
      `Missing production test secrets for ${prefix}. Expected email, password and organization.`
    );
  }

  return { email, password, organization };
}

function optionalSecondTenantOwner(): Credentials | null {
  const email = process.env.E2E_SECOND_TENANT_OWNER_EMAIL;
  const password = process.env.E2E_SECOND_TENANT_OWNER_PASSWORD;
  const organization = process.env.E2E_SECOND_TENANT_OWNER_ORGANIZATION;
  return email && password && organization ? { email, password, organization } : null;
}

async function login(page: Page, credentials: Credentials) {
  await page.goto("/login");
  await page.getByLabel("כתובת מייל").fill(credentials.email);
  await page.getByLabel("סיסמה").fill(credentials.password);
  await page.getByRole("button", { name: "כניסה מאובטחת" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(
    page.getByRole("heading", { name: `שלום, ${credentials.organization}` })
  ).toBeVisible();
}

test("owner sees owner-only management capabilities", async ({ page }) => {
  const owner = requiredCredentials("OWNER");
  await login(page, owner);

  await expect(page.locator(".role-pill").filter({ hasText: "בעל/ת העסק" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ניהול עובדים" })).toBeVisible();
  await expect(page.getByRole("link", { name: "בניית סידור" })).toBeVisible();
  await expect(page.getByRole("link", { name: "יומן פעילות" })).toBeVisible();
});

test("manager can access scheduling operations but cannot open the owner audit log", async ({ page }) => {
  const manager = requiredCredentials("MANAGER");
  await login(page, manager);

  await expect(page.locator(".role-pill").filter({ hasText: "מנהל/ת" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ניהול עובדים" })).toBeVisible();
  await expect(page.getByRole("link", { name: "בניית סידור" })).toBeVisible();
  await expect(page.getByRole("link", { name: "יומן פעילות" })).toHaveCount(0);

  for (const route of [
    "/workspace/command-center",
    "/workspace/open-shifts",
    "/workspace/schedule-builder",
    "/workspace/work-months"
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
  }

  await page.goto("/workspace/audit-log");
  await expect(page).toHaveURL(/\/workspace$/);
});

test("department manager never sees a forbidden department or employee", async ({ page }) => {
  const manager = requiredCredentials("MANAGER");
  const allowedDepartment = process.env.E2E_MANAGER_ALLOWED_DEPARTMENT;
  const forbiddenDepartment = process.env.E2E_MANAGER_FORBIDDEN_DEPARTMENT;
  const allowedEmployee = process.env.E2E_MANAGER_ALLOWED_EMPLOYEE;
  const forbiddenEmployee = process.env.E2E_MANAGER_FORBIDDEN_EMPLOYEE;

  test.skip(
    !allowedDepartment || !forbiddenDepartment || !allowedEmployee || !forbiddenEmployee,
    "Department-boundary production fixtures are not configured."
  );

  await login(page, manager);

  await page.goto("/workspace/departments");
  await expect(page.locator("body")).toContainText(allowedDepartment!);
  await expect(page.locator("body")).not.toContainText(forbiddenDepartment!);

  await page.goto("/workspace/employees");
  await expect(page.locator("body")).toContainText(allowedEmployee!);
  await expect(page.locator("body")).not.toContainText(forbiddenEmployee!);

  for (const route of [
    "/workspace/command-center",
    "/workspace/open-shifts",
    "/workspace/schedule-builder",
    "/workspace/shift-swaps"
  ]) {
    await page.goto(route);
    await expect(page.locator("body")).not.toContainText(forbiddenDepartment!);
    await expect(page.locator("body")).not.toContainText(forbiddenEmployee!);
  }
});

test("employee sees employee tools and is blocked from management routes", async ({ page }) => {
  const employee = requiredCredentials("EMPLOYEE");
  await login(page, employee);

  await expect(page.locator(".role-pill").filter({ hasText: "עובד/ת" })).toBeVisible();
  await expect(page.getByRole("link", { name: "הגשת זמינות" })).toBeVisible();
  await expect(page.getByRole("link", { name: "המשמרות שלי" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ניהול עובדים" })).toHaveCount(0);

  for (const route of [
    "/workspace/command-center",
    "/workspace/employees",
    "/workspace/schedule-builder",
    "/workspace/submissions",
    "/workspace/work-months",
    "/workspace/audit-log"
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/workspace$/);
    await expect(
      page.getByRole("heading", { name: `שלום, ${employee.organization}` })
    ).toBeVisible();
  }
});

test("owners from separate businesses never see the other organization", async ({ page }) => {
  const firstTenant = requiredCredentials("OWNER");
  const secondTenant = optionalSecondTenantOwner();
  test.skip(!secondTenant, "Second isolated production tenant is not configured.");
  if (!secondTenant) return;

  await login(page, firstTenant);
  await expect(page.locator("body")).not.toContainText(secondTenant.organization);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await login(page, secondTenant);
  await expect(page.locator("body")).not.toContainText(firstTenant.organization);
});
