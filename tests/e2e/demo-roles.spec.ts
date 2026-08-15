import { expect, type Page, test } from "@playwright/test";

async function loginToDemo(page: Page, username: string, password: string) {
  await page.goto("/demo");
  await page.getByLabel("ת.ז / שם משתמש").fill(username);
  await page.getByLabel("סיסמה").fill(password);
  await page.getByRole("button", { name: "כניסה", exact: true }).click();
}

async function openMobileNavigationIfNeeded(page: Page) {
  const toggle = page.getByRole("button", { name: "פתיחת תפריט" });
  if (await toggle.isVisible()) await toggle.click();
}

test("manager demo login opens management tools", async ({ page }) => {
  await loginToDemo(page, "manager", "Admin-1234");

  await expect(page).toHaveURL(/\/pilot$/);
  await expect(page.getByRole("heading", { name: /ShiftPilot לעסקים/ })).toBeVisible();
  await openMobileNavigationIfNeeded(page);
  const navigation = page.getByRole("navigation", { name: "ניווט ראשי" });
  await expect(navigation.getByRole("link", { name: "סידור עבודה" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "עובדים" })).toBeVisible();
  await expect(page.locator(".role-pill:visible").filter({ hasText: /מנהלת דמו · מנהל\/ת/ })).toBeVisible();
});

test("employee demo login exposes only employee navigation", async ({ page }) => {
  await loginToDemo(page, "employee", "Demo-1234");

  await expect(page).toHaveURL(/\/employee$/);
  await expect(page.getByRole("heading", { name: /שלום עובד דמו/ })).toBeVisible();
  await openMobileNavigationIfNeeded(page);
  const navigation = page.getByRole("navigation", { name: "ניווט ראשי" });
  await expect(navigation.getByRole("link", { name: "הגשת סידור" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "המשמרות שלי" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "עובדים" })).toHaveCount(0);
});

test("employee cannot open a manager-only demo route directly", async ({ page }) => {
  await loginToDemo(page, "employee", "Demo-1234");
  await expect(page).toHaveURL(/\/employee$/);

  await page.goto("/admin/employees");

  await expect(page).toHaveURL(/\/employee$/);
  await expect(page.getByRole("heading", { name: /שלום עובד דמו/ })).toBeVisible();
});

test("demo logout clears the role session", async ({ page }) => {
  await loginToDemo(page, "manager", "Admin-1234");
  await expect(page).toHaveURL(/\/pilot$/);

  await openMobileNavigationIfNeeded(page);
  await page.getByRole("button", { name: "יציאה" }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.goto("/pilot");
  await expect(page).toHaveURL(/\/$/);
});
