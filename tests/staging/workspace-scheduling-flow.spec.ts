import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";

// The real product's core loop, end to end, against the STAGING database:
//   employees submit availability -> manager generates the month, staffs two
//   shifts and publishes -> an employee sees their shift -> requests a swap ->
//   the colleague accepts -> the manager approves -> the database shows the
//   two assignments exchanged.
//
// Seeded by scripts/staging-workspace-fixture.mjs (starting state only; every
// step below goes through the UI). Run by .github/workflows/staging-workspace-e2e.yml.

type Person = { email: string; password: string; userId: string; name: string };
type Fixture = { periodId: string; templateName: string; owner: Person; alice: Person; bob: Person };

const fixture: Fixture = JSON.parse(
  readFileSync(process.env.STAGING_WORKSPACE_FIXTURE_PATH ?? ".staging-workspace-fixture.json", "utf8")
);

const productTourOutputDir = process.env.PRODUCT_TOUR_OUTPUT_DIR;

async function captureProductTourScreen(page: Page, filename: string) {
  if (!productTourOutputDir) return;
  const outputPath = resolve(productTourOutputDir, filename);
  mkdirSync(dirname(outputPath), { recursive: true });
  await page.screenshot({
    path: outputPath,
    fullPage: false,
    animations: "disabled"
  });
}

async function signIn(
  browser: Browser,
  person: Person,
  viewport: { width: number; height: number }
): Promise<Page> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  // Schedule-builder asks window.confirm() before publishing a month with
  // unstaffed shifts -- which this test deliberately does (it staffs two).
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "כניסה למערכת" })).toBeVisible();
  await page.locator('input[type="email"]').fill(person.email);
  await page.locator('input[autocomplete="current-password"]').fill(person.password);
  await page.getByRole("button", { name: /כניסה מאובטחת/ }).click();
  await page.waitForURL(/\/workspace(\/|$|\?)/);
  return page;
}

async function submitAvailability(page: Page) {
  await page.goto("/workspace/availability");
  const choices = page.getByLabel(new RegExp(`^זמינות ל.*משמרת ${fixture.templateName}$`));
  await choices.nth(0).selectOption("available");
  await choices.nth(1).selectOption("available");
  await page.getByRole("button", { name: /שליחה למנהל/ }).click();
  // The deadline banner also reads "הזמינות נשלחה"; assert the success message.
  await expect(page.getByText("הזמינות נשלחה למנהל בהצלחה")).toBeVisible();
}

test("availability -> schedule -> publish -> swap -> approval", async ({ browser }) => {
  const alice = await signIn(browser, fixture.alice, { width: 430, height: 932 });
  const bob = await signIn(browser, fixture.bob, { width: 430, height: 932 });
  const owner = await signIn(browser, fixture.owner, { width: 1440, height: 1000 });

  await test.step("both employees submit availability", async () => {
    await submitAvailability(alice);
    await captureProductTourScreen(alice, "employee/01-availability-submitted.png");
    await submitAvailability(bob);
  });

  await test.step("manager generates, staffs and publishes the month", async () => {
    await owner.goto("/workspace/schedule-builder");
    await owner.getByRole("button", { name: /יצירת משמרות החודש/ }).click();
    const days = owner.locator(".schedule-day-card");
    await expect(days.first()).toBeVisible();

    const aliceOnDay1 = days.nth(0).locator("button.schedule-worker", { hasText: fixture.alice.name });
    const bobOnDay2 = days.nth(1).locator("button.schedule-worker", { hasText: fixture.bob.name });
    await aliceOnDay1.click();
    await expect(aliceOnDay1).toHaveAttribute("aria-pressed", "true");
    await bobOnDay2.click();
    await expect(bobOnDay2).toHaveAttribute("aria-pressed", "true");
    await captureProductTourScreen(owner, "manager/01-schedule-builder.png");

    await owner.getByRole("button", { name: /פרסום הסידור/ }).click();
    await expect(owner.getByText("פורסם לצוות")).toBeVisible();
    await captureProductTourScreen(owner, "manager/02-published-schedule.png");
  });

  await test.step("the employee sees the published shift", async () => {
    await alice.goto("/workspace/my-shifts");
    await expect(alice.getByText("עדיין אין סידור שפורסם")).toHaveCount(0);
    await expect(alice.getByText("לא שובצת למשמרות בחודש הזה")).toHaveCount(0);
    await expect(alice.getByText(fixture.templateName).first()).toBeVisible();
    await captureProductTourScreen(alice, "employee/02-my-shifts.png");
  });

  await test.step("Alice asks Bob to swap", async () => {
    await alice.goto("/workspace/shift-swaps");
    await alice.getByLabel("המשמרת שלי").selectOption({ index: 1 });
    const target = alice.getByLabel("המשמרת המבוקשת");
    const bobOption = target.locator("option", { hasText: fixture.bob.name }).first();
    await target.selectOption(await bobOption.getAttribute("value") ?? "");
    await alice.getByLabel("סיבת ההחלפה").fill("אירוע משפחתי באותו היום");
    await captureProductTourScreen(alice, "employee/03-swap-request.png");
    await alice.getByRole("button", { name: /שליחת בקשה/ }).click();
    await expect(alice.getByText("הבקשה נשלחה לעובד/ת השני/ה")).toBeVisible();
  });

  await test.step("Bob accepts and forwards to the manager", async () => {
    await bob.goto("/workspace/shift-swaps");
    const accept = bob.getByRole("button", { name: /אישור והעברה למנהל/ });
    await accept.click();
    await expect(accept).toHaveCount(0);
  });

  await test.step("the manager approves", async () => {
    await owner.goto("/workspace/shift-swaps");
    await captureProductTourScreen(owner, "manager/03-swap-approval.png");
    await owner.getByRole("button", { name: /אישור והחלפה/ }).click();
    await expect(owner.getByText("ההחלפה אושרה והסידור עודכן")).toBeVisible();
  });

  await test.step("the database shows the assignments exchanged", async () => {
    const admin = createClient(process.env.STAGING_SUPABASE_URL!, process.env.STAGING_SUPABASE_SECRET_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: shifts, error: shiftsError } = await admin
      .from("shifts").select("id, shift_date").eq("schedule_period_id", fixture.periodId).order("shift_date");
    expect(shiftsError).toBeNull();
    const { data: rows, error } = await admin
      .from("shift_assignments").select("shift_id, user_id").in("shift_id", (shifts ?? []).map((shift) => shift.id));
    expect(error).toBeNull();
    const byDate = new Map((shifts ?? []).map((shift) => [shift.id, shift.shift_date]));
    const staffed = (rows ?? [])
      .map((row) => ({ date: byDate.get(row.shift_id)!, userId: row.user_id }))
      .sort((a, b) => a.date.localeCompare(b.date));
    expect(staffed).toHaveLength(2);
    expect(staffed[0].userId).toBe(fixture.bob.userId);
    expect(staffed[1].userId).toBe(fixture.alice.userId);

    const { data: swaps } = await admin.from("swap_requests").select("status").eq("requested_by", fixture.alice.userId);
    expect(swaps?.map((swap) => swap.status)).toEqual(["approved"]);
  });

  await test.step("a manager starts an empty department from a ready template", async () => {
    await owner.goto("/workspace/shift-templates");
    await owner.getByLabel("מחלקה").selectOption({ label: "צוות מסעדה" });
    await owner
      .getByRole("group", { name: "התחלה מהירה מתבנית" })
      .getByRole("button", { name: /מסעדה/ })
      .click();
    await expect(owner.getByText(/נוספו 2 סוגי משמרות/)).toBeVisible();
    const rows = owner.locator(".shift-template-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "בוקר" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "ערב" })).toHaveCount(1);
  });
});
