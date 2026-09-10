// Date ranges that bound the schedule-builder's "all shifts" queries (B2 in
// docs/REMEDIATION_PLAN.md). The intelligence panels used to download every
// shift the business ever had; they only need the shifts that can affect the
// period in front of the manager.
//
// Seven days of padding on each side covers the two cross-period rules the
// panels check: a Sunday-Saturday week can start up to six days before the
// first of the month (or end six days after the last), and a min-rest gap can
// straddle the boundary.

const PADDING_DAYS = 7;

// Defensive ceiling. A month plus two weeks for a 150-person business is well
// under this; if it's ever hit, the query is wrong, not the business too big.
export const SHIFT_RANGE_LIMIT = 5000;

export type DateRange = { from: string; to: string };

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The period's month, padded by a week on each side. `month` is 1-12. */
export function periodShiftRange(year: number, month: number, paddingDays = PADDING_DAYS): DateRange {
  return {
    from: isoDate(Date.UTC(year, month - 1, 1 - paddingDays)),
    // Day 0 of the next month is the last day of this one.
    to: isoDate(Date.UTC(year, month, paddingDays))
  };
}

/** A single shift date (YYYY-MM-DD), padded by a week on each side. */
export function shiftDateRangeAround(date: string, paddingDays = PADDING_DAYS): DateRange {
  const [year, month, day] = date.split("-").map(Number);
  return {
    from: isoDate(Date.UTC(year, month - 1, day - paddingDays)),
    to: isoDate(Date.UTC(year, month - 1, day + paddingDays))
  };
}
