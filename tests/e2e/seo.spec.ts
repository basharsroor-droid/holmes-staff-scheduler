import { expect, test } from "@playwright/test";

// H3 + H5 in docs/REMEDIATION_PLAN.md: robots.txt and sitemap.xml exist,
// private areas are kept out of search, and the home-screen label is the
// product name.

const privatePrefixes = ["/workspace", "/admin", "/support", "/demo", "/pilot", "/manager", "/employee", "/api"];
const publicPaths = ["/pricing", "/about", "/contact", "/terms", "/privacy"];

test("robots.txt is served and blocks every private area", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const body = await response.text();
  for (const prefix of privatePrefixes) expect(body).toContain(`Disallow: ${prefix}`);
  expect(body).toMatch(/Allow: \/\s/);
  expect(body).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
});

test("sitemap.xml lists the public pages and nothing private", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const body = await response.text();
  for (const path of publicPaths) expect(body).toContain(`${path}</loc>`);
  for (const prefix of privatePrefixes) expect(body).not.toContain(`${prefix}</loc>`);
  expect(body).not.toMatch(/<loc>[^<]*\/(workspace|admin|support|demo)[/<]/);
});

test("home-screen label is the product name, not 'SP'", async ({ page, request }) => {
  // iOS reads apple-mobile-web-app-title; Android reads the manifest's short_name.
  await page.goto("/");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "ShiftPilot");
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect((await manifest.json()).short_name).toBe("ShiftPilot");
});
