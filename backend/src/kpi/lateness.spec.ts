import { countLateDays } from './lateness';

// Expected start 09:00 -> expectedStartMin = 540.
describe('countLateDays', () => {
  const d = (s: string) => new Date(s);

  it('counts a day where first IN is after expected start', () => {
    expect(
      countLateDays([{ type: 'IN', time: d('2026-10-01T09:15:00Z') }], 540),
    ).toBe(1);
  });

  it('does not count an on-time arrival', () => {
    expect(
      countLateDays([{ type: 'IN', time: d('2026-10-01T08:55:00Z') }], 540),
    ).toBe(0);
  });

  it('uses the FIRST IN of the day', () => {
    expect(
      countLateDays(
        [
          { type: 'IN', time: d('2026-10-01T08:50:00Z') },
          { type: 'BREAK_START', time: d('2026-10-01T12:00:00Z') },
          { type: 'BREAK_END', time: d('2026-10-01T12:45:00Z') },
        ],
        540,
      ),
    ).toBe(0);
  });

  it('counts lateness across several days', () => {
    expect(
      countLateDays(
        [
          { type: 'IN', time: d('2026-10-01T09:30:00Z') },
          { type: 'IN', time: d('2026-10-02T08:45:00Z') },
          { type: 'IN', time: d('2026-10-03T10:00:00Z') },
        ],
        540,
      ),
    ).toBe(2);
  });
});
