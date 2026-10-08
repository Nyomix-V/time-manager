import { format, isSameDay } from 'date-fns';
import type { Clock } from '@/api/types';

// Helpers to DISPLAY the clock events (arrival / pauses / departure).
// Official hour totals come from GET /workingtimes (server-side calculation);
// the only local computation is the live counter of the day in progress,
// which the server cannot provide since the current interval is still open.

export type ClockState = 'none' | 'working' | 'break' | 'out';

export function sortClocks(clocks: Clock[]): Clock[] {
  return [...clocks].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export function clocksOfDay(clocks: Clock[], day: Date = new Date()): Clock[] {
  return sortClocks(clocks).filter((c) => isSameDay(new Date(c.time), day));
}

/** State after the last event of the day ("none" = nothing clocked today). */
export function currentState(todayClocks: Clock[]): ClockState {
  const last = todayClocks.at(-1);
  if (!last) return 'none';
  if (last.type === 'BREAK_START') return 'break';
  if (last.type === 'OUT') return 'out';
  return 'working';
}

export interface DayStats {
  workedMs: number;
  breakMs: number;
  since?: Date; // time of the last event
}

/** Same state machine as the backend (WorkingTimesService.compute), counting open intervals until `now`. */
export function dayStats(todayClocks: Clock[], now: Date = new Date()): DayStats {
  let workedMs = 0;
  let breakMs = 0;
  let workingSince: Date | null = null;
  let breakSince: Date | null = null;
  for (const c of todayClocks) {
    const t = new Date(c.time);
    switch (c.type) {
      case 'IN':
        workingSince ??= t;
        break;
      case 'BREAK_START':
        if (workingSince) workedMs += t.getTime() - workingSince.getTime();
        workingSince = null;
        breakSince = t;
        break;
      case 'BREAK_END':
        if (breakSince) breakMs += t.getTime() - breakSince.getTime();
        breakSince = null;
        workingSince = t;
        break;
      case 'OUT':
        if (workingSince) workedMs += t.getTime() - workingSince.getTime();
        if (breakSince) breakMs += t.getTime() - breakSince.getTime();
        workingSince = null;
        breakSince = null;
        break;
    }
  }
  if (workingSince) workedMs += now.getTime() - workingSince.getTime();
  if (breakSince) breakMs += now.getTime() - breakSince.getTime();
  const last = todayClocks.at(-1);
  return { workedMs, breakMs, since: last ? new Date(last.time) : undefined };
}

export type TimelineItem =
  { kind: 'arrival'; at: Date } | { kind: 'pause'; from: Date; to?: Date } | { kind: 'departure'; at: Date };

/** IN -> arrival, BREAK_START/BREAK_END -> pause (open while ongoing), OUT -> departure. */
export function timeline(todayClocks: Clock[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  let openPause: { kind: 'pause'; from: Date; to?: Date } | null = null;
  for (const c of todayClocks) {
    const t = new Date(c.time);
    if (c.type === 'IN') items.push({ kind: 'arrival', at: t });
    if (c.type === 'BREAK_START') {
      openPause = { kind: 'pause', from: t };
      items.push(openPause);
    }
    if (c.type === 'BREAK_END' && openPause) {
      openPause.to = t;
      openPause = null;
    }
    if (c.type === 'OUT') items.push({ kind: 'departure', at: t });
  }
  return items;
}

export interface DayClocks {
  date: string; // yyyy-MM-dd (local)
  firstIn?: Date;
  lastOut?: Date;
  open: boolean; // still clocked in (working or on break)
}

/** First arrival / last departure per day, for the "Détail par jour" tables. */
export function groupByDay(clocks: Clock[]): Map<string, DayClocks> {
  const days = new Map<string, DayClocks>();
  for (const c of sortClocks(clocks)) {
    const t = new Date(c.time);
    const key = format(t, 'yyyy-MM-dd');
    const day = days.get(key) ?? { date: key, open: false };
    if (c.type === 'IN') day.firstIn ??= t;
    if (c.type === 'OUT') day.lastOut = t;
    day.open = c.type !== 'OUT';
    days.set(key, day);
  }
  return days;
}
