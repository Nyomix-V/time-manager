// Business time zone. Clocks are stored in UTC, but "which day?" and "late or not?"
// must be answered in the company's local time: an arrival at 09:15 in Paris is
// 07:15 UTC in summer, and computing in UTC would never flag it as late.
export const BUSINESS_TIME_ZONE = process.env.APP_TIMEZONE ?? 'Europe/Paris';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parts(date: Date) {
  const p: Record<string, string> = {};
  for (const { type, value } of formatter.formatToParts(date)) p[type] = value;
  return p;
}

/** Local day of an instant, as YYYY-MM-DD. */
export function businessDay(date: Date): string {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Local minutes since midnight of an instant (09:15 -> 555). */
export function businessMinutes(date: Date): number {
  const p = parts(date);
  return Number(p.hour) * 60 + Number(p.minute);
}

/** Every local day touched by [start, end], as YYYY-MM-DD (DST-safe: steps of 6 h, deduplicated). */
export function businessDaysBetween(start: Date, end: Date): string[] {
  const days = new Set<string>();
  for (let t = start.getTime(); t <= end.getTime(); t += 6 * 3_600_000) {
    days.add(businessDay(new Date(t)));
  }
  days.add(businessDay(end));
  return [...days].sort();
}
