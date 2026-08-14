import { HebrewCalendar, flags as hebcalFlags } from "@hebcal/core";

export type IsraeliHolidayKind = "chag" | "chagEve" | "cholHamoed" | "memorial";

export type IsraeliHoliday = {
  date: string; // "YYYY-MM-DD"
  label: string;
  kind: IsraeliHolidayKind;
};

// Yom HaAtzma'ut is a full statutory holiday but @hebcal/core tags it
// MODERN_HOLIDAY rather than CHAG, so it needs an explicit basename match.
const INDEPENDENCE_DAY_BASENAME = "Yom HaAtzma'ut";
// National memorial days: not a day off, but significant enough (sirens,
// ceremonies) that a manager building the schedule should see them.
const MEMORIAL_BASENAMES = new Set(["Yom HaZikaron", "Yom HaShoah"]);

function cleanLabel(rendered: string) {
  // "Rosh Hashana" renders with a trailing Hebrew-year number
  // (e.g. "ראש השנה 5787") that isn't useful in a scheduling UI.
  return rendered.replace(/\s*\d{4}$/, "").trim();
}

// event.getDate().greg() returns a Date meant to be read via *local*
// calendar fields. Extracting the key via .toISOString() (UTC) instead
// silently shifts it a day earlier on any server running in a positive
// UTC-offset timezone (e.g. Asia/Jerusalem, UTC+2/+3) -- verified this
// was dropping the last day of some months' holidays into the following
// month entirely (e.g. Yom HaAtzma'ut on 2025-04-30 went missing from
// April and only showed up when querying May).
function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Returns Israeli holidays relevant to work scheduling for a given
 * Gregorian year + month (1-12), keyed by "YYYY-MM-DD".
 *
 * Deliberately scoped to what actually affects staffing, not every
 * cultural/religious observance on the Hebrew calendar:
 * - "chag": the 9 statutory paid holidays under Israeli labor law
 *   (חוק שעות עבודה ומנוחה) -- Rosh Hashana (2), Yom Kippur, Sukkot 1st day,
 *   Shmini Atzeret, Pesach 1st + 7th day, Shavuot, and Yom HaAtzma'ut.
 * - "chagEve": the eve of each of those (common early-closing day).
 * - "cholHamoed": the intermediate days of Pesach/Sukkot -- businesses
 *   generally operate, but staff often request time off.
 * - "memorial": Yom HaZikaron and Yom HaShoah -- not days off, but
 *   nationally observed (sirens) and worth flagging.
 *
 * Purim, Chanukah, Tu B'Shvat, Lag BaOmer, and similar non-statutory
 * observances are intentionally left out to keep the calendar focused.
 */
export function getIsraeliHolidaysForMonth(year: number, month: number): Map<string, IsraeliHoliday> {
  const events = HebrewCalendar.calendar({
    year,
    month,
    isHebrewYear: false,
    il: true,
    candlelighting: false,
    noMinorFast: true,
    noRoshChodesh: true,
    noSpecialShabbat: true,
    noModern: false
  });

  const result = new Map<string, IsraeliHoliday>();
  // @hebcal/core's month window isn't a strict Gregorian-month filter: it
  // always includes a holiday's "erev" companion event even when that
  // event's own Gregorian date falls in the previous month (Jewish days
  // start at sunset, so e.g. Erev Pesach on Mar 31 is returned alongside
  // Pesach itself even when querying April). Guard against relying on
  // that boundary behavior by explicitly re-checking every event's own
  // date against the requested month.
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;

  for (const event of events) {
    const eventFlags = event.getFlags();
    const basename = event.basename();
    const dateKey = toDateKey(event.getDate().greg());
    if (!dateKey.startsWith(monthPrefix)) continue;

    if ((eventFlags & hebcalFlags.CHAG) !== 0 || basename === INDEPENDENCE_DAY_BASENAME) {
      result.set(dateKey, { date: dateKey, label: cleanLabel(event.render("he-x-NoNikud")), kind: "chag" });
      continue;
    }

    if (MEMORIAL_BASENAMES.has(basename)) {
      result.set(dateKey, { date: dateKey, label: cleanLabel(event.render("he-x-NoNikud")), kind: "memorial" });
      continue;
    }

    const isPlainEve =
      (eventFlags & hebcalFlags.EREV) !== 0 &&
      (eventFlags & hebcalFlags.MINOR_HOLIDAY) === 0 &&
      (eventFlags & hebcalFlags.MAJOR_FAST) === 0 &&
      (eventFlags & hebcalFlags.MINOR_FAST) === 0;
    if (isPlainEve) {
      result.set(dateKey, { date: dateKey, label: cleanLabel(event.render("he-x-NoNikud")), kind: "chagEve" });
      continue;
    }

    if ((eventFlags & hebcalFlags.CHOL_HAMOED) !== 0 && !result.has(dateKey)) {
      result.set(dateKey, { date: dateKey, label: cleanLabel(event.render("he-x-NoNikud")), kind: "cholHamoed" });
    }
  }

  return result;
}
