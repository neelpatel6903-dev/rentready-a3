/**
 * dates.js
 * Date helpers shared by the About you, Choose a home and Result screens.
 * Everything is built from TODAY, captured once when the app loads, so the
 * allowed move-in window and listing availability are always relative to
 * the current session and never go stale.
 *
 * All ISO strings are built from LOCAL date parts rather than toISOString(),
 * which is UTC — otherwise an evening user in Melbourne (UTC+10/11) would
 * see yesterday's date as "today".
 */

/** Formats a Date as a local yyyy-mm-dd string (no UTC shifting). */
export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a yyyy-mm-dd string into a local-midnight Date. */
export function parseISODate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Adds months, clamping to the end of shorter months (31 Mar + 1 → 30 Apr). */
export function addMonths(date, months) {
  const next = new Date(date);
  const dayOfMonth = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const daysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(dayOfMonth, daysInTargetMonth));
  return next;
}

/** Adds whole weeks using calendar-safe setDate arithmetic. */
export function addWeeks(date, weeks) {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

// en-AU formatters: "3 October 2026" everywhere in the app; listing card
// availability lines use the compact year-less variant ("14 October").
const FULL = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const DAY_MONTH = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long' });

/** "3 October 2026" */
export function formatAU(date) {
  return FULL.format(date);
}

/** "14 October" — compact form for listing cards. */
export function formatAUDayMonth(date) {
  return DAY_MONTH.format(date);
}

// Local midnight of the day the app was loaded.
export const TODAY = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

/** Earliest selectable move-in date (today) as yyyy-mm-dd. */
export const MOVE_IN_MIN = toISODate(TODAY);

/** Latest selectable move-in date (six months out) as yyyy-mm-dd. */
export const MOVE_IN_MAX = toISODate(addMonths(TODAY, 6));