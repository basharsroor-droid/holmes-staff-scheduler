import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_PRODUCTION_BASE_URL ?? "https://shiftpilothq.com";

if (!baseURL.startsWith("https://")) {
  throw new Error("Production access tests require an HTTPS base URL.");
}

export default defineConfig({
  testDir: "./tests/production",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "off",
    screenshot: "off",
    video: "off"
  }
});
