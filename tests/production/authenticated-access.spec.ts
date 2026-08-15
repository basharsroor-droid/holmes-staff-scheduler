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

test("manager can manage schedules but cannot open the owner audit log", async ({ page }) => {
  const manager = requiredCredentials("MANAGER");
  await login(page, manager);

  await expect(page.locator(".role-pill").filter({ hasText: "מנהל/ת" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ניהול עובדים" })).toBeVisible();
  await expect(page.getByRole("link", { name: "בניית סידור" })).toBeVisible();
  await expect(page.getByRole("link", { name: "יומן פעילות" })).toHaveCount(0);

  await page.goto("/workspace/audit-log");
  await expect(page).toHaveURL(/\/workspace$/);
});

test("employee sees employee tools and is blocked from management routes", async ({ page }) => {
  const employee = requiredCredentials("EMPLOYEE");
  await login(page, employee);

  await expect(page.locator(".role-pill").filter({ hasText: "עובד/ת" })).toBeVisible();
  await expect(page.getByRole("link", { name: "הגשת זמינות" })).toBeVisible();
  await expect(page.getByRole("link", { name: "המשמרות שלי" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ניהול עובדים" })).toHaveCount(0);

  for (const route of [
    "/workspace/employees",
    "/workspace/schedule-builder",
    "/workspace/submissions",
    "/workspace/audit-log"
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/workspace$/);
    await expect(
      page.getByRole("heading", { name: `שלום, ${employee.organization}` })
    ).toBeVisible();
  }
});

test("owners from separate businesses never see the other organization", async ({ browser }) => {
  const firstTenant = requiredCredentials("OWNER");
  const secondTenant = optionalSecondTenantOwner();
  test.skip(!secondTenant, "Second isolated production tenant is not configured.");
  if (!secondTenant) return;

  const firstContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  await login(firstPage, firstTenant);
  await expect(firstPage.locator("body")).not.toContainText(secondTenant.organization);
  await firstContext.close();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await login(secondPage, secondTenant);
  await expect(secondPage.locator("body")).not.toContainText(firstTenant.organization);
  await secondContext.close();
});
