import type { KpiRow, KpiSummary } from '@/api/types';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Summary of a GROUP of KPI rows (one team, one branch), computed with the SAME
 * formulas as the backend summary of GET /kpi/report (KpiService.report), so a
 * team line and the dashboard header never disagree.
 */
export function summarizeRows(rows: KpiRow[]): KpiSummary {
  const active = rows.filter((r) => r.workedDays > 0);
  const workedDays = rows.reduce((s, r) => s + r.workedDays, 0);
  const lateDays = rows.reduce((s, r) => s + r.lateDays, 0);
  return {
    people: rows.length,
    // Average weekly hours of the people who worked over the period.
    avgWeeklyHours: round2(active.reduce((s, r) => s + r.weeklyHours, 0) / Math.max(1, active.length)),
    // Share of worked days started on time (100 when nobody worked).
    punctualityPct: workedDays === 0 ? 100 : Math.round((1 - lateDays / workedDays) * 100),
    alerts: rows.filter((r) => r.lateAlert).length,
  };
}

/** Rows grouped by a key (teamId, branchId); rows without a key go under `null`. */
export function groupRows(rows: KpiRow[], key: 'teamId' | 'branchId'): Map<string | null, KpiRow[]> {
  const groups = new Map<string | null, KpiRow[]>();
  for (const r of rows) {
    const k = r[key] ?? null;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return groups;
}

export function totals(rows: KpiRow[]) {
  return {
    overtimeHours: round2(rows.reduce((s, r) => s + r.overtimeHours, 0)),
    lateDays: rows.reduce((s, r) => s + r.lateDays, 0),
    alerts: rows.filter((r) => r.lateAlert).sort((a, b) => b.lateDays - a.lateDays),
  };
}
