import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { api } from '@/api';
import type { AccountRequest, EditableField, User } from '@/api/types';
import { useAuth, useSession } from '@/auth/AuthProvider';
import { Avatar, ProgressBar, Row, RowIcon, StateView } from '@/components/data';
import { Chips, TextField } from '@/components/forms';
import { Sheet } from '@/components/Sheet';
import { Badge, Banner, Button, Card, Screen, layout, text } from '@/components/ui';
import { DECISION_LABELS, FIELD_LABELS, ROLE_LABELS, fullName } from '@/domain/labels';
import { addDays, expectedEndMin, formatDate, formatDuration, formatMinutesOfDay, formatWorkDays, planningOf } from '@/domain/time';
import { useQuery } from '@/hooks/useQuery';
import { errorMessage } from '@/lib/api';
import { colors } from '@/theme/tokens';

// Maquette : docs/maquettes/mobile/m05-profil.html
// Les informations sont en lecture seule : on demande une modification, que le responsable valide.
// Une seule demande en attente à la fois (règle du backend : AccountRequestsService.create).
type OpenSheet = 'change' | 'delete' | 'password' | null;

export default function ProfileScreen() {
  const session = useSession();
  const { signOut } = useAuth();
  const [sheet, setSheet] = useState<OpenSheet>(null);

  const { data, error, loading, reload, refreshing, refresh } = useQuery(async () => {
    const [user, requests] = await Promise.all([api.users.get(session.userId), api.accountRequests.listForUser(session.userId)]);
    return { user, requests };
  }, [session.userId]);

  if (!data) {
    return (
      <Screen title="Mon profil">
        <StateView loading={loading} error={error} onRetry={reload} />
      </Screen>
    );
  }

  const { user, requests } = data;
  const planning = planningOf(user);
  const pending = requests.find((r) => r.status === 'PENDING');
  // Réponse récente (moins de 7 jours) à la dernière demande.
  const lastAnswer = requests.find((r) => r.status !== 'PENDING' && r.decidedAt && new Date(r.decidedAt) > addDays(new Date(), -7));

  const confirmSignOut = () =>
    Alert.alert('Se déconnecter ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
    ]);

  return (
    <Screen title="Mon profil" right={<Badge label="Lecture seule" icon="lock" />} refreshing={refreshing} onRefresh={refresh}>
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
            subtitle={`Planning · ${formatWorkDays(planning.workDays)} · pause ${formatDuration(planning.breakMinutes)}`}
          />
        )}
      </Card>

      {pending && (
        <Banner tone="warning" icon="clock">
          Demande en attente : {describeRequest(pending)}, envoyée le {formatDate(new Date(pending.createdAt))}. Vous pourrez en faire une nouvelle
          après la réponse de votre responsable.
        </Banner>
      )}
      {!pending && lastAnswer && (
        <Banner tone={DECISION_LABELS[lastAnswer.status].tone} icon={lastAnswer.status === 'APPROVED' ? 'check' : 'x'}>
          Votre demande ({describeRequest(lastAnswer)}) a été {lastAnswer.status === 'APPROVED' ? 'validée' : 'refusée'}
          {lastAnswer.decidedBy ? ` par ${fullName(lastAnswer.decidedBy)}` : ''}.
          {lastAnswer.decisionComment ? ` « ${lastAnswer.decisionComment} »` : ''}
        </Banner>
      )}

      <Card style={{ gap: 0, paddingVertical: 4 }}>
        <Row
          first
          left={<RowIcon name="edit-2" />}
          title="Demander une modification"
          subtitle={pending ? 'Indisponible : une demande est en attente' : 'Votre responsable la validera'}
          disabled={!!pending}
          onPress={() => setSheet('change')}
        />
        <Row left={<RowIcon name="lock" />} title="Changer mon mot de passe" onPress={() => setSheet('password')} />
        <Row left={<RowIcon name="log-out" />} title="Se déconnecter" onPress={confirmSignOut} />
      </Card>

      <Button
        label="Demander la suppression de mon compte"
        icon="trash-2"
        variant="ghost"
        color={colors.danger}
        disabled={!!pending}
        onPress={() => setSheet('delete')}
      />

      <ChangeSheet visible={sheet === 'change'} user={user} onClose={() => setSheet(null)} onDone={reload} />
      <DeleteSheet visible={sheet === 'delete'} onClose={() => setSheet(null)} onDone={reload} />
      <PasswordSheet visible={sheet === 'password'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

function describeRequest(r: AccountRequest) {
  return r.type === 'DELETION' ? 'suppression du compte' : `${r.field ? FIELD_LABELS[r.field] : 'information'} → ${r.newValue}`;
}

const FIELDS = (Object.keys(FIELD_LABELS) as EditableField[]).map((value) => ({ value, label: FIELD_LABELS[value] }));

function ChangeSheet({ visible, user, onClose, onDone }: { visible: boolean; user: User; onClose: () => void; onDone: () => void }) {
  const [field, setField] = useState<EditableField>('phone');
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const current = user[field] ?? '';

  async function send() {
    setSending(true);
    try {
      await api.accountRequests.requestChange(field, value.trim());
      setValue('');
      onClose();
      onDone();
    } catch (e) {
      Alert.alert('Envoi impossible', errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Demander une modification" subtitle="Une seule demande à la fois : votre responsable la valide ou la refuse.">
      <Chips
        label="Information"
        required
        options={FIELDS}
        value={field}
        onChange={(f) => {
          setField(f);
          setValue('');
        }}
      />
      <TextField label="Valeur actuelle" value={current || 'Non renseignée'} readOnly />
      <TextField
        label="Nouvelle valeur"
        required
        value={value}
        onChangeText={setValue}
        keyboardType={field === 'phone' ? 'phone-pad' : 'default'}
        autoCapitalize="words"
      />
      <Text style={text.small}>Pour changer d'adresse email, adressez-vous à votre responsable.</Text>
      <Button label="Envoyer la demande" large loading={sending} disabled={!value.trim() || value.trim() === current} onPress={send} />
    </Sheet>
  );
}

const DELETE_REASONS = [
  { value: "Départ de l'entreprise", label: "Départ de l'entreprise" },
  { value: 'Autre', label: 'Autre' },
];

function DeleteSheet({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<string>(DELETE_REASONS[0].value);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      await api.accountRequests.requestDeletion(reason);
      onClose();
      onDone();
    } catch (e) {
      Alert.alert('Envoi impossible', errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Supprimer mon compte"
      subtitle="Votre responsable recevra la demande. En attendant sa réponse, vous ne pourrez pas faire d'autre demande."
    >
      <Chips label="Motif" options={DELETE_REASONS} value={reason} onChange={setReason} />
      <Banner tone="danger" icon="alert-triangle">
        Une fois validée, la suppression est irréversible. Vos pointages sont conservés de façon anonyme pour les obligations légales.
      </Banner>
      <Button label="Envoyer la demande" variant="danger" large loading={sending} onPress={send} />
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
