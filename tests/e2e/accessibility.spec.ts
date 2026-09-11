import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Track P1/P2-12 (accessibility plan): automated WCAG A/AA scanning of every
// page reachable without a session. The authenticated /workspace needs a live
// Supabase session; it is exercised end to end against staging by
// tests/staging/workspace-scheduling-flow.spec.ts. The old mock-data demo
// dashboards that used to be scanned here were removed in F1.
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
  { path: "/demo", name: "product tour" },
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" }
];

for (const publicPage of publicPages) {
  test(`${publicPage.name} has no automatic WCAG A/AA violations`, async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("shiftpilot_code_intro_seen_v1", "1"); // intro is remembered per browser since G3
    });
    await page.goto(publicPage.path);
    if (publicPage.path === "/onboarding") {
      await page.getByRole("button", { name: "יש לי עסק עם צוות אחד" }).click();
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
