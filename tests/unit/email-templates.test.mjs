import { test } from "node:test";
import assert from "node:assert/strict";

const { notificationEmail, renderEmail } = await import(new URL("../../lib/email/templates.ts", import.meta.url));

test("published schedule email is Hebrew, branded and links to the app", () => {
  const template = notificationEmail("schedule_published", { month: 9, year: 2026 }, "https://shiftpilot.example");
  const html = renderEmail(template, "https://shiftpilot.example");
  assert.match(template.subject, /ספטמבר 2026/);
  assert.match(html, /ShiftPilot/);
  assert.match(html, /https:\/\/shiftpilot\.example\/workspace\/my-shifts/);
  assert.match(html, /dir="rtl"/);
});

test("untrusted payload is escaped before rendering", () => {
  const template = notificationEmail("shift_reminder", { name: "<script>alert(1)</script>" }, "https://shiftpilot.example");
  const html = renderEmail(template, "https://shiftpilot.example");
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
