import { expect, type Page, test } from "@playwright/test";

async function loginToDemo(page: Page, role: "manager" | "employee") {
  await page.goto("/demo");
  await page.getByRole("button", { name: role === "manager" ? "כניסה לדמו כמנהל/ת" : "כניסה לדמו כעובד/ת" }).click();
  const destination = role === "manager" ? "/pilot" : "/employee";
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
}

async function openMobileNavigationIfNeeded(page: Page) {
  const toggle = page.getByRole("button", { name: "פתיחת תפריט" });
  if (await toggle.isVisible()) await toggle.click();
}

test("employee can update and save monthly availability", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("scheduler-submission-access", "open");
  });
  await loginToDemo(page, "employee");
  await page.goto("/availability");

  await expect(page.getByText("ההגשה פתוחה", { exact: true })).toBeVisible();

  const firstDay = page.locator(".availability-card").first();
  await firstDay.getByRole("button", { name: "לא פנוי", exact: true }).click();
  await expect(firstDay.getByText("לא זמין", { exact: true })).toBeVisible();

  await firstDay.getByRole("button", { name: "פנוי כל היום", exact: true }).click();
  await expect(firstDay.getByText("זמין", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "שמירת הגשה", exact: true }).click();
  await expect(page.getByText("נשמר מקומית", { exact: true })).toBeVisible();
});

test("employee can create a shift swap request", async ({ page }) => {
  await loginToDemo(page, "employee");
  await page.goto("/swap-requests");

  const reason = "בדיקת החלפה אוטומטית";
  await page.getByPlaceholder("למה נדרשת ההחלפה?").fill(reason);
  await page.getByRole("button", { name: "שליחת בקשה", exact: true }).click();

  const createdRequest = page.locator("article.warning-row").filter({ hasText: reason });
  await expect(createdRequest).toBeVisible();
  await expect(createdRequest.getByText("ממתין למנהל", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("למה נדרשת ההחלפה?")).toHaveValue("");
});

test("manager can edit a shift and save the schedule draft", async ({ page }) => {
  await loginToDemo(page, "manager");
  await page.goto("/manager/schedule");

  const firstShift = page.locator(".large-shift-card").first();
  const startTime = firstShift.locator('input[type="time"]').first();
  await startTime.fill("06:15");

  await expect(startTime).toHaveValue("06:15");
  await expect(firstShift.getByText("שעות מותאמות", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "שמירת טיוטה", exact: true }).click();
  await expect(page.getByText("השינוי נשמר במצב הדגמה", { exact: true })).toBeVisible();
});

test("manager can approve a pending shift swap request", async ({ page }) => {
  await loginToDemo(page, "manager");
  await page.goto("/swap-requests");

  await expect(page.getByRole("heading", { name: "בקשות החלפה לאישור" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "יצירת בקשת החלפה" })).toHaveCount(0);

  const pendingRequest = page
    .locator("article.warning-row")
    .filter({ hasText: "מבקש החלפה למשמרת פתיחה" });

  await pendingRequest.getByRole("button", { name: "אישור", exact: true }).click();

  await expect(pendingRequest.getByText("אושר", { exact: true })).toBeVisible();
  await expect(pendingRequest.getByText("הערת מנהל: אושר לאחר בדיקת חוקים")).toBeVisible();
});

test("both demo roles can reach help and support", async ({ page }) => {
  for (const role of ["manager", "employee"] as const) {
    await loginToDemo(page, role);
    await openMobileNavigationIfNeeded(page);
    await page.getByRole("navigation", { name: "ניווט ראשי" })
      .getByRole("link", { name: "עזרה ותמיכה" })
      .click();
    await expect(page).toHaveURL(/\/demo\/help$/);
    await expect(page.getByRole("heading", { name: "עזרה ותמיכה", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "שליחת מייל לתמיכה" })).toHaveAttribute("href", "mailto:support@shiftpilothq.com");
  }
});
