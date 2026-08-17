import { test } from "node:test";
import assert from "node:assert/strict";

const { computeSupportMetrics } = await import(
  new URL("../../lib/support-metrics.ts", import.meta.url)
);

test("average first-response and resolution times only count tickets that reached that stage", () => {
  const metrics = computeSupportMetrics([
    { created_at: "2026-08-01T00:00:00Z", first_responded_at: "2026-08-01T02:00:00Z", resolved_at: "2026-08-01T10:00:00Z", reopened_count: 0 },
    { created_at: "2026-08-02T00:00:00Z", first_responded_at: "2026-08-02T04:00:00Z", resolved_at: null, reopened_count: 0 },
    { created_at: "2026-08-03T00:00:00Z", first_responded_at: null, resolved_at: null, reopened_count: 0 }
  ]);

  assert.equal(metrics.totalTickets, 3);
  assert.equal(metrics.respondedCount, 2);
  assert.equal(metrics.resolvedCount, 1);
  assert.equal(metrics.avgFirstResponseHours, 3); // (2 + 4) / 2
  assert.equal(metrics.avgResolutionHours, 10);
});

test("reopen rate is measured against every ticket, not just resolved ones", () => {
  const metrics = computeSupportMetrics([
    { created_at: "2026-08-01T00:00:00Z", first_responded_at: null, resolved_at: null, reopened_count: 2 },
    { created_at: "2026-08-01T00:00:00Z", first_responded_at: null, resolved_at: null, reopened_count: 0 },
    { created_at: "2026-08-01T00:00:00Z", first_responded_at: null, resolved_at: null, reopened_count: 0 },
    { created_at: "2026-08-01T00:00:00Z", first_responded_at: null, resolved_at: null, reopened_count: 0 }
  ]);

  assert.equal(metrics.reopenedCount, 1);
  assert.equal(metrics.reopenRatePercent, 25);
});

test("an empty ticket list reports null averages instead of dividing by zero", () => {
  const metrics = computeSupportMetrics([]);

  assert.equal(metrics.totalTickets, 0);
  assert.equal(metrics.avgFirstResponseHours, null);
  assert.equal(metrics.avgResolutionHours, null);
  assert.equal(metrics.reopenRatePercent, null);
});
