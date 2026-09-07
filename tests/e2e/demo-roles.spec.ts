import { expect, type Locator, type Page, test } from "@playwright/test";

async function loginToDemo(page: Page, role: "manager" | "employee") {
  await page.goto("/demo");
  await page.getByRole("button", { name: role === "manager" ? "כניסה לדמו כמנהל/ת" : "כניסה לדמו כעובד/ת" }).click();
}

async function getVisibleNavigation(page: Page): Promise<{ navigation: Locator; mobileDock: boolean }> {
  const dock = page.getByRole("navigation", { name: "ניווט מהיר" });
  if (await dock.isVisible()) return { navigation: dock, mobileDock: true };

  const toggle = page.getByRole("button", { name: "פתיחת תפריט" });
  if (await toggle.isVisible()) await toggle.click();
  return { navigation: page.getByRole("navigation", { name: "ניווט ראשי" }), mobileDock: false };
}

test("manager demo login opens management tools", async ({ page }) => {
  await loginToDemo(page, "manager");

  await expect(page).toHaveURL(/\/pilot$/);
  await expect(page.getByRole("heading", { name: /ShiftPilot לעסקים/ })).toBeVisible();
  const { navigation, mobileDock } = await getVisibleNavigation(page);
  await expect(navigation.getByRole("link", { name: mobileDock ? "סידור" : "סידור עבודה" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "עובדים" })).toBeVisible();
  if (!mobileDock) {
    await expect(page.locator(".role-pill:visible").filter({ hasText: /מנהלת דמו · מנהל\/ת/ })).toBeVisible();
  }
});

test("employee demo login exposes only employee navigation", async ({ page }) => {
  await loginToDemo(page, "employee");

  await expect(page).toHaveURL(/\/employee$/);
  await expect(page.getByRole("heading", { name: /שלום עובד דמו/ })).toBeVisible();
  const { navigation, mobileDock } = await getVisibleNavigation(page);
  await expect(navigation.getByRole("link", { name: mobileDock ? "זמינות" : "הגשת סידור" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: mobileDock ? "משמרות" : "המשמרות שלי" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "עובדים" })).toHaveCount(0);
});

test("employee cannot open a manager-only demo route directly", async ({ page }) => {
  await loginToDemo(page, "employee");
  await expect(page).toHaveURL(/\/employee$/);

  await page.goto("/admin/employees");

  await expect(page).toHaveURL(/\/employee$/);
  await expect(page.getByRole("heading", { name: /שלום עובד דמו/ })).toBeVisible();
});

test("demo logout clears the role session", async ({ page }) => {
  await loginToDemo(page, "manager");
  await expect(page).toHaveURL(/\/pilot$/);
  await expect(page.locator(".app-shell")).toBeVisible();

  const dock = page.getByRole("navigation", { name: "ניווט מהיר" });
  const desktopNavigation = page.getByRole("navigation", { name: "ניווט ראשי" });
  await expect(dock.or(desktopNavigation)).toBeVisible();

  if (await dock.isVisible()) {
    await dock.getByRole("button", { name: "עוד" }).click();
    const logout = page.getByRole("button", { name: "יציאה", exact: true });
    await expect(logout).toBeVisible();
    await logout.click();
  } else {
    const toggle = page.getByRole("button", { name: "פתיחת תפריט" });
    if (await toggle.isVisible()) await toggle.click();
    await page.locator("button:visible").filter({ hasText: /^יציאה$/ }).click();
  }

  await expect(page).toHaveURL(/\/$/);
  await page.goto("/pilot");
  await expect(page).toHaveURL(/\/$/);
});
