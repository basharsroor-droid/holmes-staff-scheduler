import { expect, test } from "@playwright/test";

test("marketing page exposes the primary product journeys", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/ShiftPilot/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("כל המשמרות");
  await expect(page.getByRole("link", { name: /פתיחת סביבת עבודה/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /לצפייה בדמו/ })).toBeVisible();
});

test("production responses include browser security headers", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
});

test("health endpoint reports the application version without caching", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  await expect(response.json()).resolves.toMatchObject({ status: "ok", service: "shiftpilot" });
});

test("public legal pages are available and linked from the marketing site", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "תנאי שימוש" })).toBeVisible();
  await expect(page.getByRole("link", { name: "פרטיות" })).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "תנאי שימוש", level: 1 })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "מדיניות פרטיות", level: 1 })).toBeVisible();
});

test("business signup requires legal consent", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "יצירת חשבון מאובטח" }).click();
  await expect(page.getByText("יש לאשר את תנאי השימוש ומדיניות הפרטיות.")).toBeVisible();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
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
