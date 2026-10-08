import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';

import { api } from '@/api';
import type { Team, User } from '@/api/types';
import { useSession } from '@/auth/AuthProvider';
import { AbsenceHistory } from '@/components/AbsenceHistory';
import { BarChart, Kpi, Row, StateView } from '@/components/data';
import { Chips, DateField, DaysPicker, TextField } from '@/components/forms';
import { Sheet } from '@/components/Sheet';
import { Badge, Banner, Button, Card, IconButton, Screen, layout, text } from '@/components/ui';
import { ROLE_LABELS, fullName } from '@/domain/labels';
import { canManage } from '@/domain/permissions';
import {
  WEEKDAYS,
  addDays,
  dayKey,
  expectedEndMin,
  formatDay,
  formatDuration,
  formatMinutesOfDay,
  formatTime,
  formatWorkDays,
  minutesOfDay,
  periodStats,
  planningFields,
  planningOf,
  plannedWeeklyMinutes,
  startOfDay,
  startOfWeek,
  summarizeDays,
  type Planning,
} from '@/domain/time';
import { useQuery } from '@/hooks/useQuery';
import { errorMessage } from '@/lib/api';

// Maquette : docs/maquettes/mobile/m07-manager-salarie.html
export default function EmployeeScreen() {
  const session = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sheet, setSheet] = useState<'edit' | 'delete' | null>(null);

  const { data, error, loading, reload, refreshing, refresh } = useQuery(async () => {
    const [user, clocks, teams, absences] = await Promise.all([
      api.users.get(id),
      api.clocks.list(id),
      api.teams.list(),
      api.absences.listForUser(id),
    ]);
    const since = addDays(startOfDay(new Date()), -35);
    return { user, planning: planningOf(user), clocks: clocks.filter((c) => new Date(c.time) >= since), teams, absences };
  }, [id]);

  if (!data) {
    return (
      <Screen title="Fiche salarié" safeTop={false}>
        <StateView loading={loading} error={error} onRetry={reload} />
      </Screen>
    );
  }

  const { user, planning, clocks, teams, absences } = data;
  const manageable = canManage(session, user);
  const pendingAbsences = absences.filter((a) => a.status === 'PENDING').length;
  const team = user.team;
  const days = summarizeDays(clocks, planning);
  const last4Weeks = periodStats(days.filter((d) => d.date >= addDays(startOfDay(new Date()), -28)));
  const last30Days = periodStats(days.filter((d) => d.date >= addDays(startOfDay(new Date()), -30)));

  const weekStart = startOfWeek(new Date());
  const byKey = new Map(days.map((d) => [d.key, d]));
  const bars = WEEKDAYS.slice(0, 5).map((label, i) => {
    const day = byKey.get(dayKey(addDays(weekStart, i)));
    return { label, value: (day?.workedMinutes ?? 0) / 60, highlight: !!day?.lateMinutes };
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Fiche salarié',
          headerRight: manageable
            ? () => (
                <View style={layout.row}>
                  <IconButton icon="edit-2" label={`Modifier ${fullName(user)}`} onPress={() => setSheet('edit')} />
                  <IconButton icon="trash-2" label={`Supprimer ${fullName(user)}`} tone="danger" onPress={() => setSheet('delete')} />
                </View>
              )
            : undefined,
        }}
      />
      <Screen title={fullName(user)} subtitle={`${ROLE_LABELS[user.role]} · ${team?.name ?? 'Sans équipe'}`} refreshing={refreshing} onRefresh={refresh} safeTop={false}
        right={
          user.phone ? (
            <IconButton icon="phone" label={`Appeler ${fullName(user)}`} onPress={() => Linking.openURL(`tel:${user.phone!.replace(/\s/g, '')}`)} />
          ) : undefined
        }
      >
        {planning ? (
          <Text style={text.muted}>
            {formatWorkDays(planning.workDays)} · {formatMinutesOfDay(planning.startMin)} → {formatMinutesOfDay(expectedEndMin(planning))} ·{' '}
            <Text style={text.strong}>{formatDuration(planning.dailyMinutes)} / jour</Text> · pause {formatDuration(planning.breakMinutes)}
          </Text>
        ) : (
          <Banner tone="warning">Aucun planning défini pour ce salarié.</Banner>
        )}

        <View style={layout.grid2}>
          <Kpi
            label="Moy. / semaine"
            value={formatDuration(last4Weeks.avgPerWeekMinutes)}
            hint={planning ? `4 sem. · objectif ${formatDuration(plannedWeeklyMinutes(planning))}` : '4 dernières semaines'}
            hintTone={planning && last4Weeks.avgPerWeekMinutes < plannedWeeklyMinutes(planning) ? 'warning' : 'success'}
          />
          <Kpi label="Retards (30 j)" value={String(last30Days.lateDays)} hint={last30Days.lateDays > 3 ? 'Seuil de 3 dépassé' : 'Sous le seuil de 3'} hintTone={last30Days.lateDays > 3 ? 'danger' : 'success'} />
        </View>

        <Card>
          <Text style={text.h2}>Cette semaine</Text>
          <BarChart
            bars={bars}
            max={Math.max(1, planning ? planning.dailyMinutes / 60 : 0, ...bars.map((b) => b.value)) * 1.15}
            target={planning ? planning.dailyMinutes / 60 : undefined}
            describe={bars.map((b) => `${b.label} : ${formatDuration(b.value * 60)}`).join(', ')}
          />
        </Card>

        <Card style={{ gap: 0 }}>
          <Text style={[text.h2, { marginBottom: 6 }]}>Derniers pointages</Text>
          {days.length === 0 && <StateView loading={false} error={null} onRetry={reload} empty="Aucun pointage récent." />}
          {days.slice(0, 6).map((d, i) => (
            <Row
              key={d.key}
              first={i === 0}
              title={formatDay(d.date)}
              subtitle={`${d.arrival ? formatTime(d.arrival) : '—'} → ${d.departure ? formatTime(d.departure) : d.incomplete ? '?' : 'en cours'} · pause ${formatDuration(d.breakMinutes)}`}
              right={
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={text.strong}>{formatDuration(d.workedMinutes)}</Text>
                  {d.incomplete ? <Badge label="Oubli" tone="danger" /> : d.lateMinutes > 0 ? <Badge label={`+${d.lateMinutes} min`} tone="warning" /> : null}
                </View>
              }
            />
          ))}
        </Card>

        <Card style={{ gap: 0, paddingVertical: 6 }}>
          <View style={[layout.between, { paddingTop: 8 }]}>
            <Text style={text.h2}>Absences</Text>
            {pendingAbsences > 0 && <Badge label={`${pendingAbsences} en attente`} tone="warning" />}
          </View>
          <AbsenceHistory absences={absences} empty="Aucune absence déclarée." />
        </Card>
      </Screen>

      {manageable && (
        <>
          <EditSheet
            key={`edit-${sheet === 'edit'}`}
            visible={sheet === 'edit'}
            user={user}
            planning={planning}
            teams={teams}
            onClose={() => setSheet(null)}
            onSaved={reload}
          />
          <DeleteSheet visible={sheet === 'delete'} user={user} onClose={() => setSheet(null)} />
        </>
      )}
    </>
  );
}

const DAILY_OPTIONS = [360, 420, 450, 480].map((value) => ({ value, label: formatDuration(value) }));
const BREAK_OPTIONS = [30, 45, 60].map((value) => ({ value, label: formatDuration(value) }));

function EditSheet({
  visible,
  user,
  planning,
  teams,
  onClose,
  onSaved,
}: {
  visible: boolean;
  user: User;
  planning: Planning;
  teams: Team[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? '',
    teamId: user.teamId ?? 'none',
  });
  const [plan, setPlan] = useState<Planning>(planning);
  const [saving, setSaving] = useState(false);
  const set = (changes: Partial<typeof form>) => setForm((f) => ({ ...f, ...changes }));

  const startDate = new Date();
  startDate.setHours(Math.floor(plan.startMin / 60), plan.startMin % 60, 0, 0);
  const valid = form.firstName.trim() && form.lastName.trim() && /\S+@\S+\.\S+/.test(form.email) && plan.workDays.length > 0;

  async function save() {
    setSaving(true);
    try {
      await api.users.update(user.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        teamId: form.teamId === 'none' ? null : form.teamId,
        ...planningFields(plan),
      });
      onClose();
      onSaved();
    } catch (e) {
      Alert.alert('Enregistrement impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={`Modifier ${fullName(user)}`}>
      <View style={layout.grid2}>
        <View style={layout.grow}>
          <TextField label="Prénom" required value={form.firstName} onChangeText={(firstName) => set({ firstName })} />
        </View>
        <View style={layout.grow}>
          <TextField label="Nom" required value={form.lastName} onChangeText={(lastName) => set({ lastName })} />
        </View>
      </View>
      <TextField label="Email" required value={form.email} onChangeText={(email) => set({ email })} keyboardType="email-address" autoCapitalize="none" />
      <TextField label="Téléphone" value={form.phone} onChangeText={(phone) => set({ phone })} keyboardType="phone-pad" />
      <Chips
        label="Équipe"
        options={[...teams.map((t) => ({ value: t.id, label: t.name })), { value: 'none', label: 'Sans équipe' }]}
        value={form.teamId}
        onChange={(teamId) => set({ teamId })}
      />

      <Text style={[text.h2, { marginTop: 6 }]}>Planning</Text>
      <DaysPicker value={plan.workDays} onChange={(workDays) => setPlan((p) => ({ ...p, workDays }))} />
      <DateField label="Heure d'arrivée" mode="time" value={startDate} onChange={(d) => setPlan((p) => ({ ...p, startMin: minutesOfDay(d) }))} />
      <Chips label="Travail par jour" options={DAILY_OPTIONS} value={plan.dailyMinutes} onChange={(dailyMinutes) => setPlan((p) => ({ ...p, dailyMinutes }))} />
      <Chips label="Pause" options={BREAK_OPTIONS} value={plan.breakMinutes} onChange={(breakMinutes) => setPlan((p) => ({ ...p, breakMinutes }))} />
      <Banner icon="info">
        Fin de journée : {formatMinutesOfDay(expectedEndMin(plan))} · {formatDuration(plannedWeeklyMinutes(plan))} par semaine
        (calculé automatiquement).
      </Banner>
      <Button label="Enregistrer" large loading={saving} disabled={!valid} onPress={save} />
    </Sheet>
  );
}

function DeleteSheet({ visible, user, onClose }: { visible: boolean; user: User; onClose: () => void }) {
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      await api.users.remove(user.id);
      onClose();
      router.back();
    } catch (e) {
      Alert.alert('Suppression impossible', errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={`Supprimer ${fullName(user)} ?`}>
      <Banner tone="danger" icon="alert-triangle">
        Action irréversible. Le compte est désactivé et les données personnelles supprimées ; les pointages sont conservés de façon anonyme.
      </Banner>
      <TextField label="Pour confirmer, tapez SUPPRIMER" value={confirm} onChangeText={setConfirm} autoCapitalize="characters" />
      <Button label="Supprimer définitivement" variant="danger" large loading={deleting} disabled={confirm.trim() !== 'SUPPRIMER'} onPress={remove} />
    </Sheet>
  );
}
