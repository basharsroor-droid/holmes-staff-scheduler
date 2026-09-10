import assert from "node:assert/strict";
import test from "node:test";

import { periodShiftRange, shiftDateRangeAround } from "../../lib/period-window.ts";

test("period range is the month padded by a week on each side", () => {
  assert.deepEqual(periodShiftRange(2026, 10), { from: "2026-09-24", to: "2026-11-07" });
});

test("period range crosses year boundaries", () => {
  assert.deepEqual(periodShiftRange(2027, 1), { from: "2026-12-25", to: "2027-02-07" });
  assert.deepEqual(periodShiftRange(2026, 12), { from: "2026-11-24", to: "2027-01-07" });
});

test("period range handles February in leap and common years", () => {
  assert.equal(periodShiftRange(2028, 2).to, "2028-03-07");
  assert.equal(periodShiftRange(2027, 2).to, "2027-03-07");
});

test("a Sunday-Saturday week starting before the month is inside the range", () => {
  // 1 Nov 2026 is a Sunday; the week of 31 Oct 2026 starts Sunday 25 Oct.
  const { from } = periodShiftRange(2026, 11);
  assert.ok(from <= "2026-10-25", `range starts ${from}`);
});

test("range around a shift date is a week each side", () => {
  assert.deepEqual(shiftDateRangeAround("2026-10-03"), { from: "2026-09-26", to: "2026-10-10" });
  assert.deepEqual(shiftDateRangeAround("2026-12-30"), { from: "2026-12-23", to: "2027-01-06" });
});
