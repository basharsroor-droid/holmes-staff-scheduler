import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Track P1/P2-12 (accessibility plan): automated WCAG coverage below this
// point had only ever run against public/unauthenticated pages. Every
// authenticated route (the demo dashboards, and by extension the same
// component patterns used in the real /workspace -- real SaaS pages need
// a live Supabase session, which CI doesn't have credentials for, but the
// demo routes are reachable with the local mock auth and are the site's
// actual promoted "try it" experience, not internal-only scaffolding) had
// zero automatic scanning on every push, only the one-off manual audit
// from PR #81.
async function loginToDemo(page: Page, role: "manager" | "employee") {
  await page.goto("/demo");
  await page.getByRole("button", { name: role === "manager" ? "כניסה לדמו כמנהל/ת" : "כניסה לדמו כעובד/ת" }).click();
  const destination = role === "manager" ? "/pilot" : "/employee";
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
}

async function scanForViolations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after { animation: none !important; transition: none !important; }
      .scroll-reveal { opacity: 1 !important; transform: none !important; }
    `
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  if (process.env.A11Y_DEBUG && results.violations.length) {
    console.log(JSON.stringify(results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({ target: node.target, html: node.html }))
    }))));
  }
  return results.violations;
}

const publicPages = [
  { path: "/", name: "marketing" },
  { path: "/login", name: "SaaS login" },
  { path: "/onboarding", name: "business onboarding" },
  { path: "/auth/forgot-password", name: "password recovery" },
  { path: "/auth/reset-password", name: "invalid password reset" },
  { path: "/auth/accept-invite?token=invalid", name: "invalid invitation" },
  { path: "/demo", name: "demo login" },
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" }
];

for (const publicPage of publicPages) {
  test(`${publicPage.name} has no automatic WCAG A/AA violations`, async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem("shiftpilot_code_intro_seen_v1", "1");
    });
    await page.goto(publicPage.path);
    if (publicPage.path === "/onboarding") {
      await expect(page.getByRole("button", { name: "יצירת חשבון מאובטח" })).toBeVisible();
    }
    if (publicPage.path === "/auth/reset-password") {
      await expect(page.getByRole("heading", { name: "הקישור אינו תקף" })).toBeVisible();
    }
    if (publicPage.path.startsWith("/auth/accept-invite")) {
      await expect(page.getByRole("heading", { name: "ההזמנה אינה זמינה" })).toBeVisible();
    }
    expect(await scanForViolations(page)).toEqual([]);
  });
}

const managerDemoRoutes = ["/pilot", "/manager", "/manager/schedule", "/schedule", "/admin/employees", "/admin/shift-templates"];
const employeeDemoRoutes = ["/employee", "/availability", "/my-shifts", "/schedule", "/swap-requests", "/manager-requests"];

test("manager demo routes have no automatic WCAG A/AA violations", async ({ page }) => {
  await loginToDemo(page, "manager");
  for (const route of managerDemoRoutes) {
    await page.goto(route);
    await expect(page.locator(".app-shell")).toBeVisible();
    const violations = await scanForViolations(page);
    expect(violations, `${route}: ${JSON.stringify(violations.map((v) => v.id))}`).toEqual([]);
  }
});

test("employee demo routes have no automatic WCAG A/AA violations", async ({ page }) => {
  await loginToDemo(page, "employee");
  for (const route of employeeDemoRoutes) {
    await page.goto(route);
    await expect(page.locator(".app-shell")).toBeVisible();
    const violations = await scanForViolations(page);
    expect(violations, `${route}: ${JSON.stringify(violations.map((v) => v.id))}`).toEqual([]);
  }
});
