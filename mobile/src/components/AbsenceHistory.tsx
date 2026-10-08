// Historique des absences : 12 derniers mois, détail au toucher, « Tout voir » pour les plus anciennes.
// Utilisé par l'employé (onglet Absences) et par le manager (fiche d'un salarié).
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Absence } from '@/api/types';
import { ABSENCE_LABELS, DECISION_LABELS } from '@/domain/labels';
import { addDays, formatDate, formatDateRange } from '@/domain/time';
import { colors } from '@/theme/tokens';
import { StateView } from './data';
import { Badge, Banner, layout, text } from './ui';

export function AbsenceHistory({ absences, empty }: { absences: Absence[]; empty: string }) {
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  if (!absences.length) return <StateView loading={false} error={null} onRetry={() => {}} empty={empty} />;

  const oneYearAgo = addDays(new Date(), -365);
  const recent = absences.filter((a) => new Date(a.startDate) >= oneYearAgo);
  const older = absences.length - recent.length;
  const shown = showAll ? absences : recent;

  return (
    <View>
      <Text style={[text.small, styles.caption]}>{showAll ? 'Toutes les demandes' : '12 derniers mois'} · touchez une demande pour le détail</Text>
      {shown.length === 0 && <Text style={[text.muted, styles.caption]}>Aucune demande sur les 12 derniers mois.</Text>}
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
    </View>
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
            {absence.attachmentPath ? ` · ${absence.attachmentPath}` : ''}
          </Text>
          {!!absence.comment && <Text style={text.body}>« {absence.comment} »</Text>}
          {absence.status === 'PENDING' ? (
            <Text style={text.muted}>Pas encore de réponse.</Text>
          ) : (
            <Banner tone={absence.status === 'APPROVED' ? 'success' : 'danger'} icon={absence.status === 'APPROVED' ? 'check' : 'x'}>
              {absence.status === 'APPROVED' ? 'Validée' : 'Refusée'} le {formatDate(new Date(absence.decidedAt!))}
              {absence.decisionComment ? `\n« ${absence.decisionComment} »` : ''}
            </Banner>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { paddingVertical: 8 },
  item: { borderTopWidth: 1, borderTopColor: colors.border },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, minHeight: 56 },
  itemBody: { gap: 8, paddingBottom: 14 },
  seeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
});
