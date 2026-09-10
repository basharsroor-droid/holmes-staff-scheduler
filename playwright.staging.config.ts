import { defineConfig, devices } from "@playwright/test";

// Real-product end-to-end suite, run against the STAGING Supabase branch.
//
// playwright.config.ts (tests/e2e) covers /demo and the public pages -- which
// never touch a real database. This config runs tests/staging, which signs in
// as real seeded users and drives the actual /workspace flows. See
// .github/workflows/staging-workspace-e2e.yml and docs/REMEDIATION_PLAN.md (D1).
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/staging",
  fullyParallel: false,
  workers: 1,
  // No retries: the flow mutates shared staging state step by step, so a blind
  // retry would re-run it on top of the half-finished first attempt. A failure
  // should be read, not retried.
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 240_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    // Skips the first-visit intro overlay (site-intro.tsx honours it) so it
    // cannot swallow the first click.
    reducedMotion: "reduce",
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run start -- --hostname 127.0.0.1",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000
      }
});
