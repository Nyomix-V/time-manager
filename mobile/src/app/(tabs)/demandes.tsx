import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api';
import type { Absence, AccountRequest, Requester } from '@/api/types';
import { Avatar, StateView } from '@/components/data';
import { Chips, TextField } from '@/components/forms';
import { Sheet } from '@/components/Sheet';
import { Badge, Banner, Button, Card, Screen, layout, text, type Tone } from '@/components/ui';
import { ABSENCE_LABELS, FIELD_LABELS, fullName } from '@/domain/labels';
import { formatDate, formatDateRange } from '@/domain/time';
import { useQuery } from '@/hooks/useQuery';
import { errorMessage } from '@/lib/api';
import { colors } from '@/theme/tokens';

// Maquette : docs/maquettes/mobile/m08-demandes.html
// Absences (GET /absences/pending) et demandes de compte (GET /account-requests/pending).
type Item =
  | { kind: 'absence'; id: string; createdAt: string; user?: Requester | null; absence: Absence }
  | { kind: 'change' | 'deletion'; id: string; createdAt: string; user?: Requester | null; request: AccountRequest };

type Filter = 'all' | Item['kind'];
type Decision = { item: Item; approve: boolean } | null;

const KIND: Record<Item['kind'], { label: string; tone: Tone }> = {
  absence: { label: 'Absence', tone: 'info' },
  change: { label: 'Modification', tone: 'warning' },
  deletion: { label: 'Suppression', tone: 'danger' },
};

export default function RequestsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [decision, setDecision] = useState<Decision>(null);

  const { data, error, loading, reload, refreshing, refresh } = useQuery(async () => {
    const [absences, requests] = await Promise.all([api.absences.listPending(), api.accountRequests.listPending()]);
    return [
      ...absences.map((absence): Item => ({ kind: 'absence', id: absence.id, createdAt: absence.createdAt, user: absence.user, absence })),
      ...requests.map(
        (request): Item => ({
          kind: request.type === 'DELETION' ? 'deletion' : 'change',
          id: request.id,
          createdAt: request.createdAt,
          user: request.user,
          request,
        }),
      ),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, []);

  const items = data ?? [];
  const count = (kind: Filter) => (kind === 'all' ? items.length : items.filter((i) => i.kind === kind).length);
  const shown = filter === 'all' ? items : items.filter((i) => i.kind === filter);

  return (
    <Screen title="Demandes" right={items.length ? <Badge label={`${items.length} en attente`} tone="danger" /> : undefined} refreshing={refreshing} onRefresh={refresh}>
      <Chips
        options={[
          { value: 'all' as Filter, label: `Toutes ${count('all')}` },
          { value: 'absence' as Filter, label: `Absences ${count('absence')}` },
          { value: 'change' as Filter, label: `Modifs ${count('change')}` },
          { value: 'deletion' as Filter, label: `Suppr. ${count('deletion')}` },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {!data ? (
        <StateView loading={loading} error={error} onRetry={reload} />
      ) : shown.length === 0 ? (
        <StateView loading={false} error={null} onRetry={reload} empty="Aucune demande en attente." />
      ) : (
        shown.map((item) => <RequestCard key={item.id} item={item} onDecide={(approve) => setDecision({ item, approve })} />)
      )}

      {decision && (
        <DecisionSheet
          decision={decision}
          onClose={() => setDecision(null)}
          onDone={() => {
            setDecision(null);
            reload();
          }}
        />
      )}
    </Screen>
  );
}

function describe(item: Item) {
  if (item.kind === 'absence') {
    const a = item.absence;
    return `${ABSENCE_LABELS[a.type]} · ${formatDateRange(new Date(a.startDate), new Date(a.endDate))}`;
  }
  if (item.kind === 'deletion') return `Suppression du compte${item.request.reason ? ` · ${item.request.reason}` : ''}`;
  return `${item.request.field ? FIELD_LABELS[item.request.field] : 'Information'} → ${item.request.newValue}`;
}

const nameOf = (item: Item) => (item.user ? fullName(item.user) : 'Salarié');

function RequestCard({ item, onDecide }: { item: Item; onDecide: (approve: boolean) => void }) {
  return (
    <Card style={{ padding: 14 }}>
      <View style={layout.row}>
        <Avatar name={nameOf(item)} size={34} />
        <View style={layout.grow}>
          <Text style={text.h3}>{nameOf(item)}</Text>
          <Text style={text.small}>{describe(item)}</Text>
        </View>
        <Badge label={KIND[item.kind].label} tone={KIND[item.kind].tone} />
      </View>
      {item.kind === 'absence' && !!item.absence.comment && <Text style={text.body}>« {item.absence.comment} »</Text>}
      {item.kind === 'absence' && !!item.absence.attachmentPath && (
        <View style={layout.row}>
          <Feather name="paperclip" size={14} color={colors.primary} />
          <Text style={[text.small, { color: colors.primary }]}>{item.absence.attachmentPath}</Text>
        </View>
      )}
      <Text style={text.small}>Envoyée le {formatDate(new Date(item.createdAt))}</Text>
      <View style={layout.grid2}>
        <View style={layout.grow}>
          <Button label="Refuser" icon="x" variant="secondary" small onPress={() => onDecide(false)} />
        </View>
        <View style={layout.grow}>
          <Button label="Valider" icon="check" small onPress={() => onDecide(true)} />
        </View>
      </View>
    </Card>
  );
}

function DecisionSheet({ decision, onClose, onDone }: { decision: NonNullable<Decision>; onClose: () => void; onDone: () => void }) {
  const { item, approve } = decision;
  const [comment, setComment] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);
  const name = item.user ? fullName(item.user) : 'ce salarié';

  // Refus : motif obligatoire. Suppression de compte : il faut taper SUPPRIMER.
  const ready = approve ? item.kind !== 'deletion' || confirm.trim() === 'SUPPRIMER' : comment.trim().length > 0;

  async function send() {
    setSending(true);
    const payload = { status: approve ? ('APPROVED' as const) : ('REJECTED' as const), decisionComment: comment.trim() || undefined };
    try {
      if (item.kind === 'absence') await api.absences.decide(item.id, payload);
      else await api.accountRequests.decide(item.id, payload);
      onDone();
    } catch (e) {
      Alert.alert('Décision impossible', errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  const title = !approve
    ? 'Refuser la demande'
    : item.kind === 'deletion'
      ? `Supprimer le compte de ${name} ?`
      : item.kind === 'change'
        ? 'Valider la modification'
        : 'Valider la demande';

  return (
    <Sheet visible onClose={onClose} title={title} subtitle={`${name} · ${describe(item)}`}>
      {approve && item.kind === 'change' && item.request.field && (
        <Card style={{ padding: 14, gap: 6 }}>
          <Text style={text.small}>{FIELD_LABELS[item.request.field]}</Text>
          <View style={layout.row}>
            <Text style={[text.body, styles.old]}>{item.user?.[item.request.field] || '—'}</Text>
            <Feather name="arrow-right" size={16} color={colors.muted} />
            <Text style={[text.body, text.strong]}>{item.request.newValue}</Text>
          </View>
        </Card>
      )}
      {approve && item.kind === 'absence' && (
        <Banner icon="info">Une fois validée, cette absence ne comptera ni comme retard ni comme heures manquantes.</Banner>
      )}
      {approve && item.kind === 'deletion' && (
        <>
          <Banner tone="danger" icon="alert-triangle">
            Action irréversible. Les données personnelles sont supprimées ; les pointages sont conservés de façon anonyme.
          </Banner>
          <TextField label="Pour confirmer, tapez SUPPRIMER" value={confirm} onChangeText={setConfirm} autoCapitalize="characters" />
        </>
      )}
      <TextField
        label={approve ? 'Commentaire pour le salarié' : 'Motif du refus'}
        required={!approve}
        value={comment}
        onChangeText={setComment}
        placeholder={approve ? 'Facultatif…' : 'Le salarié le verra dans son historique.'}
        multiline
        maxLength={300}
      />
      <Button
        label={approve ? (item.kind === 'deletion' ? 'Supprimer le compte' : 'Valider') : 'Refuser la demande'}
        variant={approve && item.kind !== 'deletion' ? 'primary' : 'danger'}
        large
        loading={sending}
        disabled={!ready}
        onPress={send}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  old: { color: colors.muted, textDecorationLine: 'line-through' },
});
