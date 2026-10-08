import { countLateDays } from './lateness';

// Expected start 09:00 -> expectedStartMin = 540, read in Paris time.
// October 2026 = summer time (UTC+2) until the 25th, December = winter time (UTC+1).
describe('countLateDays', () => {
  const d = (s: string) => new Date(s);

  it('counts a day where first IN is after expected start', () => {
    expect(
      countLateDays([{ type: 'IN', time: d('2026-10-01T09:15:00+02:00') }], 540),
    ).toBe(1);
  });

  it('does not count an on-time arrival', () => {
    expect(
      countLateDays([{ type: 'IN', time: d('2026-10-01T08:55:00+02:00') }], 540),
    ).toBe(0);
  });

  it('reads the hour in Paris time, not UTC', () => {
    // 07:15 UTC = 09:15 in Paris (summer): late, although UTC says "early".
    expect(countLateDays([{ type: 'IN', time: d('2026-10-01T07:15:00Z') }], 540)).toBe(1);
    // 08:30 UTC = 09:30 in Paris (winter): late as well.
    expect(countLateDays([{ type: 'IN', time: d('2026-12-01T08:30:00Z') }], 540)).toBe(1);
    // 07:55 UTC = 08:55 in Paris (winter): on time.
    expect(countLateDays([{ type: 'IN', time: d('2026-12-01T07:55:00Z') }], 540)).toBe(0);
  });

  it('uses the FIRST IN of the day', () => {
    expect(
      countLateDays(
        [
          { type: 'IN', time: d('2026-10-01T08:50:00+02:00') },
          { type: 'BREAK_START', time: d('2026-10-01T12:00:00+02:00') },
          { type: 'BREAK_END', time: d('2026-10-01T12:45:00+02:00') },
          { type: 'OUT', time: d('2026-10-01T15:00:00+02:00') },
          { type: 'IN', time: d('2026-10-01T15:30:00+02:00') },
        ],
        540,
      ),
    ).toBe(0);
  });

  it('counts lateness across several days', () => {
    expect(
      countLateDays(
        [
          { type: 'IN', time: d('2026-10-01T09:30:00+02:00') },
          { type: 'IN', time: d('2026-10-02T08:45:00+02:00') },
          { type: 'IN', time: d('2026-10-03T10:00:00+02:00') },
        ],
        540,
      ),
    ).toBe(2);
  });

  it('never counts a day excused by an approved absence', () => {
    const clocks = [
      { type: 'IN' as const, time: d('2026-10-01T10:30:00+02:00') },
      { type: 'IN' as const, time: d('2026-10-02T09:20:00+02:00') },
    ];
    expect(countLateDays(clocks, 540, new Set(['2026-10-01']))).toBe(1);
    expect(countLateDays(clocks, 540, new Set(['2026-10-01', '2026-10-02']))).toBe(0);
  });

  it("respects the user's own expected start", () => {
    const clocks = [{ type: 'IN' as const, time: d('2026-10-01T09:45:00+02:00') }];
    expect(countLateDays(clocks, 600, new Set())).toBe(0); // expected 10:00
    expect(countLateDays(clocks, 570, new Set())).toBe(1); // expected 09:30
  });
});
