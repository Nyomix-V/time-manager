import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';

import { api } from '@/api';
import type { Team, User } from '@/api/types';
import { useSession } from '@/auth/AuthProvider';
import { AbsenceHistory } from '@/components/AbsenceHistory';
import { StateView } from '@/components/data';
import { Chips, TextField } from '@/components/forms';
import { HoursReport } from '@/components/HoursReport';
import { PeriodPicker, usePeriod } from '@/components/period';
import { PlanningFields } from '@/components/PlanningFields';
import { Sheet } from '@/components/Sheet';
import { Badge, Banner, Button, Card, IconButton, Screen, layout, text } from '@/components/ui';
import { ROLE_LABELS, fullName } from '@/domain/labels';
import { canManage } from '@/domain/permissions';
import {
  endOfDay,
  excusedDays,
  expectedEndMin,
  formatDuration,
  formatMinutesOfDay,
  formatWorkDays,
  planningFields,
  planningOf,
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
  // Heures du salarié sur la période choisie (sujet : « daily and weekly working hours of an employee over a period »).
  const period = usePeriod('month');
  const { from, to } = period;

  const { data, error, loading, reload, refreshing, refresh } = useQuery(async () => {
    const [user, clocks, teams, absences] = await Promise.all([
      api.users.get(id),
      api.clocks.list(id, { from, to: endOfDay(to) }),
      api.teams.list(),
      api.absences.listForUser(id),
    ]);
    const planning = planningOf(user);
    return { user, planning, days: summarizeDays(clocks, planning), teams, absences, excused: excusedDays(absences) };
  }, [id, from.getTime(), to.getTime()]);

  if (!data) {
    return (
      <Screen title="Fiche salarié" safeTop={false}>
        <StateView loading={loading} error={error} onRetry={reload} />
      </Screen>
    );
  }

  const { user, planning, days, teams, absences, excused } = data;
  const manageable = canManage(session, user);
  const pendingAbsences = absences.filter((a) => a.status === 'PENDING').length;
  const team = user.team;

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

        <PeriodPicker period={period} />
        <HoursReport period={period} days={days} absences={absences} excused={excused} planning={planning} />

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

      <PlanningFields value={plan} onChange={setPlan} />
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
