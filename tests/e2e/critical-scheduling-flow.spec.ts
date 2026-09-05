import { expect, type Page, test } from "@playwright/test";

async function loginToDemo(page: Page, role: "manager" | "employee") {
  await page.goto("/demo");
  await page.getByRole("button", {
    name: role === "manager" ? "כניסה לדמו כמנהל/ת" : "כניסה לדמו כעובד/ת"
  }).click();

  await expect(page).toHaveURL(new RegExp(`${role === "manager" ? "/pilot" : "/employee"}$`));
}

test.describe("critical scheduling journey", () => {
  test("employee availability can be submitted before manager scheduling", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("scheduler-submission-access", "open");
    });

    await loginToDemo(page, "employee");
    await page.goto("/availability");

    await expect(page.getByText("ההגשה פתוחה", { exact: true })).toBeVisible();

    const firstDay = page.locator(".availability-card").first();
    await firstDay.getByRole("button", { name: "פנוי כל היום", exact: true }).click();
    await expect(firstDay.getByText("זמין", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "שמירת הגשה", exact: true }).click();
    await expect(page.getByText("נשמר מקומית", { exact: true })).toBeVisible();
  });

  test("manager can review warnings, save a draft and publish a day", async ({ page }) => {
    await loginToDemo(page, "manager");
    await page.goto("/manager/schedule");

    await expect(page.getByRole("heading", { name: "בניית סידור חודשי" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "אזהרות ליום" })).toBeVisible();

    const firstShift = page.locator(".large-shift-card").first();
    await expect(firstShift).toContainText(/טיוטה|פורסם/);

    await page.getByRole("button", { name: "שמירת טיוטה", exact: true }).click();
    await expect(page.getByText("השינוי נשמר במצב הדגמה", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "פרסום היום", exact: true }).click();
    await expect(firstShift).toContainText("פורסם");
  });

  test("manager can publish the full month only through an explicit action", async ({ page }) => {
    await loginToDemo(page, "manager");
    await page.goto("/manager/schedule");

    const shifts = page.locator(".large-shift-card");
    await expect(shifts.first()).toBeVisible();

    await page.getByRole("button", { name: "פרסום כל החודש", exact: true }).click();
    await expect(page.getByText("השינוי נשמר במצב הדגמה", { exact: true })).toBeVisible();

    for (let index = 0; index < Math.min(await shifts.count(), 3); index += 1) {
      await expect(shifts.nth(index)).toContainText("פורסם");
    }
  });

  test("employee can request a swap and manager can approve a pending swap", async ({ page }) => {
    await loginToDemo(page, "employee");
    await page.goto("/swap-requests");

    const reason = "בדיקת E2E לזרימת החלפה";
    await page.getByPlaceholder("למה נדרשת ההחלפה?").fill(reason);
    await page.getByRole("button", { name: "שליחת בקשה", exact: true }).click();

    const createdRequest = page.locator("article.warning-row").filter({ hasText: reason });
    await expect(createdRequest.getByText("ממתין למנהל", { exact: true })).toBeVisible();

    await loginToDemo(page, "manager");
    await page.goto("/swap-requests");

    const pendingRequest = page
      .locator("article.warning-row")
      .filter({ hasText: "מבקש החלפה למשמרת פתיחה" });

    await pendingRequest.getByRole("button", { name: "אישור", exact: true }).click();
    await expect(pendingRequest.getByText("אושר", { exact: true })).toBeVisible();
  });

  test("employee and manager remain separated by role-specific entry points", async ({ page }) => {
    await loginToDemo(page, "employee");
    await expect(page).toHaveURL(/\/employee$/);

    await loginToDemo(page, "manager");
    await expect(page).toHaveURL(/\/pilot$/);

    await page.goto("/manager/schedule");
    await expect(page.getByRole("heading", { name: "בניית סידור חודשי" })).toBeVisible();
  });
});
