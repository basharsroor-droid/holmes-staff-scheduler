import assert from "node:assert/strict";
import test from "node:test";

import { shiftBounds, shiftHours, shiftsOverlap, weekStartKey } from "../../lib/shift-time.ts";

const shift = (shift_date, start_time, end_time) => ({ shift_date, start_time, end_time });

test("shiftHours: day, overnight and 24-hour shifts", () => {
  assert.equal(shiftHours(shift("2026-09-13", "08:00", "16:00")), 8);
  assert.equal(shiftHours(shift("2026-09-13", "08:30", "13:15")), 4.75);
  assert.equal(shiftHours(shift("2026-09-13", "22:00", "06:00")), 8);
  assert.equal(shiftHours(shift("2026-09-13", "08:00", "08:00")), 24);
});

test("shiftHours accepts HH:MM:SS as stored by Postgres", () => {
  assert.equal(shiftHours(shift("2026-09-13", "08:00:00", "16:00:00")), 8);
});

test("shiftBounds: overnight end rolls to the next day", () => {
  const { start, end } = shiftBounds(shift("2026-09-13", "22:00", "06:00"));
  assert.equal((end.getTime() - start.getTime()) / 3_600_000, 8);
  assert.equal(end.getUTCDate(), start.getUTCDate() + 1);
});

test("shiftBounds is wall-clock, like the database's tsrange (C2)", () => {
  // Israel springs forward at 02:00 on Friday 2026-03-27 and falls back on
  // Sunday 2026-10-25. The overlap trigger computes shift_date + time as a
  // timestamp without time zone, so these nights are 8 hours there; the
  // browser must agree whatever its own time zone is.
  for (const date of ["2026-03-26", "2026-10-24"]) {
    const { start, end } = shiftBounds(shift(date, "22:00", "06:00"));
    assert.equal((end.getTime() - start.getTime()) / 3_600_000, 8, date);
  }
  const { start } = shiftBounds(shift("2026-09-13", "08:00:00", "16:00:00"));
  assert.equal(start.toISOString(), "2026-09-13T08:00:00.000Z");
});

test("shiftBounds agrees with shiftHours on every shift shape", () => {
  for (const [from, to] of [["08:00", "16:00"], ["22:00", "06:00"], ["08:00", "08:00"], ["23:30", "00:15"]]) {
    const s = shift("2026-03-26", from, to);
    const { start, end } = shiftBounds(s);
    assert.equal((end.getTime() - start.getTime()) / 3_600_000, shiftHours(s), `${from}-${to}`);
  }
});

test("rest gap across a DST night is the same as on any other night", () => {
  const gap = (date, next) => {
    const a = shiftBounds(shift(date, "14:00", "22:00"));
    const b = shiftBounds(shift(next, "06:00", "14:00"));
    return (b.start.getTime() - a.end.getTime()) / 3_600_000;
  };
  assert.equal(gap("2026-03-26", "2026-03-27"), 8);
  assert.equal(gap("2026-09-13", "2026-09-14"), 8);
});

test("shiftsOverlap: overlapping, touching and overnight", () => {
  assert.equal(shiftsOverlap(shift("2026-09-13", "08:00", "16:00"), shift("2026-09-13", "15:00", "23:00")), true);
  assert.equal(shiftsOverlap(shift("2026-09-13", "08:00", "16:00"), shift("2026-09-13", "16:00", "23:00")), false);
  assert.equal(shiftsOverlap(shift("2026-09-13", "22:00", "06:00"), shift("2026-09-14", "05:00", "13:00")), true);
  assert.equal(shiftsOverlap(shift("2026-09-13", "22:00", "06:00"), shift("2026-09-14", "06:00", "14:00")), false);
});

test("weekStartKey: Sunday-Saturday weeks, matching the SQL guardrail", () => {
  // Same three dates asserted against d - extract(dow from d)::int on staging.
  assert.equal(weekStartKey("2026-09-12"), "2026-09-06"); // Saturday
  assert.equal(weekStartKey("2026-09-13"), "2026-09-13"); // Sunday
  assert.equal(weekStartKey("2026-09-14"), "2026-09-13"); // Monday
});

test("weekStartKey crosses month and year boundaries", () => {
  assert.equal(weekStartKey("2026-10-01"), "2026-09-27");
  assert.equal(weekStartKey("2027-01-01"), "2026-12-27");
});

test("weekStartKey is unaffected by daylight-saving changes", () => {
  // Israel moves clocks on Friday 2026-03-27 and Sunday 2026-10-25.
  assert.equal(weekStartKey("2026-03-28"), "2026-03-22");
  assert.equal(weekStartKey("2026-10-25"), "2026-10-25");
  assert.equal(weekStartKey("2026-10-31"), "2026-10-25");
});

test("weekStartKey agrees with the old local-noon implementation", () => {
  const legacy = (date) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() - d.getDay());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2028, 0, 1); t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10);
    assert.equal(weekStartKey(date), legacy(date), date);
  }
});
