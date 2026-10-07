import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api';
import type { Absence, AbsenceType } from '@/api/types';
import { useSession } from '@/auth/AuthProvider';
import { StateView } from '@/components/data';
import { Chips, DateField, Segmented, TextField } from '@/components/forms';
import { Badge, Banner, Button, Card, Screen, layout, text } from '@/components/ui';
import { ABSENCE_LABELS, DECISION_LABELS } from '@/domain/labels';
import { addDays, endOfDay, formatDate, formatDateRange, startOfDay } from '@/domain/time';
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

  const singleDay = type === 'FORGOTTEN_CLOCK' || type === 'MEDICAL';
  const reasonRequired = type === 'FORGOTTEN_CLOCK' || type === 'OTHER';
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
        reason: reason.trim(),
        attachmentName: attachment,
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
        label={type === 'FORGOTTEN_CLOCK' ? 'Heure oubliée et explication' : 'Commentaire'}
        required={reasonRequired}
        value={reason}
        onChangeText={setReason}
        placeholder={type === 'FORGOTTEN_CLOCK' ? 'Ex. : départ à 16:50, oublié de pointer' : 'Facultatif…'}
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
        {type === 'SICK_LEAVE' && (
          <Text style={text.small}>Joignez seulement l'avis d'arrêt : aucune information médicale n'est demandée.</Text>
        )}
      </View>
      <Button label="Envoyer la demande" icon="send" large loading={sending} disabled={!canSend} onPress={send} />
    </>
  );
}

function History() {
  const session = useSession();
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const { data, error, loading, reload } = useQuery(() => api.absences.listForUser(session.userId), [session.userId]);

  if (!data) return <StateView loading={loading} error={error} onRetry={reload} />;

  // Les 12 derniers mois par défaut, le reste avec « Tout voir ».
  const oneYearAgo = addDays(new Date(), -365);
  const recent = data.filter((a) => new Date(a.startDate) >= oneYearAgo);
  const older = data.length - recent.length;
  const shown = showAll ? data : recent;

  if (!data.length) return <StateView loading={false} error={null} onRetry={reload} empty="Aucune demande pour l'instant." />;

  return (
    <Card style={{ gap: 0, paddingVertical: 6 }}>
      <Text style={[text.small, { paddingVertical: 8 }]}>{showAll ? 'Toutes vos demandes' : '12 derniers mois'} · touchez une demande pour voir la réponse</Text>
      {shown.map((absence) => (
        <AbsenceItem
          key={absence.id}
          absence={absence}
          open={open === absence.id}
          onToggle={() => setOpen((id) => (id === absence.id ? null : absence.id))}
        />
      ))}
      {older > 0 && !showAll && (
        <Pressable onPress={() => setShowAll(true)} accessibilityRole="button" style={styles.seeAll}>
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={text.link}>
            Tout voir · {older} demande{older > 1 ? 's' : ''} de plus d'un an
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

function AbsenceItem({ absence, open, onToggle }: { absence: Absence; open: boolean; onToggle: () => void }) {
  const decision = DECISION_LABELS[absence.status];
  return (
    <View style={styles.item}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${ABSENCE_LABELS[absence.type]}, ${decision.label}`}
        style={styles.itemHead}
      >
        <View style={layout.grow}>
          <Text style={text.h3}>{ABSENCE_LABELS[absence.type]}</Text>
          <Text style={text.small}>{formatDateRange(new Date(absence.startDate), new Date(absence.endDate))}</Text>
        </View>
        <Badge label={decision.label} tone={decision.tone} />
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open && (
        <View style={styles.itemBody}>
          <Text style={text.small}>
            Envoyée le {formatDate(new Date(absence.createdAt))}
            {absence.attachmentName ? ` · ${absence.attachmentName}` : ''}
          </Text>
          {!!absence.reason && <Text style={text.body}>« {absence.reason} »</Text>}
          {absence.status === 'PENDING' ? (
            <Text style={text.muted}>Votre manager n'a pas encore répondu.</Text>
          ) : (
            <Banner tone={absence.status === 'APPROVED' ? 'success' : 'danger'} icon={absence.status === 'APPROVED' ? 'check' : 'x'}>
              {absence.decidedByName ?? 'Votre manager'} · {formatDate(new Date(absence.decidedAt!))}
              {absence.decisionComment ? `\n« ${absence.decisionComment} »` : ''}
            </Banner>
          )}
        </View>
      )}
    </View>
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
  item: { borderTopWidth: 1, borderTopColor: colors.border },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, minHeight: 56 },
  itemBody: { gap: 8, paddingBottom: 14 },
  seeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
});
