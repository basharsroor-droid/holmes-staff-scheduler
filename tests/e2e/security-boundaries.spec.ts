import { expect, test } from "@playwright/test";

const protectedWorkspaceRoutes = [
  "/workspace",
  "/workspace/availability",
  "/workspace/command-center",
  "/workspace/departments",
  "/workspace/employees",
  "/workspace/my-shifts",
  "/workspace/notifications",
  "/workspace/open-shifts",
  "/workspace/pilot-feedback",
  "/workspace/pilot-launch",
  "/workspace/schedule-builder",
  "/workspace/shift-swaps",
  "/workspace/shift-templates",
  "/workspace/submissions",
  "/workspace/support",
  "/workspace/work-months",
  "/workspace/audit-log"
];

test("all SaaS workspace routes require an authenticated session", async ({ page }) => {
  for (const route of protectedWorkspaceRoutes) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "טוב לראות אותך שוב." })).toBeVisible();
  }
});

test("a malformed Supabase session cookie fails closed", async ({ context, page, baseURL }) => {
  if (!baseURL) throw new Error("Playwright baseURL is required");

  await context.addCookies([{
    name: "sb-example-auth-token",
    value: "base64-this-is-not-a-valid-session",
    url: baseURL
  }]);

  await page.goto("/terms");
  await expect(page.getByRole("link", { name: "חזרה לאתר" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "חזרה למערכת" })).toHaveCount(0);

  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "כניסה למערכת" })).toBeVisible();
  await expect(page.getByText("שלום,", { exact: false })).toHaveCount(0);
});

test("health endpoint is cache-safe and exposes only operational metadata", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");

  const payload = await response.json();
  expect(payload).toMatchObject({ status: "ok", service: "shiftpilot" });
  expect(Object.keys(payload).sort()).toEqual(["service", "status", "version"]);
  expect(JSON.stringify(payload)).not.toMatch(/password|secret|key|token|supabase/i);
});

test("retired mock authentication APIs are not exposed", async ({ request }) => {
  for (const route of ["/api/auth/login", "/api/auth/register"]) {
    const response = await request.post(route, { data: { probe: "must-not-be-processed" } });
    expect([404, 405]).toContain(response.status());
    expect(await response.text()).not.toContain("verificationCode");
  }
});

test("observability ingestion rejects malformed or cross-origin reports", async ({ request }) => {
  const malformed = await request.post("/api/observability/error", {
    headers: { "Content-Type": "application/json" },
    data: { message: "missing required fields" }
  });
  expect(malformed.status()).toBe(400);

  const crossOrigin = await request.post("/api/observability/error", {
    headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
    data: { name: "Error", message: "probe", route: "/", source: "window-error" }
  });
  expect(crossOrigin.status()).toBe(403);
});
