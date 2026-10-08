import type { Clock, ClockType } from '@/api/types';
import { clocksOfDay, currentState, dayStats, groupByDay, timeline } from './clocks';

const at = (hhmm: string, day = '2026-10-06') => new Date(`${day}T${hhmm}:00`).toISOString();
const clock = (type: ClockType, hhmm: string, day?: string): Clock => ({
  id: `${type}-${hhmm}-${day}`,
  userId: 'u1',
  type,
  time: at(hhmm, day),
});

const fullDay = [
  clock('IN', '08:57'),
  clock('BREAK_START', '12:30'),
  clock('BREAK_END', '13:15'),
  clock('OUT', '16:50'),
];

describe('currentState', () => {
  it('follows the IN -> BREAK -> OUT state machine', () => {
    expect(currentState([])).toBe('none');
    expect(currentState(fullDay.slice(0, 1))).toBe('working');
    expect(currentState(fullDay.slice(0, 2))).toBe('break');
    expect(currentState(fullDay.slice(0, 3))).toBe('working');
    expect(currentState(fullDay)).toBe('out');
  });
});

describe('clocksOfDay', () => {
  it('keeps only the given day, sorted', () => {
    const list = [clock('OUT', '16:50'), clock('IN', '08:57'), clock('IN', '09:00', '2026-10-05')];
    expect(clocksOfDay(list, new Date('2026-10-06T12:00:00')).map((c) => c.type)).toEqual(['IN', 'OUT']);
  });
});

describe('dayStats (same rules as the backend WorkingTimesService)', () => {
  it('excludes breaks from worked time', () => {
    const stats = dayStats(fullDay);
    expect(stats.workedMs / 60_000).toBe(3 * 60 + 33 + 3 * 60 + 35); // 08:57-12:30 + 13:15-16:50
    expect(stats.breakMs / 60_000).toBe(45);
  });

  it('counts the open interval until now while working', () => {
    expect(dayStats([clock('IN', '09:00')], new Date(at('10:30'))).workedMs / 60_000).toBe(90);
  });

  it('counts an ongoing break until now and stops the work counter', () => {
    const stats = dayStats(fullDay.slice(0, 2), new Date(at('12:42')));
    expect(stats.breakMs / 60_000).toBe(12);
    expect(stats.workedMs / 60_000).toBe(3 * 60 + 33);
  });
});

describe('timeline', () => {
  it('turns events into arrival, pause and departure', () => {
    expect(timeline(fullDay).map((i) => i.kind)).toEqual(['arrival', 'pause', 'departure']);
  });

  it('keeps an ongoing pause open', () => {
    expect(timeline(fullDay.slice(0, 2)).at(-1)).toEqual({ kind: 'pause', from: new Date(at('12:30')) });
  });
});

describe('groupByDay', () => {
  it('keeps first arrival and last departure of each day', () => {
    const d = groupByDay(fullDay).get('2026-10-06')!;
    expect(d.firstIn?.toISOString()).toBe(at('08:57'));
    expect(d.lastOut?.toISOString()).toBe(at('16:50'));
    expect(d.open).toBe(false);
  });

  it('marks a day still in progress (on break) as open', () => {
    expect(groupByDay(fullDay.slice(0, 2)).get('2026-10-06')!.open).toBe(true);
  });
});
