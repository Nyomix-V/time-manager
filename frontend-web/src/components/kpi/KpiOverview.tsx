import { AlertTriangle, Clock, Timer, TrendingUp } from 'lucide-react';
import type { KpiSummary } from '@/lib/kpi';
import { formatHours } from '@/lib/format';
import { KpiCard } from '../KpiCard';
import { Alert } from '../ui/alert';

const WEEKLY_TARGET = 35;

/** The 4 KPI cards shared by the team, branch and global dashboards. */
export function KpiCards({ summary, scopeLabel }: { summary: KpiSummary; scopeLabel: string }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label={`Moyenne hebdo (${scopeLabel})`}
        icon={Timer}
        value={formatHours(summary.avgWeeklyHours)}
        hint={`Objectif ${WEEKLY_TARGET} h`}
        hintTone={summary.avgWeeklyHours >= WEEKLY_TARGET ? 'up' : 'down'}
      />
      <KpiCard
        label="Moyenne par jour"
        icon={TrendingUp}
        value={formatHours(summary.avgDailyHours)}
        hint="Par salarié ayant pointé"
      />
      <KpiCard
        label="Heures supplémentaires"
        icon={Clock}
        value={formatHours(summary.overtimeHours)}
        hint="Au-delà de 35 h / semaine"
      />
      <KpiCard
        label="Retards"
        icon={AlertTriangle}
        value={summary.lateDays}
        hint={`${summary.alerts.length} salarié${summary.alerts.length > 1 ? 's' : ''} au-delà du seuil`}
        hintTone={summary.alerts.length ? 'down' : 'muted'}
      />
    </div>
  );
}

export function LateAlert({ summary }: { summary: KpiSummary }) {
  if (summary.alerts.length === 0) return null;
  const names = summary.alerts
    .slice(0, 3)
    .map((r) => `${r.name} (${r.lateDays} retards)`)
    .join(', ');
  return (
    <Alert tone="warning" role="alert">
      <AlertTriangle aria-hidden />
      <span>
        <strong>
          {summary.alerts.length} salarié{summary.alerts.length > 1 ? 's ont' : ' a'} dépassé 3 retards sur la
          période
        </strong>{' '}
        — {names}
        {summary.alerts.length > 3 && '…'}
      </span>
    </Alert>
  );
}
