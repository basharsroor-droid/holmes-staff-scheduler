import { expect, test } from "@playwright/test";

test("marketing page exposes the primary product journeys", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/ShiftPilot/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("כל המשמרות");
  // "פתיחת סביבת עבודה" is now the one consistent open-account CTA copy
  // sitewide (hero, closing CTA, mobile sticky bar, footer -- unified
  // from "פתיחת עסק"/"פתיחת עסק חדש" during the copy pass), so it
  // legitimately matches more than one link on this page now -- .first()
  // still proves the primary journey is present and visible.
  await expect(page.getByRole("link", { name: /פתיחת סביבת עבודה/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /לצפייה בדמו/ }).first()).toBeVisible();
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
  await page.getByRole("button", { name: "יש לי עסק עם צוות אחד" }).click();
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

// The native (Capacitor) app's entry point -- capacitor.config.ts points
// server.url here instead of at "/" so opening the app skips marketing
// content entirely, even for a brand-new user with no ShiftPilot account.
test("the native app entry route redirects straight to login, not marketing", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: `${window.navigator.userAgent} ShiftPilotNativeApp`,
      configurable: true
    });
  });
  await page.goto("/app");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "כניסה למערכת" })).toBeVisible();
  await expect(page.getByText("האפליקציה פתוחה לעובדים, למנהלים ולבעלי עסקים מכל ארגון שנרשם לשירות.")).toBeVisible();
  const signupLink = page.getByRole("link", { name: /הקמת עסק חדש/ });
  await expect(signupLink).toBeVisible();
  await expect(signupLink).toHaveAttribute("href", "https://www.shiftpilothq.com/onboarding");
  await expect(signupLink).toHaveAttribute("target", "_blank");
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

// PWA foundation (roadmap phase 7, step 1). Two things caught real bugs
// during manual verification and are worth locking in as regression
// tests: the /offline route needs to be reachable without a session
// (it was silently redirected home by AppShell's route allowlist, the
// same class of bug PR #136 fixed for /about), and the manifest needs
// to actually resolve and carry the fields a browser's install
// criteria check for.
test("PWA manifest is served with the expected installability fields", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.name).toBe("ShiftPilot");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(true);
});

test("the offline fallback page is reachable without a session", async ({ page }) => {
  await page.goto("/offline");

  await expect(page).toHaveURL(/\/offline$/);
  await expect(page.getByRole("heading", { name: "אי אפשר להתחבר כרגע." })).toBeVisible();
});
