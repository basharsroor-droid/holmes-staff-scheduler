import { expect, type Page, test } from "@playwright/test";

// G2 in docs/REMEDIATION_PLAN.md: with the operating system's "reduce motion"
// setting on, nothing on the site may move. Two layers need proving:
//   * framer-motion components (ReducedMotionProvider / MotionConfig), and
//   * CSS animations and transitions (the global safety net in globals.css).
// Every check has a control run without the setting, so a test that stops
// measuring anything fails instead of passing silently.

// The sign-in button carries an endlessly repeating framer-motion shimmer
// (animate x, 2.8s, then a 2s pause). Sampling for 3s spans both phases.
async function shimmerTransforms(page: Page): Promise<Set<string>> {
  await page.goto("/login");
  const button = page.getByRole("button", { name: /כניסה מאובטחת/ });
  const shimmer = button.locator('span[aria-hidden="true"]').first();
  await expect(shimmer).toBeAttached();
  // Sample only after hydration: before React attaches, framer-motion has not
  // applied any value yet, and that first "none" would read as movement.
  await expect(button).toBeEnabled();
  await page.waitForTimeout(1000);
  const seen = new Set<string>();
  for (let i = 0; i < 13; i++) {
    seen.add(await shimmer.evaluate((node) => getComputedStyle(node).transform));
    await page.waitForTimeout(250);
  }
  return seen;
}

async function spinnerAnimationSeconds(page: Page): Promise<number> {
  await page.goto("/login");
  return page.evaluate(() => {
    const probe = document.createElement("span");
    probe.className = "spin";
    document.body.appendChild(probe);
    const seconds = parseFloat(getComputedStyle(probe).animationDuration);
    probe.remove();
    return seconds;
  });
}

test.describe("with reduce motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("framer-motion animations stay still", async ({ page }) => {
    const transforms = await shimmerTransforms(page);
    expect([...transforms]).toHaveLength(1);
  });

  test("CSS animations are effectively disabled", async ({ page }) => {
    expect(await spinnerAnimationSeconds(page)).toBeLessThan(0.001);
  });
});

test.describe("control: without reduce motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the shimmer does move, so the check above measures something", async ({ page }) => {
    const transforms = await shimmerTransforms(page);
    expect(transforms.size).toBeGreaterThan(1);
  });

  test("CSS animations keep their normal duration", async ({ page }) => {
    expect(await spinnerAnimationSeconds(page)).toBeGreaterThan(0.5);
  });
});
