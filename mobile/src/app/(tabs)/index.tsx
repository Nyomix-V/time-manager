import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api';
import type { Clock, ClockType } from '@/api/types';
import { useSession } from '@/auth/AuthProvider';
import { clocksIn } from '@/auth/session';
import { StateView, Timeline, type TimelineItem } from '@/components/data';
import { Badge, Banner, Button, Card, Screen, layout, text } from '@/components/ui';
import {
  expectedEndMin,
  formatDuration,
  formatMinutesOfDay,
  formatTime,
  formatWorkDays,
  isSameDay,
  planningOf,
  sortClocks,
  startOfDay,
  summarizeDay,
  type DaySummary,
  type Planning,
} from '@/domain/time';
import { useNow, useQuery } from '@/hooks/useQuery';
import { errorMessage } from '@/lib/api';
import { colors } from '@/theme/tokens';

// Maquette : docs/maquettes/mobile/m02-accueil.html (états « en poste » et « en pause »).
export default function HomeScreen() {
  const { role } = useSession();
  return clocksIn(role) ? <ClockScreen /> : <AdminHome />;
}

function AdminHome() {
  return (
    <Screen title="Accueil">
      <Banner icon="monitor">L'administrateur ne pointe pas. La gestion des utilisateurs, des branches et des équipes se fait sur le site web.</Banner>
    </Screen>
  );
}

function ClockScreen() {
  const session = useSession();
  const now = useNow(15_000);
  const [sending, setSending] = useState<ClockType | null>(null);

  const { data, error, loading, reload, refreshing, refresh } = useQuery(async () => {
    // Le planning est porté par l'utilisateur ; seuls les pointages du jour comptent.
    const [user, clocks] = await Promise.all([
      api.users.get(session.userId),
      api.clocks.list(session.userId, { from: startOfDay(new Date()) }),
    ]);
    return { user, planning: planningOf(user), clocks: clocks.filter((c) => isSameDay(new Date(c.time), new Date())) };
  }, [session.userId]);

  async function clock(type: ClockType) {
    setSending(type);
    try {
      await api.clocks.punch(session.userId, type);
      await reload();
    } catch (e) {
      Alert.alert('Pointage refusé', errorMessage(e));
    } finally {
      setSending(null);
    }
  }

  // Le départ termine la journée : on demande confirmation pour éviter un appui par erreur.
  const confirmDeparture = () =>
    Alert.alert('Pointer votre départ ?', `Votre journée se terminera à ${formatTime(new Date())}.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Pointer mon départ', onPress: () => clock('OUT') },
    ]);

  // Après un départ (pointé par erreur, ou retour au travail), le backend accepte une nouvelle arrivée.
  const confirmResume = () =>
    Alert.alert('Reprendre le travail ?', `Une nouvelle arrivée sera pointée à ${formatTime(new Date())}.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Reprendre', onPress: () => clock('IN') },
    ]);

  const subtitle = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const title = data ? `Bonjour ${data.user.firstName}` : 'Pointage';

  if (!data) {
    return (
      <Screen title={title} subtitle={subtitle}>
        <StateView loading={loading} error={error} onRetry={reload} />
      </Screen>
    );
  }

  const summary = summarizeDay(data.clocks, data.planning, now);
  const last = sortClocks(data.clocks).at(-1);

  return (
    <Screen title={title} subtitle={subtitle} refreshing={refreshing} onRefresh={refresh}>
      <Card style={styles.clockCard}>
        <StatusBadge summary={summary} last={last} />
        <Text style={styles.clock} accessibilityLabel={`Il est ${formatTime(now)}`}>
          {formatTime(now)}
        </Text>

        {summary.arrival && (
          <Text style={[text.muted, styles.center]}>
            Travaillé <Text style={text.strong}>{formatDuration(summary.workedMinutes)}</Text> · Pause{' '}
            <Text style={text.strong}>{formatDuration(summary.breakMinutes)}</Text>
          </Text>
        )}
        {summary.lateMinutes > 0 && (
          <View style={styles.centerRow}>
            <Badge label={`Arrivée avec ${summary.lateMinutes} min de retard`} tone="warning" icon="alert-triangle" />
          </View>
        )}

        {summary.state === 'NOT_STARTED' && (
          <Button label="Pointer mon arrivée" icon="log-in" large loading={sending === 'IN'} onPress={() => clock('IN')} />
        )}
        {summary.state === 'WORKING' && (
          <>
            <Button
              label="Commencer une pause"
              icon="pause"
              variant="pause"
              loading={sending === 'BREAK_START'}
              disabled={!!sending}
              onPress={() => clock('BREAK_START')}
            />
            <Button label="Pointer mon départ" icon="log-out" large loading={sending === 'OUT'} disabled={!!sending} onPress={confirmDeparture} />
          </>
        )}
        {summary.state === 'ON_BREAK' && (
          <>
            <BreakTimer summary={summary} planning={data.planning} />
            <Button label="Pointer la fin de pause" icon="play" large loading={sending === 'BREAK_END'} onPress={() => clock('BREAK_END')} />
            <Text style={[text.small, styles.center]}>Le compteur d'heures est arrêté pendant la pause.</Text>
          </>
        )}
        {summary.state === 'DONE' && (
          <>
            <Text style={[text.body, styles.center]}>Journée terminée. Bonne soirée !</Text>
            <Button label="Reprendre le travail" icon="rotate-ccw" variant="ghost" loading={sending === 'IN'} onPress={confirmResume} />
          </>
        )}
      </Card>

      <PlanningCard planning={data.planning} />

      <Card>
        <Text style={text.h2}>Aujourd'hui</Text>
        <Timeline items={timeline(data.clocks, data.planning, summary)} />
      </Card>
    </Screen>
  );
}

function StatusBadge({ summary, last }: { summary: DaySummary; last?: Clock }) {
  const since = last ? formatTime(new Date(last.time)) : '';
  switch (summary.state) {
    case 'WORKING':
      return (
        <View style={styles.centerRow}>
          <Badge label={last?.type === 'BREAK_END' ? `En poste · retour de pause ${since}` : `En poste depuis ${since}`} tone="success" />
        </View>
      );
    case 'ON_BREAK':
      return (
        <View style={styles.centerRow}>
          <Badge label={`En pause depuis ${since}`} tone="info" />
        </View>
      );
    case 'DONE':
      return (
        <View style={styles.centerRow}>
          <Badge label={`Parti à ${since}`} />
        </View>
      );
    default:
      return (
        <View style={styles.centerRow}>
          <Badge label="Pas encore pointé aujourd'hui" />
        </View>
      );
  }
}

function BreakTimer({ summary, planning }: { summary: DaySummary; planning: Planning | null }) {
  const over = planning && summary.breakMinutes > planning.breakMinutes;
  return (
    <View style={[styles.breakTimer, over && { backgroundColor: colors.warningSoft }]}>
      <Text style={[styles.breakText, over && { color: colors.warning }]}>
        Pause : {formatDuration(summary.breakMinutes)}
        {planning ? ` sur ${formatDuration(planning.breakMinutes)} prévues` : ''}
      </Text>
    </View>
  );
}

function PlanningCard({ planning }: { planning: Planning | null }) {
  if (!planning) {
    return <Banner tone="warning">Aucun planning n'est défini pour vous. Contactez votre manager.</Banner>;
  }
  return (
    <Card>
      <View style={layout.between}>
        <Text style={text.h2}>Mon planning</Text>
        <Text style={text.small}>{formatWorkDays(planning.workDays)}</Text>
      </View>
      <View style={styles.planning}>
        <PlanningValue label="Arrivée" value={formatMinutesOfDay(planning.startMin)} />
        <PlanningValue label="Travail" value={formatDuration(planning.dailyMinutes)} />
        <PlanningValue label="Pause" value={formatDuration(planning.breakMinutes)} />
        <PlanningValue label="Fin" value={formatMinutesOfDay(expectedEndMin(planning))} />
      </View>
    </Card>
  );
}

function PlanningValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.planningValue}>
      <Text style={text.small}>{label}</Text>
      <Text style={styles.planningNumber}>{value}</Text>
    </View>
  );
}

function timeline(clocks: Clock[], planning: Planning | null, summary: DaySummary): TimelineItem[] {
  const items: TimelineItem[] = [];
  let breakStart: Date | null = null;
  for (const clock of sortClocks(clocks)) {
    const t = new Date(clock.time);
    if (clock.type === 'IN') items.push({ title: 'Arrivée', value: formatTime(t), state: 'done' });
    if (clock.type === 'BREAK_START') breakStart = t;
    if (clock.type === 'BREAK_END' && breakStart) {
      items.push({ title: 'Pause', value: `${formatTime(breakStart)} → ${formatTime(t)}`, state: 'done' });
      breakStart = null;
    }
    if (clock.type === 'OUT') items.push({ title: 'Départ', value: formatTime(t), state: 'done' });
  }
  if (breakStart) items.push({ title: 'Pause en cours', value: `depuis ${formatTime(breakStart)}`, state: 'live' });
  if (planning && summary.state === 'NOT_STARTED') {
    items.push({ title: 'Arrivée prévue', value: formatMinutesOfDay(planning.startMin), state: 'pending' });
  }
  if (planning && summary.state !== 'DONE') {
    items.push({ title: 'Départ prévu', value: formatMinutesOfDay(expectedEndMin(planning)), state: 'pending' });
  }
  return items;
}

const styles = StyleSheet.create({
  clockCard: { gap: 14, paddingVertical: 24 },
  clock: { fontSize: 52, fontWeight: '700', color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
  centerRow: { flexDirection: 'row', justifyContent: 'center' },
  breakTimer: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primarySoft },
  breakText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  planning: { flexDirection: 'row', gap: 8 },
  planningValue: { flex: 1, gap: 2 },
  planningNumber: { fontSize: 16, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
});
