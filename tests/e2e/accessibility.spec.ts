import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicPages = [
  { path: "/", name: "marketing" },
  { path: "/login", name: "SaaS login" },
  { path: "/demo", name: "demo login" }
];

for (const publicPage of publicPages) {
  test(`${publicPage.name} has no automatic WCAG A/AA violations`, async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem("shiftpilot_code_intro_seen_v1", "1");
    });
    await page.goto(publicPage.path);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
