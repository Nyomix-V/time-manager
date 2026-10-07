import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api';
import type { Absence, ProfileRequest, User } from '@/api/types';
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
type Item =
  | { kind: 'absence'; id: string; createdAt: string; userId: string; absence: Absence }
  | { kind: 'update' | 'delete'; id: string; createdAt: string; userId: string; request: ProfileRequest };

type Filter = 'all' | Item['kind'];
type Decision = { item: Item; approve: boolean } | null;

const KIND: Record<Item['kind'], { label: string; tone: Tone }> = {
  absence: { label: 'Absence', tone: 'info' },
  update: { label: 'Modification', tone: 'warning' },
  delete: { label: 'Suppression', tone: 'danger' },
};

export default function RequestsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [decision, setDecision] = useState<Decision>(null);

  const { data, error, loading, reload, refreshing, refresh } = useQuery(async () => {
    const [absences, requests, users] = await Promise.all([api.absences.listPending(), api.profileRequests.listPending(), api.users.list()]);
    const items: Item[] = [
      ...absences.map((absence): Item => ({ kind: 'absence', id: absence.id, createdAt: absence.createdAt, userId: absence.userId, absence })),
      ...requests.map((request): Item => ({ kind: request.kind === 'DELETE' ? 'delete' : 'update', id: request.id, createdAt: request.createdAt, userId: request.userId, request })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { items, users: new Map(users.map((u) => [u.id, u])) };
  }, []);

  const items = data?.items ?? [];
  const count = (kind: Filter) => (kind === 'all' ? items.length : items.filter((i) => i.kind === kind).length);
  const shown = filter === 'all' ? items : items.filter((i) => i.kind === filter);

  return (
    <Screen title="Demandes" right={items.length ? <Badge label={`${items.length} en attente`} tone="danger" /> : undefined} refreshing={refreshing} onRefresh={refresh}>
      <Chips
        options={[
          { value: 'all' as Filter, label: `Toutes ${count('all')}` },
          { value: 'absence' as Filter, label: `Absences ${count('absence')}` },
          { value: 'update' as Filter, label: `Modifs ${count('update')}` },
          { value: 'delete' as Filter, label: `Suppr. ${count('delete')}` },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {!data ? (
        <StateView loading={loading} error={error} onRetry={reload} />
      ) : shown.length === 0 ? (
        <StateView loading={false} error={null} onRetry={reload} empty="Aucune demande en attente." />
      ) : (
        shown.map((item) => (
          <RequestCard
            key={item.id}
            item={item}
            user={data.users.get(item.userId)}
            onDecide={(approve) => setDecision({ item, approve })}
          />
        ))
      )}

      {decision && data && (
        <DecisionSheet
          decision={decision}
          user={data.users.get(decision.item.userId)}
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
  if (item.kind === 'delete') return `Suppression du compte${item.request.reason ? ` · ${item.request.reason}` : ''}`;
  return `${FIELD_LABELS[item.request.field!]} → ${item.request.newValue}`;
}

function RequestCard({ item, user, onDecide }: { item: Item; user?: User; onDecide: (approve: boolean) => void }) {
  const name = user ? fullName(user) : 'Salarié';
  return (
    <Card style={{ padding: 14 }}>
      <View style={layout.row}>
        <Avatar name={name} size={34} />
        <View style={layout.grow}>
          <Text style={text.h3}>{name}</Text>
          <Text style={text.small}>{describe(item)}</Text>
        </View>
        <Badge label={KIND[item.kind].label} tone={KIND[item.kind].tone} />
      </View>
      {item.kind === 'absence' && !!item.absence.reason && <Text style={text.body}>« {item.absence.reason} »</Text>}
      {item.kind === 'absence' && item.absence.attachmentName && (
        <View style={layout.row}>
          <Feather name="paperclip" size={14} color={colors.primary} />
          <Text style={[text.small, { color: colors.primary }]}>{item.absence.attachmentName}</Text>
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

function DecisionSheet({ decision, user, onClose, onDone }: { decision: NonNullable<Decision>; user?: User; onClose: () => void; onDone: () => void }) {
  const { item, approve } = decision;
  const [comment, setComment] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);
  const name = user ? fullName(user) : 'ce salarié';

  // Refus : motif obligatoire. Suppression de compte : il faut taper SUPPRIMER.
  const ready = approve ? item.kind !== 'delete' || confirm.trim() === 'SUPPRIMER' : comment.trim().length > 0;

  async function send() {
    setSending(true);
    const payload = { status: approve ? ('APPROVED' as const) : ('REJECTED' as const), comment: comment.trim() || undefined };
    try {
      if (item.kind === 'absence') await api.absences.decide(item.id, payload);
      else await api.profileRequests.decide(item.id, payload);
      onDone();
    } catch (e) {
      Alert.alert('Décision impossible', errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  const title = !approve
    ? 'Refuser la demande'
    : item.kind === 'delete'
      ? `Supprimer le compte de ${name} ?`
      : item.kind === 'update'
        ? 'Valider la modification'
        : 'Valider la demande';

  return (
    <Sheet visible onClose={onClose} title={title} subtitle={`${name} · ${describe(item)}`}>
      {approve && item.kind === 'update' && (
        <Card style={{ padding: 14, gap: 6 }}>
          <Text style={text.small}>{FIELD_LABELS[item.request.field!]}</Text>
          <View style={layout.row}>
            <Text style={[text.body, styles.old]}>{item.request.currentValue ?? '—'}</Text>
            <Feather name="arrow-right" size={16} color={colors.muted} />
            <Text style={[text.body, text.strong]}>{item.request.newValue}</Text>
          </View>
        </Card>
      )}
      {approve && item.kind === 'absence' && (
        <Banner icon="info">Une fois validée, cette absence ne comptera ni comme retard ni comme heures manquantes.</Banner>
      )}
      {approve && item.kind === 'delete' && (
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
        label={approve ? (item.kind === 'delete' ? 'Supprimer le compte' : 'Valider') : 'Refuser la demande'}
        variant={approve && item.kind !== 'delete' ? 'primary' : 'danger'}
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
