// One source of truth for shift time arithmetic (C1 in docs/REMEDIATION_PLAN.md).
//
// These helpers were copy-pasted into six files under
// app/workspace/schedule-builder. The copies were behaviourally identical;
// this module keeps that behaviour exactly, so replacing them changes no
// result on screen.
//
// Conventions, shared with the database (shift_assignment_overlap_check and
// private.assert_shift_marketplace_eligibility):
//   * an end time at or before the start time means the shift ends the next
//     day (overnight); equal start and end is a 24-hour shift;
//   * a week runs Sunday to Saturday -- the Israeli working week. The SQL
//     guardrail computes it as d - extract(dow from d)::int (migration
//     20260910190000); weekStartKey below returns the same date.
//
// Deliberately NOT changed here: shiftBounds builds Dates in the browser's
// local time zone, as every copy did. Evaluating in the organization's time
// zone is C2, a separate change.
//
// No imports on purpose: tests/unit loads this file directly with Node's
// type stripping, which cannot resolve the "@/" alias.

export type TimedShift = { start_time: string; end_time: string };
export type DatedShift = TimedShift & { shift_date: string };

const MINUTES_PER_DAY = 24 * 60;
const MS_PER_DAY = MINUTES_PER_DAY * 60 * 1000;

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Length of a shift in hours. Overnight when end <= start. */
export function shiftHours(shift: TimedShift): number {
  let minutes = minutesOf(shift.end_time) - minutesOf(shift.start_time);
  if (minutes <= 0) minutes += MINUTES_PER_DAY;
  return minutes / 60;
}

/** Start and end instants of a shift (browser local time; see C2). */
export function shiftBounds(shift: DatedShift): { start: Date; end: Date } {
  const start = new Date(`${shift.shift_date}T${shift.start_time}`);
  let end = new Date(`${shift.shift_date}T${shift.end_time}`);
  if (end <= start) end = new Date(end.getTime() + MS_PER_DAY);
  return { start, end };
}

/** True when the two shifts share any time. Touching end-to-start is not an overlap. */
export function shiftsOverlap(a: DatedShift, b: DatedShift): boolean {
  const first = shiftBounds(a);
  const second = shiftBounds(b);
  return first.start < second.end && second.start < first.end;
}

/**
 * The Sunday that starts the week containing `date` (YYYY-MM-DD), as YYYY-MM-DD.
 * Computed in UTC so a daylight-saving change can never move it.
 */
export function weekStartKey(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() - utc.getUTCDay());
  return utc.toISOString().slice(0, 10);
}
