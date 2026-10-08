// Heures d'une personne sur une période : chiffres clés, graphique et détail par jour.
// Utilisé par « Mes heures » (ses propres heures) et par la fiche salarié (vue du manager).
import { StyleSheet, Text, View } from 'react-native';

import type { Absence } from '@/api/types';
import { ABSENCE_LABELS } from '@/domain/labels';
import {
  WEEKDAYS,
  addDays,
  coversDay,
  dayKey,
  formatDay,
  formatDuration,
  formatTime,
  isLate,
  isWorkDay,
  periodStats,
  plannedWeeklyMinutes,
  startOfDay,
  startOfWeek,
  type DaySummary,
  type Planning,
} from '@/domain/time';
import { BarChart, Kpi, Row, StateView, type Bar } from './data';
import type { Period } from './period';
import { Badge, Card, LateBadge, layout, text } from './ui';

type Props = {
  period: Period;
  /** Journées pointées de la période (summarizeDays). */
  days: DaySummary[];
  absences: Absence[];
  /** Jours couverts par une absence validée (excusedDays) : leurs retards ne comptent pas. */
  excused: ReadonlySet<string>;
  planning: Planning | null;
};

export function HoursReport({ period, days, absences, excused, planning }: Props) {
  const stats = periodStats(days, { planning, excused });
  const plural = stats.workedDays > 1 ? 's' : '';
  return (
    <>
      <View style={layout.grid2}>
        <Kpi label="Total" value={formatDuration(stats.totalMinutes)} hint={`${stats.workedDays} jour${plural} travaillé${plural}`} />
        <Kpi
          label="Moy. / semaine"
          value={formatDuration(stats.avgPerWeekMinutes)}
          hint={planning ? `Objectif ${formatDuration(plannedWeeklyMinutes(planning))}` : undefined}
          hintTone={planning && stats.avgPerWeekMinutes >= plannedWeeklyMinutes(planning) ? 'success' : undefined}
        />
      </View>
      <View style={layout.grid2}>
        <Kpi label="Moy. / jour" value={formatDuration(stats.avgPerDayMinutes)} hint={planning ? `Prévu ${formatDuration(planning.dailyMinutes)}` : undefined} />
        <Kpi label="Retards" value={String(stats.lateDays)} hint={stats.lateDays ? 'jours en retard' : 'Aucun retard'} hintTone={stats.lateDays ? 'warning' : 'success'} />
      </View>

      {period.mode !== 'custom' && (
        <Card>
          <Text style={text.h2}>{period.mode === 'week' ? 'Heures par jour' : 'Heures par semaine'}</Text>
          <PeriodChart period={period} days={days} planning={planning} excused={excused} />
        </Card>
      )}

      <Card style={{ gap: 0 }}>
        <Text style={[text.h2, { marginBottom: 6 }]}>Détail par jour</Text>
        <DayList days={days} absences={absences} excused={excused} planning={planning} from={period.from} to={period.to} />
      </Card>
    </>
  );
}

function PeriodChart({ period, days, planning, excused }: { period: Period; days: DaySummary[]; planning: Planning | null; excused: ReadonlySet<string> }) {
  const { mode, from, to } = period;
  const byKey = new Map(days.map((d) => [d.key, d]));
  let bars: Bar[];
  let target: number | undefined;
  if (mode === 'week') {
    bars = WEEKDAYS.map((label, i) => {
      const day = byKey.get(dayKey(addDays(from, i)));
      return { label, value: (day?.workedMinutes ?? 0) / 60, highlight: !!day && isLate(day, excused) };
    });
    target = planning ? planning.dailyMinutes / 60 : undefined;
  } else {
    bars = [];
    for (let start = startOfWeek(from); start <= to; start = addDays(start, 7)) {
      const minutes = days.filter((d) => d.date >= start && d.date < addDays(start, 7)).reduce((sum, d) => sum + d.workedMinutes, 0);
      bars.push({ label: `S${isoWeekNumber(start)}`, value: minutes / 60 });
    }
    target = planning ? plannedWeeklyMinutes(planning) / 60 : undefined;
  }
  const max = Math.max(1, target ?? 0, ...bars.map((b) => b.value)) * 1.15;
  const describe = bars.map((b) => `${b.label} : ${formatDuration(b.value * 60)}`).join(', ');
  return <BarChart bars={bars} max={max} target={target} describe={describe} />;
}

function isoWeekNumber(d: Date) {
  const thursday = addDays(startOfWeek(d), 3);
  const firstThursday = addDays(startOfWeek(new Date(thursday.getFullYear(), 0, 4)), 3);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

type Line = { key: string; date: Date; day?: DaySummary; absence?: Absence };

function DayList({
  days,
  absences,
  excused,
  planning,
  from,
  to,
}: {
  days: DaySummary[];
  absences: Absence[];
  excused: ReadonlySet<string>;
  planning: Planning | null;
  from: Date;
  to: Date;
}) {
  // Jours pointés + jours d'absence (sans pointage) de la période, du plus récent au plus ancien.
  const lines = new Map<string, Line>(days.map((d) => [d.key, { key: d.key, date: d.date, day: d }]));
  const today = startOfDay(new Date());
  for (let d = startOfDay(from); d <= to && d <= today; d = addDays(d, 1)) {
    const key = dayKey(d);
    if (lines.has(key) || (planning && !isWorkDay(planning, d))) continue;
    const absence = absences.find((a) => a.status !== 'REJECTED' && coversDay(a, d));
    if (absence) lines.set(key, { key, date: d, absence });
  }
  const sorted = [...lines.values()].sort((a, b) => b.key.localeCompare(a.key));
  if (!sorted.length) return <StateView loading={false} error={null} onRetry={() => {}} empty="Aucun pointage sur cette période." />;

  return (
    <View>
      {sorted.map((line, i) =>
        line.day ? (
          <Row
            key={line.key}
            first={i === 0}
            title={formatDay(line.date)}
            subtitle={`${line.day.arrival ? formatTime(line.day.arrival) : '—'} → ${line.day.departure ? formatTime(line.day.departure) : line.day.incomplete ? '?' : 'en cours'} · pause ${formatDuration(line.day.breakMinutes)}`}
            right={
              <View style={styles.dayRight}>
                <Text style={text.strong}>{formatDuration(line.day.workedMinutes)}</Text>
                {line.day.incomplete ? (
                  <Badge label="Oubli de pointage" tone="danger" />
                ) : line.day.lateMinutes > 0 ? (
                  <LateBadge minutes={line.day.lateMinutes} excused={excused.has(line.key)} />
                ) : null}
              </View>
            }
          />
        ) : (
          <Row
            key={line.key}
            first={i === 0}
            title={formatDay(line.date)}
            subtitle={ABSENCE_LABELS[line.absence!.type]}
            right={<Badge label={line.absence!.status === 'APPROVED' ? 'Absence justifiée' : 'Absence en attente'} tone="info" />}
          />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dayRight: { alignItems: 'flex-end', gap: 4 },
});
