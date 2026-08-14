// Node's built-in test runner, not Playwright: @hebcal/core (a transitive
// dependency of lib/israeli-holidays) ships ESM-only with no CJS fallback
// in its package.json exports map. Next.js's own bundler handles that
// transparently for the app, but Playwright's Node-based test runner
// transpiles every .ts file it touches -- including this one transitively
// -- down to CommonJS, and a CJS require() of an ESM-only package fails at
// load time no matter how the import is spelled in the test file itself.
// `node --test` on a plain .mjs file sidesteps that: Node's native ESM
// loader (with its built-in TypeScript type-stripping, available
// unflagged since Node 22.7) loads the real .ts source directly, with no
// transform pipeline in between to force a module-format mismatch.
import { test } from "node:test";
import assert from "node:assert/strict";

const { getIsraeliHolidaysForMonth } = await import(
  new URL("../../lib/israeli-holidays.ts", import.meta.url)
);

// Every Israeli calendar year has exactly 9 statutory paid holidays
// (חוק שעות עבודה ומנוחה) and 2 national memorial days. An earlier version
// of this function extracted each holiday's date via .toISOString() (UTC)
// from a Date meant to be read via local getters. That was wrong in two
// compounding ways, both caught by the tests below:
//   1. It could drop a holiday into the wrong month entirely (verified:
//      Yom HaAtzma'ut on 2025-04-30 went missing from April and only
//      showed up when querying May).
//   2. Even within the same month, it reported every date one day early
//      in any positive-UTC-offset timezone (verified: Rosh Hashana 5787
//      reported as Sep 10-12 instead of the correct Sep 11-13).
// The fix (local getters) was verified timezone-independent by running
// the same query under Asia/Jerusalem, UTC, America/Los_Angeles, and
// Pacific/Auckland and confirming identical output across all four.
const YEARS_TO_CHECK = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

test("every year has exactly 9 statutory chag days and 2 memorial days", () => {
  for (const year of YEARS_TO_CHECK) {
    let chagCount = 0;
    let memorialCount = 0;
    for (let month = 1; month <= 12; month++) {
      for (const holiday of getIsraeliHolidaysForMonth(year, month).values()) {
        if (holiday.kind === "chag") chagCount++;
        if (holiday.kind === "memorial") memorialCount++;
      }
    }
    assert.equal(chagCount, 9, `${year} should have 9 chag days, got ${chagCount}`);
    assert.equal(memorialCount, 2, `${year} should have 2 memorial days, got ${memorialCount}`);
  }
});

test("no holiday is ever returned under a month other than its own date", () => {
  for (const year of YEARS_TO_CHECK) {
    for (let month = 1; month <= 12; month++) {
      const expectedPrefix = `${year}-${String(month).padStart(2, "0")}-`;
      for (const date of getIsraeliHolidaysForMonth(year, month).keys()) {
        assert.equal(date.startsWith(expectedPrefix), true, `${date} returned under ${year}-${month}`);
      }
    }
  }
});

test("2026 Rosh Hashana through Sukkot is categorized correctly", () => {
  const september = getIsraeliHolidaysForMonth(2026, 9);
  assert.equal(september.get("2026-09-11")?.kind, "chagEve"); // Erev Rosh Hashana
  assert.equal(september.get("2026-09-12")?.kind, "chag"); // Rosh Hashana 1
  assert.equal(september.get("2026-09-13")?.kind, "chag"); // Rosh Hashana 2
  assert.equal(september.get("2026-09-20")?.kind, "chagEve"); // Erev Yom Kippur
  assert.equal(september.get("2026-09-21")?.kind, "chag"); // Yom Kippur
  assert.equal(september.get("2026-09-25")?.kind, "chagEve"); // Erev Sukkot
  assert.equal(september.get("2026-09-26")?.kind, "chag"); // Sukkot 1
  assert.equal(september.get("2026-09-27")?.kind, "cholHamoed");
});

test("Yom HaAtzma'ut is categorized as chag in every year checked", () => {
  // Independence Day moves around late April / early May depending on the
  // year to avoid falling adjacent to Shabbat -- check a spread of years
  // rather than a single hardcoded date.
  for (const year of YEARS_TO_CHECK) {
    const foundInYear = [4, 5].some((month) =>
      [...getIsraeliHolidaysForMonth(year, month).values()].some(
        (h) => h.kind === "chag" && h.label.includes("העצמאות")
      )
    );
    assert.equal(foundInYear, true, `Yom HaAtzma'ut missing for ${year}`);
  }
});

test("non-statutory observances (Purim, Chanukah) are excluded", () => {
  // Purim 2026 falls in March; Chanukah 2026 falls in December. Neither is
  // a statutory day off, so neither should appear at all.
  for (const holiday of getIsraeliHolidaysForMonth(2026, 3).values()) {
    assert.equal(holiday.label.includes("פורים"), false);
  }
  for (const holiday of getIsraeliHolidaysForMonth(2026, 12).values()) {
    assert.equal(holiday.label.includes("חנוכה"), false);
  }
});
