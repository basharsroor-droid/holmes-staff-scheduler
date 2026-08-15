import { expect, type Page, test } from "@playwright/test";

async function skipIntro(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("shiftpilot_code_intro_seen_v1", "1");
  });
}

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectPrimaryControlIsTouchable(page: Page) {
  const control = page.locator("button:visible, a.button:visible").first();
  if (await control.count()) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  }
}

async function loginToDemo(page: Page, username: string, password: string) {
  await page.goto("/demo");
  await page.getByLabel("ת.ז / שם משתמש").fill(username);
  await page.getByLabel("סיסמה").fill(password);
  await page.getByRole("button", { name: "כניסה", exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

test("public and authentication routes fit the viewport", async ({ page }) => {
  const routes = [
    "/",
    "/login",
    "/onboarding",
    "/auth/forgot-password",
    "/demo",
    "/terms",
    "/privacy"
  ];

  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
    await expectNoPageOverflow(page);
    await expectPrimaryControlIsTouchable(page);
  }
});

test("mobile marketing navigation scrolls with the page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "mobile-only layout assertion");
  await page.goto("/");

  const shell = page.locator(".marketing-navbar-shell");
  await expect(shell).toBeVisible();
  await expect(shell).toHaveCSS("position", "absolute");
  await expectNoPageOverflow(page);
});

test("mobile onboarding fields and authentication panels stack", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "mobile-only layout assertion");

  await page.goto("/onboarding");
  await expect(page.getByRole("button", { name: "יצירת חשבון מאובטח" })).toBeVisible();
  const nameFields = page.locator(".business-onboarding-card .form-pair .field");
  await expect(nameFields).toHaveCount(2);
  const first = await nameFields.nth(0).boundingBox();
  const second = await nameFields.nth(1).boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(second!.y).toBeGreaterThan(first!.y + first!.height - 2);

  for (const route of ["/login", "/auth/forgot-password", "/demo"]) {
    await page.goto(route);
    const panel = page.locator(route === "/demo" ? ".demo-auth-flow" : ".auth-flow");
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    await expectNoPageOverflow(page);
  }
});

test("manager demo routes remain responsive", async ({ page }) => {
  await loginToDemo(page, "manager", "Admin-1234");
  await expect(page).toHaveURL(/\/pilot$/);

  for (const route of [
    "/pilot",
    "/manager",
    "/manager/schedule",
    "/schedule",
    "/admin/employees",
    "/admin/shift-templates"
  ]) {
    await page.goto(route);
    await expect(page.locator(".app-shell")).toBeVisible();
    await expectNoPageOverflow(page);
  }
});

test("employee demo routes remain responsive", async ({ page }) => {
  await loginToDemo(page, "employee", "Demo-1234");
  await expect(page).toHaveURL(/\/employee$/);

  for (const route of [
    "/employee",
    "/availability",
    "/my-shifts",
    "/schedule",
    "/swap-requests",
    "/manager-requests"
  ]) {
    await page.goto(route);
    await expect(page.locator(".app-shell")).toBeVisible();
    await expectNoPageOverflow(page);
  }
});
