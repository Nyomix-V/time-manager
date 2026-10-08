import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { api } from '@/api';
import type { Absence } from '@/api/types';
import { useSession } from '@/auth/AuthProvider';
import { BarChart, Kpi, Row, StateView, type Bar } from '@/components/data';
import { DateField, Segmented } from '@/components/forms';
import { Badge, Card, LateBadge, Screen, layout, text } from '@/components/ui';
import { ABSENCE_LABELS } from '@/domain/labels';
import {
  WEEKDAYS,
  addDays,
  coversDay,
  dayKey,
  endOfDay,
  endOfMonth,
  excusedDays,
  formatDate,
  formatDay,
  formatDuration,
  formatTime,
  isLate,
  isWorkDay,
  periodStats,
  planningOf,
  plannedWeeklyMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
  summarizeDays,
  type DaySummary,
  type Planning,
} from '@/domain/time';
import { useQuery } from '@/hooks/useQuery';
import { colors } from '@/theme/tokens';

// Maquette : docs/maquettes/mobile/m03-mes-heures.html
type Mode = 'week' | 'month' | 'custom';

export default function HoursScreen() {
  const session = useSession();
  const [mode, setMode] = useState<Mode>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [customFrom, setCustomFrom] = useState(() => addDays(new Date(), -30));
  const [customTo, setCustomTo] = useState(() => new Date());

  const { from, to } = useMemo(() => periodOf(mode, anchor, customFrom, customTo), [mode, anchor, customFrom, customTo]);

  const { data, error, loading, reload, refreshing, refresh } = useQuery(async () => {
    const [user, clocks, absences] = await Promise.all([
      api.users.get(session.userId),
      api.clocks.list(session.userId, { from, to: endOfDay(to) }),
      api.absences.listForUser(session.userId),
    ]);
    return { planning: planningOf(user), clocks, absences, excused: excusedDays(absences) };
  }, [session.userId, from.getTime(), to.getTime()]);

  const move = (direction: -1 | 1) =>
    setAnchor((d) => (mode === 'week' ? addDays(d, 7 * direction) : new Date(d.getFullYear(), d.getMonth() + direction, 1)));
  const isCurrent = to >= startOfDay(new Date());

  const days = data ? summarizeDays(data.clocks, data.planning) : [];
  const planning = data?.planning ?? null;
  const excused = data?.excused ?? new Set<string>();
  const stats = periodStats(days, { planning, excused });

  return (
    <Screen title="Mes heures" refreshing={refreshing} onRefresh={refresh}>
      <Segmented
        options={[
          { value: 'week', label: 'Semaine' },
          { value: 'month', label: 'Mois' },
          { value: 'custom', label: 'Période' },
        ]}
        value={mode}
        onChange={(next) => {
          setMode(next);
          setAnchor(new Date());
        }}
      />

      {mode === 'custom' ? (
        <View style={layout.grid2}>
          <View style={layout.grow}>
            <DateField label="Du" value={customFrom} onChange={setCustomFrom} />
          </View>
          <View style={layout.grow}>
            <DateField label="Au" value={customTo} onChange={setCustomTo} minimumDate={customFrom} />
          </View>
        </View>
      ) : (
        <View style={styles.periodNav}>
          <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel="Période précédente" hitSlop={10} style={styles.arrow}>
            <Feather name="chevron-left" size={22} color={colors.primary} />
          </Pressable>
          <Text style={[text.h3, styles.periodLabel]}>{periodLabel(mode, from, to)}</Text>
          <Pressable
            onPress={() => move(1)}
            disabled={isCurrent}
            accessibilityRole="button"
            accessibilityLabel="Période suivante"
            accessibilityState={{ disabled: isCurrent }}
            hitSlop={10}
            style={[styles.arrow, isCurrent && { opacity: 0.3 }]}
          >
            <Feather name="chevron-right" size={22} color={colors.primary} />
          </Pressable>
        </View>
      )}

      {!data ? (
        <StateView loading={loading} error={error} onRetry={reload} />
      ) : (
        <>
          <View style={layout.grid2}>
            <Kpi label="Total" value={formatDuration(stats.totalMinutes)} hint={`${stats.workedDays} jour${stats.workedDays > 1 ? 's' : ''} travaillé${stats.workedDays > 1 ? 's' : ''}`} />
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

          {mode !== 'custom' && (
            <Card>
              <Text style={text.h2}>{mode === 'week' ? 'Heures par jour' : 'Heures par semaine'}</Text>
              <PeriodChart mode={mode} from={from} to={to} days={days} planning={planning} excused={excused} />
            </Card>
          )}

          <Card style={{ gap: 0 }}>
            <Text style={[text.h2, { marginBottom: 6 }]}>Détail par jour</Text>
            <DayList days={days} absences={data.absences} excused={excused} planning={planning} from={from} to={to} />
          </Card>
        </>
      )}
    </Screen>
  );
}

function periodOf(mode: Mode, anchor: Date, customFrom: Date, customTo: Date) {
  if (mode === 'week') return { from: startOfWeek(anchor), to: addDays(startOfWeek(anchor), 6) };
  if (mode === 'month') return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
  return { from: startOfDay(customFrom), to: startOfDay(customTo) };
}

function periodLabel(mode: Mode, from: Date, to: Date) {
  if (mode === 'month') return from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return `${from.getDate()} ${from.toLocaleDateString('fr-FR', { month: 'short' })} → ${formatDate(to)}`;
}

function PeriodChart({
  mode,
  from,
  to,
  days,
  planning,
  excused,
}: {
  mode: Mode;
  from: Date;
  to: Date;
  days: DaySummary[];
  planning: Planning | null;
  excused: ReadonlySet<string>;
}) {
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
  periodNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  periodLabel: { flex: 1, textAlign: 'center', textTransform: 'capitalize' },
  dayRight: { alignItems: 'flex-end', gap: 4 },
});
