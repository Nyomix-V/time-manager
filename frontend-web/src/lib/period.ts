import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';

export type PeriodKind = 'week' | 'month' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

const WEEK = { weekStartsOn: 1 } as const; // weeks start on Monday (France)

export function weekRange(anchor: Date = new Date()): DateRange {
  return { from: startOfWeek(anchor, WEEK), to: endOfWeek(anchor, WEEK) };
}

export function monthRange(anchor: Date = new Date()): DateRange {
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

export function dayRange(anchor: Date = new Date()): DateRange {
  return { from: startOfDay(anchor), to: endOfDay(anchor) };
}

/** Number of weeks covered by a range (at least 1), used to turn totals into weekly averages. */
export function weeksIn(range: DateRange): number {
  return Math.max(1, (differenceInCalendarDays(range.to, range.from) + 1) / 7);
}

/** Query-string params understood by the backend (`?from=&to=`). */
export function toApiParams(range: DateRange) {
  return { from: range.from.toISOString(), to: range.to.toISOString() };
}

/** <input type="date"> value. */
export function toInputDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function describeRange(kind: PeriodKind, range: DateRange): string {
  if (kind === 'month') {
    const s = format(range.from, 'MMMM yyyy', { locale: fr });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return `${format(range.from, 'd MMM', { locale: fr })} – ${format(range.to, 'd MMM yyyy', { locale: fr })}`;
}
