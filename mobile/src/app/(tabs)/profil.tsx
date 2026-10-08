import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { api } from '@/api';
import type { User } from '@/api/types';
import { useAuth, useSession } from '@/auth/AuthProvider';
import { Avatar, ProgressBar, Row, RowIcon, StateView } from '@/components/data';
import { TextField } from '@/components/forms';
import { Sheet } from '@/components/Sheet';
import { Banner, Button, Card, Screen, layout, text } from '@/components/ui';
import { ROLE_LABELS, fullName } from '@/domain/labels';
import { expectedEndMin, formatDuration, formatMinutesOfDay, formatWorkDays, planningOf } from '@/domain/time';
import { useQuery } from '@/hooks/useQuery';
import { errorMessage } from '@/lib/api';
import { colors } from '@/theme/tokens';

// Maquette : docs/maquettes/mobile/m05-profil.html
// Chacun modifie ses informations et peut supprimer son compte (sujet : « edit their account information »,
// « delete their account »). Le rôle, l'équipe et le planning restent fixés par le manager.
type OpenSheet = 'edit' | 'delete' | 'password' | null;

export default function ProfileScreen() {
  const session = useSession();
  const { signOut } = useAuth();
  const [sheet, setSheet] = useState<OpenSheet>(null);

  const { data: user, error, loading, reload, refreshing, refresh } = useQuery(() => api.users.get(session.userId), [session.userId]);

  if (!user) {
    return (
      <Screen title="Mon profil">
        <StateView loading={loading} error={error} onRetry={reload} />
      </Screen>
    );
  }

  const planning = planningOf(user);

  const confirmSignOut = () =>
    Alert.alert('Se déconnecter ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
    ]);

  return (
    <Screen title="Mon profil" refreshing={refreshing} onRefresh={refresh}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={fullName(user)} size={56} />
        <View style={layout.grow}>
          <Text style={[text.h2, { fontSize: 18 }]}>{fullName(user)}</Text>
          <Text style={text.muted}>
            {ROLE_LABELS[user.role]}
            {user.team ? ` · ${user.team.name}` : ''}
            {user.branch ? ` · ${user.branch.name}` : ''}
          </Text>
          {!!user.msOid && <Text style={text.small}>Compte Microsoft lié</Text>}
        </View>
      </Card>

      <Card style={{ gap: 0, paddingVertical: 4 }}>
        <Row first left={<RowIcon name="mail" />} title={user.email} subtitle="Email" />
        <Row left={<RowIcon name="phone" />} title={user.phone || 'Non renseigné'} subtitle="Téléphone" />
        {session.role !== 'ADMIN' && (
          <Row
            left={<RowIcon name="calendar" />}
            title={`${formatMinutesOfDay(planning.startMin)} → ${formatMinutesOfDay(expectedEndMin(planning))} · ${formatDuration(planning.dailyMinutes)} / jour`}
            subtitle={`Planning fixé par votre responsable · ${formatWorkDays(planning.workDays)} · pause ${formatDuration(planning.breakMinutes)}`}
          />
        )}
      </Card>

      <Card style={{ gap: 0, paddingVertical: 4 }}>
        <Row first left={<RowIcon name="edit-2" />} title="Modifier mes informations" subtitle="Nom, email, téléphone" onPress={() => setSheet('edit')} />
        <Row left={<RowIcon name="lock" />} title="Changer mon mot de passe" onPress={() => setSheet('password')} />
        <Row left={<RowIcon name="log-out" />} title="Se déconnecter" onPress={confirmSignOut} />
      </Card>

      {session.role !== 'ADMIN' && (
        <Button label="Supprimer mon compte" icon="trash-2" variant="ghost" color={colors.danger} onPress={() => setSheet('delete')} />
      )}

      <EditSheet key={`edit-${sheet === 'edit'}`} visible={sheet === 'edit'} user={user} onClose={() => setSheet(null)} onSaved={reload} />
      <DeleteSheet key={`delete-${sheet === 'delete'}`} visible={sheet === 'delete'} onClose={() => setSheet(null)} onDeleted={signOut} />
      <PasswordSheet visible={sheet === 'password'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

const EMAIL = /^\S+@\S+\.\S+$/;

function EditSheet({ visible, user, onClose, onSaved }: { visible: boolean; user: User; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone ?? '' });
  const [saving, setSaving] = useState(false);
  const set = (changes: Partial<typeof form>) => setForm((f) => ({ ...f, ...changes }));

  const emailError = form.email.trim() && !EMAIL.test(form.email.trim()) ? 'Adresse email invalide.' : null;
  const valid = form.firstName.trim() && form.lastName.trim() && EMAIL.test(form.email.trim());

  async function save() {
    setSaving(true);
    try {
      await api.users.updateMe({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
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
    <Sheet visible={visible} onClose={onClose} title="Modifier mes informations">
      <TextField label="Prénom" required value={form.firstName} onChangeText={(firstName) => set({ firstName })} autoComplete="given-name" />
      <TextField label="Nom" required value={form.lastName} onChangeText={(lastName) => set({ lastName })} autoComplete="family-name" />
      <TextField
        label="Email"
        required
        value={form.email}
        onChangeText={(email) => set({ email })}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={emailError}
        hint="C'est aussi votre identifiant de connexion."
      />
      <TextField label="Téléphone" value={form.phone} onChangeText={(phone) => set({ phone })} keyboardType="phone-pad" autoComplete="tel" />
      <Button label="Enregistrer" large loading={saving} disabled={!valid} onPress={save} />
    </Sheet>
  );
}

function DeleteSheet({ visible, onClose, onDeleted }: { visible: boolean; onClose: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      await api.users.removeMe();
      onClose();
      Alert.alert('Compte supprimé', 'Vos informations personnelles ont été supprimées.');
      onDeleted();
    } catch (e) {
      Alert.alert('Suppression impossible', errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Supprimer mon compte" subtitle="Vous serez déconnecté et ne pourrez plus vous reconnecter.">
      <Banner tone="danger" icon="alert-triangle">
        Action irréversible. Votre compte et vos informations personnelles sont supprimés ; vos pointages sont conservés de façon anonyme pour
        les obligations légales.
      </Banner>
      <TextField label="Pour confirmer, tapez SUPPRIMER" value={confirm} onChangeText={setConfirm} autoCapitalize="characters" />
      <Button label="Supprimer définitivement" variant="danger" large loading={deleting} disabled={confirm.trim() !== 'SUPPRIMER'} onPress={remove} />
    </Sheet>
  );
}

// Même politique que le backend (auth.controller.ts) : 12 caractères, une majuscule, un chiffre, un caractère spécial.
const PASSWORD_RULES: [RegExp, string][] = [
  [/.{12,}/, '12 caractères'],
  [/[A-Z]/, 'une majuscule'],
  [/\d/, 'un chiffre'],
  [/[^A-Za-z0-9]/, 'un caractère spécial'],
];

function PasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);

  const missing = PASSWORD_RULES.filter(([rule]) => !rule.test(next)).map(([, label]) => label);
  const strength = (PASSWORD_RULES.length - missing.length) / PASSWORD_RULES.length;
  const mismatch = confirm.length > 0 && confirm !== next;

  async function send() {
    setSending(true);
    try {
      await api.auth.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      onClose();
      Alert.alert('Mot de passe modifié', 'Utilisez-le dès votre prochaine connexion.');
    } catch (e) {
      Alert.alert('Modification impossible', errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Changer mon mot de passe">
      <TextField label="Mot de passe actuel" required value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
      <TextField
        label="Nouveau mot de passe"
        required
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoComplete="new-password"
        hint={missing.length ? `Il manque : ${missing.join(', ')}.` : 'Mot de passe robuste.'}
      />
      <ProgressBar value={strength} tone={strength === 1 ? 'success' : strength >= 0.5 ? 'warning' : 'danger'} />
      <TextField
        label="Confirmer le mot de passe"
        required
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        error={mismatch ? 'Les deux mots de passe sont différents.' : null}
      />
      <Button label="Mettre à jour" large loading={sending} disabled={!current || missing.length > 0 || confirm !== next} onPress={send} />
    </Sheet>
  );
}
