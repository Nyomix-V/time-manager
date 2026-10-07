import type { KpiRow } from '@/api/types';
import { summarizeKpi } from './kpi';

const row = (over: Partial<KpiRow>): KpiRow => ({
  userId: 'u',
  name: 'A B',
  totalHours: 0,
  overtimeHours: 0,
  avgDailyHours: 0,
  lateDays: 0,
  lateAlert: false,
  ...over,
});

// 14 days = 2 weeks
const range = { from: new Date('2026-09-01T00:00:00'), to: new Date('2026-09-14T23:59:59') };

describe('summarizeKpi', () => {
  it('averages weekly hours over people who worked', () => {
    const s = summarizeKpi(
      [
        row({ userId: 'a', totalHours: 70, avgDailyHours: 7 }),
        row({ userId: 'b', totalHours: 60, avgDailyHours: 6 }),
        row({ userId: 'c' }),
      ],
      range,
    );
    expect(s.headcount).toBe(3);
    expect(s.avgWeeklyHours).toBe(32.5); // (35 + 30) / 2, "c" did not work
    expect(s.avgDailyHours).toBe(6.5);
  });

  it('sums overtime and lateness, and sorts alerts by lateness', () => {
    const s = summarizeKpi(
      [
        row({ userId: 'a', name: 'Hugo G', overtimeHours: 2, lateDays: 4, lateAlert: true }),
        row({ userId: 'b', name: 'Thomas P', overtimeHours: 1, lateDays: 5, lateAlert: true }),
        row({ userId: 'c', lateDays: 1 }),
      ],
      range,
    );
    expect(s.overtimeHours).toBe(3);
    expect(s.lateDays).toBe(10);
    expect(s.alerts.map((r) => r.name)).toEqual(['Thomas P', 'Hugo G']);
  });

  it('returns zeros for an empty team', () => {
    expect(summarizeKpi([], range)).toMatchObject({
      headcount: 0,
      avgWeeklyHours: 0,
      avgDailyHours: 0,
      alerts: [],
    });
  });
});
