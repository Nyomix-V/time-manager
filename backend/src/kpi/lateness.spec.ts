import { countLateDays } from './lateness';

// Expected start 09:00 -> expectedStartMin = 540.
describe('countLateDays', () => {
  const d = (s: string) => new Date(s);

  it('counts a day where first IN is after expected start', () => {
    const late = countLateDays(
      [{ status: 'IN', time: d('2026-10-01T09:15:00Z') }],
      540,
    );
    expect(late).toBe(1);
  });

  it('does not count an on-time arrival', () => {
    const late = countLateDays(
      [{ status: 'IN', time: d('2026-10-01T08:55:00Z') }],
      540,
    );
    expect(late).toBe(0);
  });

  it('uses the FIRST IN of the day, ignoring later ones', () => {
    const late = countLateDays(
      [
        { status: 'IN', time: d('2026-10-01T08:50:00Z') }, // on time
        { status: 'OUT', time: d('2026-10-01T12:00:00Z') },
        { status: 'IN', time: d('2026-10-01T13:30:00Z') }, // after lunch, ignored
      ],
      540,
    );
    expect(late).toBe(0);
  });

  it('counts lateness across several days independently', () => {
    const late = countLateDays(
      [
        { status: 'IN', time: d('2026-10-01T09:30:00Z') }, // late
        { status: 'IN', time: d('2026-10-02T08:45:00Z') }, // on time
        { status: 'IN', time: d('2026-10-03T10:00:00Z') }, // late
      ],
      540,
    );
    expect(late).toBe(2);
  });
});
