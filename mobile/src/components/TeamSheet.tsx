// Créer, modifier ou supprimer une équipe de sa branche (sujet : « manage their team(s) »).
// Une personne n'appartient qu'à une équipe : la cocher ici la retire de son équipe actuelle.
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api';
import type { Team, User } from '@/api/types';
import { fullName } from '@/domain/labels';
import { errorMessage } from '@/lib/api';
import { colors, radius } from '@/theme/tokens';
import { Chips, TextField } from './forms';
import { Sheet } from './Sheet';
import { Button, text } from './ui';

export function TeamSheet({
  visible,
  team,
  teams,
  people,
  branchId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  /** null = nouvelle équipe. */
  team: Team | null;
  teams: Team[];
  /** Salariés de la branche. */
  people: User[];
  branchId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialMembers = team ? people.filter((u) => u.teamId === team.id).map((u) => u.id) : [];
  const [name, setName] = useState(team?.name ?? '');
  const [description, setDescription] = useState(team?.description ?? '');
  const [managerId, setManagerId] = useState(team?.managerId ?? 'none');
  const [members, setMembers] = useState<string[]>(initialMembers);
  const [saving, setSaving] = useState(false);

  const managers = people.filter((u) => u.role === 'MANAGER' || u.role === 'DIRECTEUR');
  // Les employés de la branche, plus les membres actuels quel que soit leur rôle.
  const candidates = people
    .filter((u) => u.role === 'EMPLOYEE' || initialMembers.includes(u.id))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const teamName = (id?: string | null) => teams.find((t) => t.id === id)?.name;
  const toggle = (id: string) => setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  async function save() {
    setSaving(true);
    try {
      const changes = { name: name.trim(), description: description.trim(), managerId: managerId === 'none' ? null : managerId };
      const id = team
        ? (await api.teams.update(team.id, changes)).id
        : (await api.teams.create(branchId, { ...changes, managerId: changes.managerId ?? undefined })).id;
      const added = members.filter((m) => !initialMembers.includes(m));
      const removed = initialMembers.filter((m) => !members.includes(m));
      await Promise.all([...added.map((m) => api.teams.addMember(id, m)), ...removed.map((m) => api.teams.removeMember(id, m))]);
      onSaved();
      onClose();
    } catch (e) {
      Alert.alert('Enregistrement impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const confirmDelete = () =>
    team &&
    Alert.alert(
      `Supprimer l'équipe ${team.name} ?`,
      initialMembers.length
        ? `${initialMembers.length} personne${initialMembers.length > 1 ? 's deviendront' : ' deviendra'} « sans équipe ». Leurs heures sont conservées.`
        : 'Elle ne compte aucun membre.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.teams.remove(team.id);
              onSaved();
              onClose();
            } catch (e) {
              Alert.alert('Suppression impossible', errorMessage(e));
            }
          },
        },
      ],
    );

  return (
    <Sheet visible={visible} onClose={onClose} title={team ? `Équipe ${team.name}` : 'Nouvelle équipe'}>
      <TextField label="Nom" required value={name} onChangeText={setName} />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline maxLength={255} />
      <Chips
        label="Manager"
        options={[...managers.map((u) => ({ value: u.id, label: fullName(u) })), { value: 'none', label: 'Aucun' }]}
        value={managerId}
        onChange={setManagerId}
      />

      <Text style={[text.h2, { marginTop: 6 }]}>
        Membres <Text style={text.muted}>· {members.length}</Text>
      </Text>
      <View>
        {candidates.map((u) => {
          const checked = members.includes(u.id);
          const elsewhere = u.teamId && u.teamId !== team?.id ? teamName(u.teamId) : null;
          return (
            <Pressable
              key={u.id}
              onPress={() => toggle(u.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={fullName(u)}
              style={({ pressed }) => [styles.member, pressed && { backgroundColor: colors.bg }]}
            >
              <Feather name={checked ? 'check-square' : 'square'} size={22} color={checked ? colors.primary : colors.muted} />
              <View style={{ flex: 1 }}>
                <Text style={text.body}>{fullName(u)}</Text>
                {elsewhere && <Text style={[text.small, checked && { color: colors.warning }]}>{checked ? `Quittera ${elsewhere}` : `Équipe ${elsewhere}`}</Text>}
              </View>
            </Pressable>
          );
        })}
        {candidates.length === 0 && <Text style={text.muted}>Aucun employé dans la branche.</Text>}
      </View>

      <Button label={team ? 'Enregistrer' : "Créer l'équipe"} large loading={saving} disabled={!name.trim()} onPress={save} />
      {team && <Button label="Supprimer l'équipe" variant="ghost" icon="trash-2" color={colors.danger} onPress={confirmDelete} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 6, borderRadius: radius.md },
});
