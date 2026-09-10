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
// Time is wall-clock (C2). The database does all shift arithmetic on
// shift_date + time, a timestamp WITHOUT time zone: the overlap trigger
// (check_shift_assignment_overlap, tsrange) and the marketplace guardrail
// both treat 22:00-06:00 as 8 hours on every night of the year, with no
// time zone and no DST. shiftBounds therefore reads the date and time as
// naive UTC, so every overlap, rest gap and duration computed here equals
// the server's, whatever time zone the manager's browser is in. (Until C2
// it used browser-local time, so a manager abroad -- or any browser on a
// DST-change night -- could disagree with the server.) The organization's
// timezone column is still used where real instants matter: notification
// scheduling (enqueue_scheduled_notifications, AT TIME ZONE).
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

function wallClock(date: string, time: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes, seconds = 0] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Start and end of a shift as wall-clock instants (naive UTC), matching the
 * database's timestamp-without-time-zone arithmetic. Compare them or subtract
 * getTime(); don't format them as local times.
 */
export function shiftBounds(shift: DatedShift): { start: Date; end: Date } {
  const start = wallClock(shift.shift_date, shift.start_time);
  let end = wallClock(shift.shift_date, shift.end_time);
  if (end <= start) end += MS_PER_DAY;
  return { start: new Date(start), end: new Date(end) };
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
