import { expect, test } from "@playwright/test";

test("marketing page exposes the primary product journeys", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/ShiftPilot/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("מהגשת זמינות");
  await expect(page.getByRole("link", { name: /פתיחת סביבת עבודה/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /לצפייה בדמו/ })).toBeVisible();
});

test("login validates empty credentials without contacting auth", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /כניסה מאובטחת/ }).click();

  await expect(page.locator(".auth-message[role='alert']")).toHaveText(
    "יש להזין כתובת מייל וסיסמה."
  );
  await expect(page.getByRole("link", { name: "שכחתי סיסמה" })).toHaveAttribute(
    "href",
    "/auth/forgot-password"
  );
});

test("anonymous visitors cannot enter the workspace", async ({ page }) => {
  await page.goto("/workspace");

  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "כניסה למערכת" })).toBeVisible();
});

test("demo remains available without a SaaS session", async ({ page }) => {
  await page.goto("/demo");

  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.locator("body")).toContainText(/ShiftPilot/i);
});
