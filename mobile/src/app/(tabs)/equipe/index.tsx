import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api';
import type { Presence, PresenceState, Team, User } from '@/api/types';
import { useSession } from '@/auth/AuthProvider';
import { Avatar, Kpi, Row, StateView } from '@/components/data';
import { Sheet } from '@/components/Sheet';
import { Badge, Banner, Card, Screen, layout, text, type Tone } from '@/components/ui';
import { PRESENCE_LABELS, fullName } from '@/domain/labels';
import { myTeams } from '@/domain/permissions';
import { addDays, formatDuration, formatTime, startOfDay } from '@/domain/time';
import { useQuery } from '@/hooks/useQuery';
import { colors, radius } from '@/theme/tokens';

// Maquette : docs/maquettes/mobile/m06-manager-equipe.html
// Statut en direct, actualisé chaque minute. Les managers voient tous les salariés de l'entreprise,
// filtrés par défaut sur leurs équipes.
type Filter = 'all' | 'mine' | 'none' | `team:${string}`;

const STATE_ORDER: PresenceState[] = ['WORKING', 'ON_BREAK', 'NOT_STARTED', 'DONE', 'ABSENT', 'OFF_DAY'];

export default function TeamScreen() {
  const session = useSession();
  const [filter, setFilter] = useState<Filter>('mine');
  const [picking, setPicking] = useState(false);

  const { data, error, loading, reload, refreshing, refresh, updatedAt } = useQuery(
    async () => {
      const [users, teams, presence, kpi] = await Promise.all([
        api.users.list(),
        api.teams.list(),
        api.presence.list(),
        api.kpi.report(addDays(startOfDay(new Date()), -30), new Date()),
      ]);
      return { users, teams, presence, kpi };
    },
    [],
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

  const mine = myTeams(session, data.teams);
  const people = data.users.filter((u) => u.role !== 'ADMIN' && u.id !== session.userId);
  const inFilter = (u: User) =>
    filter === 'all'
      ? true
      : filter === 'none'
        ? !u.teamId
        : filter === 'mine'
          ? mine.some((t) => t.id === u.teamId)
          : u.teamId === filter.slice(5);
  const shown = people.filter(inFilter);
  const shownIds = new Set(shown.map((u) => u.id));
  const presenceById = new Map(data.presence.map((p) => [p.userId, p]));

  // KPI des 30 derniers jours (glissants) sur les salariés affichés.
  const rows = data.kpi.rows.filter((r) => shownIds.has(r.userId));
  const weeksElapsed = 30 / 7;
  const avgWeekly = rows.length ? rows.reduce((sum, r) => sum + r.totalHours, 0) / rows.length / weeksElapsed : 0;
  const workedDays = rows.reduce((sum, r) => sum + r.workedDays, 0);
  const punctuality = workedDays ? 1 - rows.reduce((sum, r) => sum + r.lateDays, 0) / workedDays : 1;
  const alerts = rows.filter((r) => r.lateAlert);

  const sorted = [...shown].sort((a, b) => {
    const sa = STATE_ORDER.indexOf(presenceById.get(a.id)?.state ?? 'OFF_DAY');
    const sb = STATE_ORDER.indexOf(presenceById.get(b.id)?.state ?? 'OFF_DAY');
    return sa - sb || fullName(a).localeCompare(fullName(b));
  });
  const atWork = shown.filter((u) => ['WORKING', 'ON_BREAK'].includes(presenceById.get(u.id)?.state ?? '')).length;
  const filterOptions = buildFilterOptions(people, mine, session.role === 'DIRECTEUR');

  return (
    <Screen title={title} subtitle="30 derniers jours" refreshing={refreshing} onRefresh={refresh}>
      {alerts.length > 0 && (
        <Banner tone="warning" icon="alert-triangle">
          {alerts.length} salarié{alerts.length > 1 ? 's ont' : ' a'} dépassé 3 retards sur 30 jours : {alerts.map((r) => r.name).join(', ')}.
        </Banner>
      )}

      <View style={layout.grid2}>
        <Kpi label="Moy. hebdo" value={formatDuration(avgWeekly * 60)} hint="par salarié" />
        <Kpi
          label="Ponctualité"
          value={`${Math.round(punctuality * 100)} %`}
          hint={`${rows.reduce((sum, r) => sum + r.lateDays, 0)} retards`}
          hintTone={punctuality >= 0.9 ? 'success' : 'warning'}
        />
      </View>

      <Card style={{ gap: 4 }}>
        <View style={layout.between}>
          <Text style={text.h2}>Maintenant</Text>
          <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={`Filtrer : ${filterOptions.find((o) => o.value === filter)?.label}`} style={styles.filter}>
            <Text style={styles.filterText} numberOfLines={1}>
              {filterOptions.find((o) => o.value === filter)?.label}
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
            const row = data.kpi.rows.find((r) => r.userId === u.id);
            const team = data.teams.find((t) => t.id === u.teamId);
            return (
              <Row
                key={u.id}
                first={i === 0}
                left={<Avatar name={fullName(u)} size={34} />}
                title={fullName(u)}
                subtitle={row?.lateAlert ? `${row.lateDays} retards sur 30 jours` : (team?.name ?? 'Sans équipe')}
                right={<PresenceBadge presence={presenceById.get(u.id)} />}
                onPress={() => router.push({ pathname: '/equipe/[id]', params: { id: u.id } })}
                chevron={false}
              />
            );
          })
        )}
      </Card>

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

function PresenceBadge({ presence }: { presence?: Presence }) {
  if (!presence) return <Badge label="—" />;
  const { label, tone } = PRESENCE_LABELS[presence.state];
  const since = presence.since ? formatTime(new Date(presence.since)) : null;
  let badgeTone: Tone = tone;
  let badgeLabel = since && presence.state !== 'ABSENT' ? `${label} · ${since}` : label;
  if (presence.state === 'WORKING' && presence.lateMinutes > 0) {
    badgeTone = 'warning';
    badgeLabel = `Retard · ${presence.lateMinutes} min`;
  }
  return <Badge label={badgeLabel} tone={badgeTone} />;
}

type FilterOption = { value: Filter; label: string; count: number; group?: boolean };

function buildFilterOptions(people: User[], mine: Team[], director: boolean): FilterOption[] {
  const count = (pred: (u: User) => boolean) => people.filter(pred).length;
  return [
    { value: 'mine', label: director ? 'Ma branche' : 'Mes équipes', count: count((u) => mine.some((t) => t.id === u.teamId)) },
    { value: 'all', label: "Toute l'entreprise", count: people.length },
    { value: 'none', label: 'Sans équipe', count: count((u) => !u.teamId) },
    ...mine.map((t, i) => ({ value: `team:${t.id}` as Filter, label: t.name, count: count((u) => u.teamId === t.id), group: i === 0 })),
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
