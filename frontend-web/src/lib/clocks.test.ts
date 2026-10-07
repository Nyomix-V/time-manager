import type { Clock } from '@/api/types';
import { clocksOfDay, currentState, dayStats, groupByDay, timeline } from './clocks';

const at = (hhmm: string, day = '2026-10-06') => new Date(`${day}T${hhmm}:00`).toISOString();
const clock = (status: 'IN' | 'OUT', hhmm: string, day?: string): Clock => ({
  id: `${status}-${hhmm}-${day}`,
  userId: 'u1',
  status,
  time: at(hhmm, day),
});

const day = new Date('2026-10-06T12:00:00');

describe('currentState', () => {
  it('is none without clocks', () => expect(currentState([])).toBe('none'));
  it('is in after an arrival', () => expect(currentState([clock('IN', '08:57')])).toBe('in'));
  it('is out after a departure', () =>
    expect(currentState([clock('IN', '08:57'), clock('OUT', '12:30')])).toBe('out'));
});

describe('clocksOfDay', () => {
  it('keeps only the given day, sorted', () => {
    const list = [clock('OUT', '12:30'), clock('IN', '08:57'), clock('IN', '09:00', '2026-10-05')];
    expect(clocksOfDay(list, day).map((c) => c.status)).toEqual(['IN', 'OUT']);
  });
});

describe('dayStats', () => {
  it('counts worked time and pauses, including the open interval until now', () => {
    const today = [clock('IN', '09:00'), clock('OUT', '12:30'), clock('IN', '13:15')];
    const stats = dayStats(today, new Date(at('14:15')));
    expect(stats.workedMs / 60_000).toBe(3.5 * 60 + 60); // 09:00-12:30 + 13:15-14:15
    expect(stats.pauseMs / 60_000).toBe(45);
  });

  it('ignores an OUT without a previous IN', () => {
    expect(dayStats([clock('OUT', '10:00')], new Date(at('11:00'))).workedMs).toBe(0);
  });
});

describe('timeline', () => {
  const today = [clock('IN', '08:57'), clock('OUT', '12:30'), clock('IN', '13:15'), clock('OUT', '17:00')];

  it('turns IN/OUT pairs into arrival, pause and departure', () => {
    expect(timeline(today, false).map((i) => i.kind)).toEqual(['arrival', 'pause', 'departure']);
  });

  it('shows a trailing OUT as an ongoing pause when flagged', () => {
    const items = timeline(today.slice(0, 2), true);
    expect(items.at(-1)).toEqual({ kind: 'pause', from: new Date(at('12:30')) });
  });
});

describe('groupByDay', () => {
  it('keeps first arrival and last departure of each day', () => {
    const days = groupByDay([
      clock('IN', '08:57'),
      clock('OUT', '12:30'),
      clock('IN', '13:15'),
      clock('OUT', '17:00'),
    ]);
    const d = days.get('2026-10-06')!;
    expect(d.firstIn?.toISOString()).toBe(at('08:57'));
    expect(d.lastOut?.toISOString()).toBe(at('17:00'));
    expect(d.open).toBe(false);
  });
});
