// A "retard" = the first IN of a day happens after the user's expected start,
// both read in the business time zone (Europe/Paris). A day covered by an
// approved absence (medical appointment, missed clock…) is never counted late.
// Pure function -> unit-testable without a DB.
import { businessDay, businessMinutes } from '../common/time';

export type ClockLike = {
  time: Date;
  type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
};

export function countLateDays(
  clocks: ClockLike[],
  expectedStartMin: number,
  excusedDays: ReadonlySet<string> = new Set(),
): number {
  const firstInByDay = new Map<string, Date>();

  for (const c of clocks) {
    if (c.type !== 'IN') continue;
    const day = businessDay(c.time);
    const existing = firstInByDay.get(day);
    if (!existing || c.time < existing) {
      firstInByDay.set(day, c.time);
    }
  }

  let late = 0;
  for (const [day, firstIn] of firstInByDay) {
    if (excusedDays.has(day)) continue;
    if (businessMinutes(firstIn) > expectedStartMin) late++;
  }
  return late;
}
