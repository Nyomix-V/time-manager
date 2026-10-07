import type { KpiRow } from '@/api/types';
import { weeksIn, type DateRange } from './period';

export interface KpiSummary {
  headcount: number;
  avgWeeklyHours: number;
  avgDailyHours: number;
  overtimeHours: number;
  lateDays: number;
  alerts: KpiRow[];
}

// Aggregates the per-user KPI rows returned by GET /kpi/report into team/branch figures.
// Averages are over the people who worked during the period, so new hires or absent
// people don't drag the team average down to zero.
export function summarizeKpi(rows: KpiRow[], range: DateRange): KpiSummary {
  const active = rows.filter((r) => r.totalHours > 0);
  const weeks = weeksIn(range);
  const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  return {
    headcount: rows.length,
    avgWeeklyHours: mean(active.map((r) => r.totalHours / weeks)),
    avgDailyHours: mean(active.map((r) => r.avgDailyHours)),
    overtimeHours: rows.reduce((s, r) => s + r.overtimeHours, 0),
    lateDays: rows.reduce((s, r) => s + r.lateDays, 0),
    alerts: rows.filter((r) => r.lateAlert).sort((a, b) => b.lateDays - a.lateDays),
  };
}
