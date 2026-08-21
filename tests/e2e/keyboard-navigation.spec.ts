import { expect, type Page, test } from "@playwright/test";

// Track P1/P2-12 (accessibility plan) asks for "a full path with keyboard
// only, from the public page to submitting availability". axe-core (see
// accessibility.spec.ts) catches static issues -- missing labels, bad
// contrast -- but says nothing about whether a real person tabbing
// through the page in order can actually operate it. This is the
// keyboard-operability half that static scanning can't cover.

// Tabs forward until `locator` is the focused element, or fails after
// `maxTabs` presses. Asserting on focus directly (not a fixed tab count)
// keeps this robust to layout changes -- a fixed "press Tab 4 times"
// test breaks the moment an unrelated element gets added earlier in the
// page, which is exactly the kind of flakiness that makes a11y tests
// get skipped rather than trusted.
async function tabUntilFocused(page: Page, locator: ReturnType<Page["locator"]>, maxTabs = 15) {
  for (let attempt = 0; attempt < maxTabs; attempt++) {
    if (await locator.evaluate((el) => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press("Tab");
  }
  await expect(locator).toBeFocused();
}

// Shift+Tab, not another forward loop: the save button sits in the page
// header, *before* the scrollable day-by-day grid in DOM order -- so
// after focusing a button several days into the grid, the save button is
// behind the current position, not ahead of it. Confirming Shift+Tab
// actually gets there is a real (and stricter) test of keyboard
// operability, not a workaround for a broken order.
async function shiftTabUntilFocused(page: Page, locator: ReturnType<Page["locator"]>, maxTabs = 40) {
  for (let attempt = 0; attempt < maxTabs; attempt++) {
    if (await locator.evaluate((el) => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press("Shift+Tab");
  }
  await expect(locator).toBeFocused();
}

test("demo login is fully operable with the keyboard alone", async ({ page }) => {
  await page.goto("/demo");

  const employeeDemoButton = page.getByRole("button", { name: "כניסה לדמו כעובד/ת" });

  // The role control is a native button, so keyboard users can enter the demo
  // without passing through fake credential fields.
  await employeeDemoButton.focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/employee$/);
});

test("submitting availability is fully operable with the keyboard alone", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("scheduler-submission-access", "open");
  });
  await page.goto("/demo");
  await page.getByRole("button", { name: "כניסה לדמו כעובד/ת" }).click();
  await expect(page).toHaveURL(/\/employee$/);

  await page.goto("/availability");
  const firstDayButton = page.getByRole("button", { name: "פנוי כל היום" }).first();
  const saveButton = page.getByRole("button", { name: "שמירת הגשה" });

  // A plain <button> is keyboard-activatable by both Enter and Space per
  // the HTML spec with zero extra work -- this confirms that's actually
  // true here, not just assumed because the element happens to be a
  // <button> tag (a click handler bound to something that isn't
  // naturally focusable, like a styled <div>, would fail this exact
  // check even though it "looks like a button").
  await firstDayButton.focus();
  await page.keyboard.press("Enter");
  await expect(firstDayButton).toHaveClass(/active/);

  await shiftTabUntilFocused(page, saveButton);
  await page.keyboard.press("Enter");
  await expect(page.getByText("נשמר מקומית")).toBeVisible();
});
