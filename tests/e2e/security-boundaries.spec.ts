import { expect, test } from "@playwright/test";

const protectedWorkspaceRoutes = [
  "/workspace",
  "/workspace/availability",
  "/workspace/departments",
  "/workspace/employees",
  "/workspace/my-shifts",
  "/workspace/notifications",
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
    await expect(page.getByRole("heading", { name: "כניסה ל־ShiftPilot" })).toBeVisible();
  }
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

test("authentication APIs reject invalid input without echoing credentials", async ({ request }) => {
  const invalidPassword = "NeverEchoThisPassword!";

  const loginResponse = await request.post("/api/auth/login", {
    data: { nationalId: "unknown-user", password: invalidPassword }
  });
  expect(loginResponse.status()).toBe(401);
  const loginBody = await loginResponse.text();
  expect(loginBody).not.toContain(invalidPassword);
  expect(loginBody).not.toContain("unknown-user");

  const registrationResponse = await request.post("/api/auth/register", {
    data: { email: "not-an-email", password: invalidPassword }
  });
  expect(registrationResponse.status()).toBe(400);
  const registrationBody = await registrationResponse.text();
  expect(registrationBody).not.toContain(invalidPassword);
  expect(registrationBody).not.toContain("verificationCode");
});
