import { AlertTriangle, Clock, Timer, TrendingUp } from 'lucide-react';
import type { KpiRow, KpiSummary } from '@/api/types';
import { totals } from '@/lib/kpi';
import { formatHours } from '@/lib/format';
import { KpiCard } from '../KpiCard';
import { Alert } from '../ui/alert';
import { Progress } from '../ui/progress';

const WEEKLY_TARGET = 35;

/** The 4 KPI cards of the team, branch and global dashboards. `summary` comes from GET /kpi/report. */
export function KpiCards({
  summary,
  rows,
  scopeLabel,
}: {
  summary: KpiSummary;
  rows: KpiRow[];
  scopeLabel: string;
}) {
  const t = totals(rows);
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label={`Moyenne hebdo (${scopeLabel})`}
        icon={Timer}
        value={formatHours(summary.avgWeeklyHours)}
        hint={`${summary.people} personne${summary.people > 1 ? 's' : ''} · objectif ${WEEKLY_TARGET} h`}
        hintTone={summary.avgWeeklyHours >= WEEKLY_TARGET ? 'up' : 'muted'}
      />
      <KpiCard
        label="Taux de ponctualité"
        icon={TrendingUp}
        value={`${summary.punctualityPct} %`}
        hint="Part des salariés sous le seuil de retards"
      >
        <PunctualityBar pct={summary.punctualityPct} />
      </KpiCard>
      <KpiCard
        label="Heures supplémentaires"
        icon={Clock}
        value={formatHours(t.overtimeHours)}
        hint="Au-delà de 35 h / semaine"
      />
      <KpiCard
        label="Retards"
        icon={AlertTriangle}
        value={t.lateDays}
        hint={`${summary.alerts} salarié${summary.alerts > 1 ? 's' : ''} au-delà du seuil`}
        hintTone={summary.alerts ? 'down' : 'muted'}
      />
    </div>
  );
}

export function PunctualityBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <Progress
      className={className}
      label={`Ponctualité ${pct} %`}
      value={pct}
      tone={pct >= 95 ? 'ok' : pct >= 85 ? 'warn' : 'bad'}
    />
  );
}

export function LateAlert({ rows }: { rows: KpiRow[] }) {
  const alerts = totals(rows).alerts;
  if (alerts.length === 0) return null;
  const names = alerts
    .slice(0, 3)
    .map((r) => `${r.name} (${r.lateDays} retards)`)
    .join(', ');
  return (
    <Alert tone="warning" role="alert">
      <AlertTriangle aria-hidden />
      <span>
        <strong>
          {alerts.length} salarié{alerts.length > 1 ? 's ont' : ' a'} dépassé 3 retards sur la période
        </strong>{' '}
        — {names}
        {alerts.length > 3 && '…'}
      </span>
    </Alert>
  );
}
