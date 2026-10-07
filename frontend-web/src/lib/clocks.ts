import { format, isSameDay } from 'date-fns';
import type { Clock } from '@/api/types';

// Helpers to DISPLAY the raw clock events (arrival / pause / departure).
// Official hour totals come from GET /workingtimes (server-side calculation);
// the only local computation is the live counter of the day in progress,
// which the server cannot provide since the last interval is still open.

export type ClockState = 'none' | 'in' | 'out';

export interface DayClocks {
  date: string; // yyyy-MM-dd (local)
  firstIn?: Date;
  lastOut?: Date;
  open: boolean; // still clocked in
}

export function sortClocks(clocks: Clock[]): Clock[] {
  return [...clocks].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export function clocksOfDay(clocks: Clock[], day: Date = new Date()): Clock[] {
  return sortClocks(clocks).filter((c) => isSameDay(new Date(c.time), day));
}

export function currentState(todayClocks: Clock[]): ClockState {
  const last = todayClocks.at(-1);
  if (!last) return 'none';
  return last.status === 'IN' ? 'in' : 'out';
}

export interface DayStats {
  workedMs: number;
  pauseMs: number;
  since?: Date; // time of the last event
}

/** Live stats for the current day: worked time (open interval counted until `now`) and pauses. */
export function dayStats(todayClocks: Clock[], now: Date = new Date()): DayStats {
  let workedMs = 0;
  let pauseMs = 0;
  let openIn: Date | null = null;
  let lastOut: Date | null = null;
  for (const c of todayClocks) {
    const t = new Date(c.time);
    if (c.status === 'IN') {
      if (lastOut) pauseMs += t.getTime() - lastOut.getTime();
      openIn = t;
      lastOut = null;
    } else if (openIn) {
      workedMs += t.getTime() - openIn.getTime();
      openIn = null;
      lastOut = t;
    }
  }
  if (openIn) workedMs += now.getTime() - openIn.getTime();
  const last = todayClocks.at(-1);
  return { workedMs, pauseMs, since: last ? new Date(last.time) : undefined };
}

export type TimelineItem =
  { kind: 'arrival'; at: Date } | { kind: 'pause'; from: Date; to?: Date } | { kind: 'departure'; at: Date };

/** IN, OUT, IN, OUT -> arrival, pause (OUT->IN), departure. A trailing OUT is a pause or a departure. */
export function timeline(todayClocks: Clock[], trailingOutIsPause: boolean): TimelineItem[] {
  const items: TimelineItem[] = [];
  todayClocks.forEach((c, i) => {
    const t = new Date(c.time);
    if (c.status === 'IN' && i === 0) items.push({ kind: 'arrival', at: t });
    if (c.status === 'OUT') {
      const next = todayClocks[i + 1];
      if (next) items.push({ kind: 'pause', from: t, to: new Date(next.time) });
      else if (trailingOutIsPause) items.push({ kind: 'pause', from: t });
      else items.push({ kind: 'departure', at: t });
    }
  });
  return items;
}

/** First arrival / last departure per day, for the "Détail par jour" tables. */
export function groupByDay(clocks: Clock[]): Map<string, DayClocks> {
  const days = new Map<string, DayClocks>();
  for (const c of sortClocks(clocks)) {
    const t = new Date(c.time);
    const key = format(t, 'yyyy-MM-dd');
    const day = days.get(key) ?? { date: key, open: false };
    if (c.status === 'IN') {
      day.firstIn ??= t;
      day.open = true;
    } else {
      day.lastOut = t;
      day.open = false;
    }
    days.set(key, day);
  }
  return days;
}
