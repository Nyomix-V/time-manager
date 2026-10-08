import type { KpiRow } from '@/api/types';
import { groupRows, summarizeRows, totals } from './kpi';

const row = (over: Partial<KpiRow>): KpiRow => ({
  userId: 'u',
  name: 'A B',
  branchId: 'finance',
  teamId: null,
  totalHours: 0,
  avgDailyHours: 0,
  overtimeHours: 0,
  breakMinutes: 0,
  lateDays: 0,
  lateAlert: false,
  workedDays: 0,
  weeklyHours: 0,
  ...over,
});

describe('summarizeRows (same formulas as the backend KPI summary)', () => {
  it('averages weekly hours over people who worked, punctuality over worked days', () => {
    const s = summarizeRows([
      row({ userId: 'a', workedDays: 10, weeklyHours: 35, lateDays: 1 }),
      row({ userId: 'b', workedDays: 10, weeklyHours: 30, lateDays: 4, lateAlert: true }),
      row({ userId: 'c' }), // did not work: excluded from the average, still counted as a person
    ]);
    expect(s).toEqual({ people: 3, avgWeeklyHours: 32.5, punctualityPct: 75, alerts: 1 });
  });

  it('is neutral for an empty group', () => {
    expect(summarizeRows([])).toEqual({ people: 0, avgWeeklyHours: 0, punctualityPct: 100, alerts: 0 });
  });
});

describe('groupRows', () => {
  it('groups by team, with people without team under null', () => {
    const groups = groupRows([row({ teamId: 't1' }), row({ teamId: 't1' }), row({ teamId: null })], 'teamId');
    expect(groups.get('t1')).toHaveLength(2);
    expect(groups.get(null)).toHaveLength(1);
  });
});

describe('totals', () => {
  it('sums overtime and lateness, alerts sorted by lateness', () => {
    const t = totals([
      row({ name: 'Hugo G', overtimeHours: 2, lateDays: 4, lateAlert: true }),
      row({ name: 'Thomas P', overtimeHours: 1.5, lateDays: 5, lateAlert: true }),
      row({ lateDays: 1 }),
    ]);
    expect(t.overtimeHours).toBe(3.5);
    expect(t.lateDays).toBe(10);
    expect(t.alerts.map((r) => r.name)).toEqual(['Thomas P', 'Hugo G']);
  });
});
