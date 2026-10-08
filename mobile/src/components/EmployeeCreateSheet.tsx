// Inscription d'un salarié par son manager ou son directeur (sujet : « register employees »), dans sa branche.
// Le compte est créé « invité » : la personne reçoit un lien pour choisir son mot de passe.
import { useState } from 'react';
import { Alert, Share, Text } from 'react-native';

import { api } from '@/api';
import type { CreatedUser, Team } from '@/api/types';
import type { Role, Session } from '@/auth/session';
import { ROLE_LABELS, fullName } from '@/domain/labels';
import { creatableRoles } from '@/domain/permissions';
import { planningFields, type Planning } from '@/domain/time';
import { errorMessage } from '@/lib/api';
import { webLink } from '@/lib/config';
import { colors } from '@/theme/tokens';
import { Chips, TextField } from './forms';
import { DEFAULT_PLANNING, PlanningFields } from './PlanningFields';
import { Sheet } from './Sheet';
import { Banner, Button, text } from './ui';

const EMAIL = /^\S+@\S+\.\S+$/;

export function EmployeeCreateSheet({
  visible,
  session,
  teams,
  onClose,
  onCreated,
}: {
  visible: boolean;
  session: Session;
  /** Équipes de la branche. */
  teams: Team[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const roles = creatableRoles(session.role);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: roles[0] as Role, teamId: 'none' });
  const [plan, setPlan] = useState<Planning>(DEFAULT_PLANNING);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreatedUser | null>(null);
  const set = (changes: Partial<typeof form>) => setForm((f) => ({ ...f, ...changes }));

  const emailError = form.email.trim() && !EMAIL.test(form.email.trim()) ? 'Adresse email invalide.' : null;
  const valid = form.firstName.trim() && form.lastName.trim() && EMAIL.test(form.email.trim()) && plan.workDays.length > 0;

  async function create() {
    setSaving(true);
    try {
      const user = await api.users.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        // Toujours sa propre branche : le backend refuse les autres.
        branchId: session.branchId ?? undefined,
        teamId: form.teamId === 'none' ? undefined : form.teamId,
        ...planningFields(plan),
      });
      setCreated(user);
      onCreated();
    } catch (e) {
      Alert.alert('Création impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    const link = webLink('/activer-mon-compte', created.activationToken);
    const share = () =>
      Share.share({
        message: link
          ? `Bonjour ${created.firstName}, votre compte Time Manager est prêt. Choisissez votre mot de passe ici (lien valable 48 h) : ${link}`
          : `Bonjour ${created.firstName}, votre compte Time Manager est prêt. Code d'activation (valable 48 h) : ${created.activationToken}`,
      });
    return (
      <Sheet visible={visible} onClose={onClose} title="Salarié inscrit">
        <Banner tone="success" icon="check">
          Le compte de {fullName(created)} est créé. Il reste en attente tant que {created.firstName} n'a pas choisi son mot de passe.
        </Banner>
        <Text style={text.body}>
          {link
            ? 'Envoyez-lui ce lien d’activation, valable 48 heures :'
            : 'Donnez-lui ce code d’activation, valable 48 heures, à saisir sur la page « Activer mon compte » du site :'}
        </Text>
        <Text style={[text.small, { color: colors.text }]} selectable>
          {link ?? created.activationToken}
        </Text>
        <Button label="Partager le lien" icon="share-2" large onPress={share} />
        <Button label="Terminé" variant="secondary" large onPress={onClose} />
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Inscrire un salarié" subtitle="Il recevra un lien pour activer son compte.">
      <TextField label="Prénom" required value={form.firstName} onChangeText={(firstName) => set({ firstName })} autoComplete="off" />
      <TextField label="Nom" required value={form.lastName} onChangeText={(lastName) => set({ lastName })} autoComplete="off" />
      <TextField
        label="Email professionnel"
        required
        value={form.email}
        onChangeText={(email) => set({ email })}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="off"
        error={emailError}
      />
      <TextField label="Téléphone" value={form.phone} onChangeText={(phone) => set({ phone })} keyboardType="phone-pad" />
      {roles.length > 1 && (
        <Chips label="Rôle" options={roles.map((value) => ({ value, label: ROLE_LABELS[value] }))} value={form.role} onChange={(role) => set({ role })} />
      )}
      <Chips
        label="Équipe"
        options={[...teams.map((t) => ({ value: t.id, label: t.name })), { value: 'none', label: 'Sans équipe' }]}
        value={form.teamId}
        onChange={(teamId) => set({ teamId })}
      />
      <PlanningFields value={plan} onChange={setPlan} />
      <Button label="Inscrire" icon="user-plus" large loading={saving} disabled={!valid} onPress={create} />
    </Sheet>
  );
}
