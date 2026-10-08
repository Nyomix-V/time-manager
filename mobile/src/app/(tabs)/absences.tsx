import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api';
import type { AbsenceType } from '@/api/types';
import { useSession } from '@/auth/AuthProvider';
import { AbsenceHistory } from '@/components/AbsenceHistory';
import { StateView } from '@/components/data';
import { Chips, DateField, Segmented, TextField } from '@/components/forms';
import { Button, Card, Screen, layout, text } from '@/components/ui';
import { ABSENCE_LABELS } from '@/domain/labels';
import { endOfDay, startOfDay } from '@/domain/time';
import { useQuery } from '@/hooks/useQuery';
import { errorMessage } from '@/lib/api';
import { colors, radius } from '@/theme/tokens';

// Maquette : docs/maquettes/mobile/m04-absence.html
type AbsenceView = 'new' | 'history';

export default function AbsencesScreen() {
  const [view, setView] = useState<AbsenceView>('new');
  return (
    <Screen title="Absences">
      <Segmented
        options={[
          { value: 'new', label: 'Nouvelle demande' },
          { value: 'history', label: 'Historique' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'new' ? <NewAbsence onSent={() => setView('history')} /> : <History />}
    </Screen>
  );
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const TYPES = (Object.keys(ABSENCE_LABELS) as AbsenceType[]).map((value) => ({ value, label: ABSENCE_LABELS[value] }));

function NewAbsence({ onSent }: { onSent: () => void }) {
  const [type, setType] = useState<AbsenceType | null>(null);
  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const [endDate, setEndDate] = useState(() => startOfDay(new Date()));
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const singleDay = type === 'MISSED_CLOCK' || type === 'MEDICAL';
  const reasonRequired = type === 'MISSED_CLOCK' || type === 'OTHER';
  const canSend = !!type && (!reasonRequired || reason.trim().length > 0);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: false });
    if (result.canceled) return;
    const file = result.assets[0];
    if (file.size && file.size > MAX_FILE_BYTES) {
      Alert.alert('Fichier trop lourd', 'Le justificatif ne doit pas dépasser 5 Mo.');
      return;
    }
    // Mode démo : seul le nom du fichier est envoyé. L'envoi du fichier lui-même attend la route du backend.
    setAttachment(file.name);
  }

  async function send() {
    if (!type) return;
    setSending(true);
    try {
      await api.absences.create({
        type,
        startDate,
        endDate: singleDay ? endOfDay(startDate) : endOfDay(endDate),
        comment: reason.trim() || undefined,
        attachmentPath: attachment ?? undefined,
      });
      Alert.alert('Demande envoyée', 'Votre manager va la traiter. Vous suivez sa réponse dans l’historique.');
      onSent();
    } catch (e) {
      Alert.alert('Envoi impossible', errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Chips label="Motif" required options={TYPES} value={type} onChange={setType} />
      {singleDay ? (
        <DateField label="Date" required value={startDate} onChange={setStartDate} />
      ) : (
        <View style={layout.grid2}>
          <View style={layout.grow}>
            <DateField
              label="Du"
              required
              value={startDate}
              onChange={(d) => {
                setStartDate(d);
                if (endDate < d) setEndDate(d);
              }}
            />
          </View>
          <View style={layout.grow}>
            <DateField label="Au" required value={endDate} minimumDate={startDate} onChange={setEndDate} />
          </View>
        </View>
      )}
      <TextField
        label={type === 'MISSED_CLOCK' ? 'Heure oubliée et explication' : 'Commentaire'}
        required={reasonRequired}
        value={reason}
        onChangeText={setReason}
        placeholder={type === 'MISSED_CLOCK' ? 'Ex. : départ à 16:50, oublié de pointer' : 'Facultatif…'}
        multiline
        maxLength={500}
      />
      <View style={{ gap: 6 }}>
        <Text style={text.h3}>Justificatif</Text>
        {attachment ? (
          <View style={styles.file}>
            <Feather name="file" size={18} color={colors.primary} />
            <Text style={[text.body, layout.grow]} numberOfLines={1}>
              {attachment}
            </Text>
            <Pressable onPress={() => setAttachment(null)} accessibilityRole="button" accessibilityLabel="Retirer le justificatif" hitSlop={8}>
              <Feather name="x" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pickFile} accessibilityRole="button" style={styles.dropzone}>
            <Feather name="upload" size={22} color={colors.primary} />
            <Text style={text.h3}>Choisir un fichier ou une photo</Text>
            <Text style={text.small}>PDF, JPG ou PNG · 5 Mo maximum</Text>
          </Pressable>
        )}
        {type === 'SICK' && (
          <Text style={text.small}>Joignez seulement l'avis d'arrêt : aucune information médicale n'est demandée.</Text>
        )}
      </View>
      <Button label="Envoyer la demande" icon="send" large loading={sending} disabled={!canSend} onPress={send} />
    </>
  );
}

function History() {
  const session = useSession();
  const { data, error, loading, reload } = useQuery(() => api.absences.listForUser(session.userId), [session.userId]);
  if (!data) return <StateView loading={loading} error={error} onRetry={reload} />;
  return (
    <Card style={{ gap: 0, paddingVertical: 6 }}>
      <AbsenceHistory absences={data} empty="Aucune demande pour l'instant." />
    </Card>
  );
}

const styles = StyleSheet.create({
  dropzone: {
    alignItems: 'center',
    gap: 4,
    padding: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  file: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.primarySoft },
});
