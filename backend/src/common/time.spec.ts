import { businessDay, businessDaysBetween, businessMinutes } from './time';

// Business time zone = Europe/Paris (default of APP_TIMEZONE).
describe('business time (Europe/Paris)', () => {
  const d = (s: string) => new Date(s);

  it('gives the Paris day of an instant, not the UTC one', () => {
    // 22:30 UTC on Oct 1st = 00:30 on Oct 2nd in Paris.
    expect(businessDay(d('2026-10-01T22:30:00Z'))).toBe('2026-10-02');
    expect(businessDay(d('2026-10-01T21:59:00Z'))).toBe('2026-10-01');
  });

  it('gives the Paris minutes since midnight, summer and winter', () => {
    expect(businessMinutes(d('2026-10-01T07:15:00Z'))).toBe(9 * 60 + 15); // UTC+2
    expect(businessMinutes(d('2026-12-01T08:15:00Z'))).toBe(9 * 60 + 15); // UTC+1
  });

  it('lists every day touched by a range', () => {
    expect(
      businessDaysBetween(d('2026-10-05T08:00:00+02:00'), d('2026-10-07T18:00:00+02:00')),
    ).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
  });

  it('handles a single day and the clock change of October 25th', () => {
    expect(
      businessDaysBetween(d('2026-10-05T09:00:00+02:00'), d('2026-10-05T12:00:00+02:00')),
    ).toEqual(['2026-10-05']);
    expect(
      businessDaysBetween(d('2026-10-24T00:00:00+02:00'), d('2026-10-26T23:00:00+01:00')),
    ).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
  });
});
