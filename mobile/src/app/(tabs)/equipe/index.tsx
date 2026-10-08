import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api';
import type { ClockStatus, Team, User } from '@/api/types';
import { useSession } from '@/auth/AuthProvider';
import { Avatar, Kpi, Row, StateView } from '@/components/data';
import { EmployeeCreateSheet } from '@/components/EmployeeCreateSheet';
import { PeriodPicker, usePeriod } from '@/components/period';
import { Sheet } from '@/components/Sheet';
import { Badge, Banner, Card, IconButton, Screen, layout, text } from '@/components/ui';
import { PRESENCE_LABELS, fullName } from '@/domain/labels';
import { creatableRoles, managesTeams } from '@/domain/permissions';
import { addDays, endOfDay, formatDuration, formatTime, isSameDay, startOfDay } from '@/domain/time';
import { useQuery } from '@/hooks/useQuery';
import { colors, radius } from '@/theme/tokens';

// Maquette : docs/maquettes/mobile/m06-manager-equipe.html
// Salariés de la branche (le backend limite le manager et le directeur à leur branche),
// avec leur statut en direct, actualisé chaque minute, et les moyennes d'heures sur la période choisie
// (sujet : « averages of the daily and weekly hours of the team over a given period »).
type Filter = 'all' | 'none' | `team:${string}`;

const STATE_ORDER: ClockStatus['state'][] = ['WORKING', 'ON_BREAK', 'OUT'];

export default function TeamScreen() {
  const session = useSession();
  const [filter, setFilter] = useState<Filter>('all');
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const teamId = filter.startsWith('team:') ? filter.slice(5) : undefined;
  const period = usePeriod('month');
  const { from, to } = period;

  const { data, error, loading, reload, refreshing, refresh, updatedAt } = useQuery(
    async () => {
      const [users, teams, kpi, kpiPeriod] = await Promise.all([
        api.users.list(),
        api.teams.list(),
        // Alertes de retard : toujours sur les 30 derniers jours (seuil de 3).
        api.kpi.report(addDays(startOfDay(new Date()), -30), new Date(), teamId),
        api.kpi.report(from, endOfDay(to), teamId),
      ]);
      const people = users.filter((u) => u.role !== 'ADMIN' && u.id !== session.userId);
      // Un appel par personne en attendant une route de présence groupée côté backend (voir API.md).
      const statuses = await Promise.all(people.map((u) => api.clocks.status(u.id).catch(() => null)));
      return { people, teams, kpi, kpiPeriod, statusById: new Map(people.map((u, i) => [u.id, statuses[i]])) };
    },
    [teamId, from.getTime(), to.getTime()],
    { refreshMs: 60_000 },
  );

  const title = session.role === 'DIRECTEUR' ? 'Ma branche' : 'Mon équipe';
  if (!data) {
    return (
      <Screen title={title}>
        <StateView loading={loading} error={error} onRetry={reload} />
      </Screen>
    );
  }

  const shown = data.people.filter((u) => (filter === 'all' ? true : filter === 'none' ? !u.teamId : u.teamId === teamId));
  const sorted = [...shown].sort((a, b) => {
    const sa = STATE_ORDER.indexOf(data.statusById.get(a.id)?.state ?? 'OUT');
    const sb = STATE_ORDER.indexOf(data.statusById.get(b.id)?.state ?? 'OUT');
    return sa - sb || fullName(a).localeCompare(fullName(b));
  });
  const atWork = shown.filter((u) => data.statusById.get(u.id)?.state !== 'OUT').length;
  const alerts = data.kpi.rows.filter((r) => r.lateAlert && shown.some((u) => u.id === r.userId));
  const kpiRow = (u: User) => data.kpi.rows.find((r) => r.userId === u.id);
  const filterOptions = buildFilterOptions(data.people, data.teams, session.role === 'ADMIN');
  const filterLabel = filterOptions.find((o) => o.value === filter)?.label;

  // Moyennes sur la période, parmi les personnes qui ont travaillé (même règle que le résumé du KPI).
  const worked = data.kpiPeriod.rows.filter((r) => r.workedDays > 0);
  const avgDailyHours = worked.reduce((sum, r) => sum + r.avgDailyHours, 0) / Math.max(1, worked.length);
  const totalHours = data.kpiPeriod.rows.reduce((sum, r) => sum + r.totalHours, 0);
  const scope = teamId ? 'de l’équipe' : 'de la branche';
  const canCreate = creatableRoles(session.role).length > 0;

  return (
    <Screen
      title={title}
      refreshing={refreshing}
      onRefresh={refresh}
      right={
        <View style={layout.row}>
          {canCreate && <IconButton icon="user-plus" label="Inscrire un salarié" onPress={() => setCreating(true)} />}
          {managesTeams(session.role) && <IconButton icon="layers" label="Gérer les équipes" onPress={() => router.push('/equipe/equipes')} />}
        </View>
      }
    >
      {alerts.length > 0 && (
        <Banner tone="warning" icon="alert-triangle">
          {alerts.length} salarié{alerts.length > 1 ? 's ont' : ' a'} dépassé 3 retards sur 30 jours : {alerts.map((r) => r.name).join(', ')}.
        </Banner>
      )}

      <PeriodPicker period={period} />
      <View style={layout.grid2}>
        <Kpi label="Moy. / jour" value={formatDuration(avgDailyHours * 60)} hint={`par personne, ${scope}`} />
        <Kpi label="Moy. / semaine" value={formatDuration(data.kpiPeriod.summary.avgWeeklyHours * 60)} hint={`par personne, ${scope}`} />
      </View>
      <View style={layout.grid2}>
        <Kpi
          label="Ponctualité"
          value={`${data.kpiPeriod.summary.punctualityPct} %`}
          hint="des jours commencés à l’heure"
          hintTone={data.kpiPeriod.summary.punctualityPct >= 90 ? 'success' : 'warning'}
        />
        <Kpi label="Total" value={formatDuration(totalHours * 60)} hint={`${worked.length} personne${worked.length > 1 ? 's ont' : ' a'} pointé`} />
      </View>

      <Card style={{ gap: 4 }}>
        <View style={layout.between}>
          <Text style={text.h2}>Maintenant</Text>
          <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={`Filtrer : ${filterLabel}`} style={styles.filter}>
            <Text style={styles.filterText} numberOfLines={1}>
              {filterLabel}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.muted} />
          </Pressable>
        </View>
        <View style={[layout.row, { marginBottom: 4 }]}>
          <View style={styles.liveDot} />
          <Text style={text.small}>
            {atWork} au travail sur {shown.length} · actualisé à {updatedAt ? formatTime(updatedAt) : '—'}, puis chaque minute
          </Text>
        </View>

        {sorted.length === 0 ? (
          <StateView loading={false} error={null} onRetry={reload} empty="Personne dans ce filtre." />
        ) : (
          sorted.map((u, i) => {
            const row = kpiRow(u);
            return (
              <Row
                key={u.id}
                first={i === 0}
                left={<Avatar name={fullName(u)} size={34} />}
                title={fullName(u)}
                subtitle={row?.lateAlert ? `${row.lateDays} retards sur 30 jours` : (u.team?.name ?? 'Sans équipe')}
                right={<PresenceBadge status={data.statusById.get(u.id) ?? null} />}
                onPress={() => router.push({ pathname: '/equipe/[id]', params: { id: u.id } })}
                chevron={false}
              />
            );
          })
        )}
      </Card>

      <EmployeeCreateSheet
        key={`create-${creating}`}
        visible={creating}
        session={session}
        teams={data.teams}
        onClose={() => setCreating(false)}
        onCreated={reload}
      />

      <Sheet visible={picking} onClose={() => setPicking(false)} title="Afficher">
        {filterOptions.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => {
              setFilter(option.value);
              setPicking(false);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: option.value === filter }}
            style={[styles.option, option.value === filter && styles.optionOn, option.group && { marginTop: 8 }]}
          >
            <Text style={[text.body, option.value === filter && { color: colors.primary, fontWeight: '600' }]}>{option.label}</Text>
            <Text style={text.small}>{option.count}</Text>
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  );
}

function PresenceBadge({ status }: { status: ClockStatus | null }) {
  if (!status) return <Badge label="—" />;
  const since = status.since ? new Date(status.since) : null;
  if (status.state === 'OUT') {
    // Dernier pointage aujourd'hui = départ ; sinon, pas encore arrivé.
    return since && isSameDay(since, new Date()) ? <Badge label={`Parti · ${formatTime(since)}`} /> : <Badge label="Pas encore pointé" />;
  }
  const { label, tone } = PRESENCE_LABELS[status.state];
  return <Badge label={since ? `${label} · ${formatTime(since)}` : label} tone={tone} />;
}

type FilterOption = { value: Filter; label: string; count: number; group?: boolean };

function buildFilterOptions(people: User[], teams: Team[], admin: boolean): FilterOption[] {
  const count = (pred: (u: User) => boolean) => people.filter(pred).length;
  return [
    { value: 'all', label: admin ? "Toute l'entreprise" : 'Toute la branche', count: people.length },
    { value: 'none', label: 'Sans équipe', count: count((u) => !u.teamId) },
    ...teams.map((t, i) => ({ value: `team:${t.id}` as Filter, label: t.name, count: count((u) => u.teamId === t.id), group: i === 0 })),
  ];
}

const styles = StyleSheet.create({
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 190,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: { fontSize: 13, fontWeight: '500', color: colors.text, flexShrink: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: radius.md },
  optionOn: { backgroundColor: colors.primarySoft },
});
