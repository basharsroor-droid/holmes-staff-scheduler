import { expect, type Page, test } from "@playwright/test";

// H4 in docs/REMEDIATION_PLAN.md: the first screen of the home page on a phone
// showed seven buttons that led to three places ("open a workspace" x3,
// "demo" x3, "log in"). It should offer one primary and one secondary action.

// Both storages: before G3 the intro read sessionStorage, after it
// localStorage. Setting both keeps this spec correct in either order of
// merge -- and while the intro plays the page can't scroll and the hero's
// buttons haven't revealed yet, which is what made the first run fail.
async function skipIntro(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("shiftpilot_code_intro_seen_v1", "1");
    window.sessionStorage.setItem("shiftpilot_code_intro_seen_v1", "1");
  });
}

async function visibleLinksTo(page: Page, href: string) {
  return page.evaluate((target) => {
    const viewportHeight = window.innerHeight;
    return [...document.querySelectorAll<HTMLAnchorElement>(`a[href="${target}"]`)].filter((link) => {
      const box = link.getBoundingClientRect();
      const style = getComputedStyle(link);
      let node: HTMLElement | null = link;
      while (node) {
        const s = getComputedStyle(node);
        if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") return false;
        node = node.parentElement;
      }
      return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < viewportHeight && style.pointerEvents !== "none";
    }).length;
  }, href);
}

test.describe("mobile home page", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "mobile-chrome", "mobile-only layout assertion");
  });

  test("first screen offers each action once", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The hero's buttons fade in; count once they've revealed, not mid-animation.
    await expect(page.locator('.ch-hero-ctas a[href="/onboarding"]')).toBeVisible();
    await expect.poll(() => visibleLinksTo(page, "/onboarding")).toBe(1);
    await expect.poll(() => visibleLinksTo(page, "/demo")).toBe(1);
    await expect(page.getByRole("link", { name: /כניסה למערכת/ })).toBeVisible();
  });

  test("sticky actions appear only after scrolling", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/");
    const bar = page.locator(".mobile-sticky-actions");
    await expect(bar).toHaveAttribute("aria-hidden", "true");
    await expect(bar).toBeHidden();

    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(bar).toHaveAttribute("aria-hidden", "false");
    await expect(bar).toBeVisible();
  });

  test("control: pricing keeps the header's sign-up button on mobile", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/pricing");
    await expect(page.locator('.marketing-nav-bar a[href="/onboarding"]')).toBeVisible();
  });
});
