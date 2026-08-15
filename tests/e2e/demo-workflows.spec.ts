import { expect, type Page, test } from "@playwright/test";

async function loginToDemo(page: Page, username: string, password: string) {
  await page.goto("/demo");
  await page.getByLabel("ת.ז / שם משתמש").fill(username);
  await page.getByLabel("סיסמה").fill(password);
  await page.getByRole("button", { name: "כניסה", exact: true }).click();
  const destination = username === "manager" ? "/pilot" : "/employee";
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
}

test("employee can update and save monthly availability", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("scheduler-submission-access", "open");
  });
  await loginToDemo(page, "employee", "Demo-1234");
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
  await loginToDemo(page, "employee", "Demo-1234");
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
  await loginToDemo(page, "manager", "Admin-1234");
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
  await loginToDemo(page, "manager", "Admin-1234");
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
