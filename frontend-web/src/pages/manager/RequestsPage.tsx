import { useMemo, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { Check, Edit3, Info, X } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { useUsers } from '@/api/users';
import { useAbsencesOf, useDecideAbsence } from '@/api/absences';
import { useDecideRequest, useRequestsOf } from '@/api/accountRequests';
import { getErrorMessage } from '@/api/client';
import type { Absence, AccountRequest, RequestStatus, User } from '@/api/types';
import { usePendingInbox } from '@/hooks/usePendingInbox';
import { formatDateTime, fullName } from '@/lib/format';
import { ABSENCE_LABELS, formatAbsenceRange } from '@/lib/absences';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, Spinner } from '@/components/QueryState';
import { Person } from '@/components/Person';
import { Field } from '@/components/Field';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { DecisionBadge } from '@/components/absences/DecisionBadge';
import { Card, CardTitle, FlushCard } from '@/components/ui/card';
import { Table, Td, Th, num } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Segmented } from '@/components/ui/segmented';
import { Dialog, DialogActions, DialogClose, DialogContent } from '@/components/ui/dialog';

type Item =
  | { kind: 'absence'; id: string; user: User; createdAt: string; status: RequestStatus; absence: Absence }
  | {
      kind: 'request';
      id: string;
      user: User;
      createdAt: string;
      status: RequestStatus;
      request: AccountRequest;
    };

type TypeFilter = 'all' | 'absence' | 'INFO_CHANGE' | 'DELETION';

const FIELD_LABELS: Record<string, string> = { firstName: 'Prénom', lastName: 'Nom', phone: 'Téléphone' };

const matchesType = (i: Item, t: TypeFilter) =>
  t === 'all' || (t === 'absence' ? i.kind === 'absence' : i.kind === 'request' && i.request.type === t);

const decisionOf = (i: Item) => (i.kind === 'absence' ? i.absence : i.request);

/** Requests to validate (mockup 13): absences, profile changes and account deletions. */
export function RequestsPage() {
  const me = useCurrentUser();
  const [tab, setTab] = useState<'pending' | 'done'>('pending');
  const [type, setType] = useState<TypeFilter>('all');
  const [deciding, setDeciding] = useState<{ item: Item; status: 'APPROVED' | 'REJECTED' } | null>(null);

  const inbox = usePendingInbox();
  // History: the backend only lists pending items globally, decided ones are read user by user.
  const users = useUsers();
  const others = (users.data ?? []).filter((u) => u.id !== me.id).map((u) => u.id);
  const absenceHistory = useAbsencesOf(others, tab === 'done');
  const requestHistory = useRequestsOf(others, tab === 'done');

  const items = useMemo<Item[]>(() => {
    const byId = new Map(users.data?.map((u) => [u.id, u]));
    const toItems = (absences: Absence[], requests: AccountRequest[]): Item[] => [
      ...absences.flatMap((a): Item[] => {
        const user = a.user ?? byId.get(a.userId);
        return user
          ? [{ kind: 'absence', id: a.id, user, createdAt: a.createdAt, status: a.status, absence: a }]
          : [];
      }),
      ...requests.flatMap((r): Item[] => {
        const user = r.user ?? byId.get(r.userId);
        return user
          ? [{ kind: 'request', id: r.id, user, createdAt: r.createdAt, status: r.status, request: r }]
          : [];
      }),
    ];
    const list =
      tab === 'pending'
        ? toItems(inbox.absences, inbox.requests)
        : toItems(absenceHistory.data, requestHistory.data).filter((i) => i.status !== 'PENDING');
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [tab, inbox.absences, inbox.requests, absenceHistory.data, requestHistory.data, users.data]);

  const shown = items.filter((i) => matchesType(i, type));
  const count = (t: TypeFilter) => items.filter((i) => matchesType(i, t)).length;
  const loading =
    tab === 'pending'
      ? inbox.isPending
      : users.isPending || absenceHistory.isPending || requestHistory.isPending;
  const error =
    tab === 'pending' ? inbox.error : (users.error ?? absenceHistory.error ?? requestHistory.error);

  return (
    <>
      <PageHeader
        title="Demandes à valider"
        subtitle="Absences, modifications d'informations et suppressions de compte envoyées par vos salariés."
      >
        <Segmented
          label="Statut des demandes"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: `En attente (${inbox.count})` },
            { value: 'done', label: 'Traitées' },
          ]}
        />
      </PageHeader>

      <Segmented
        label="Type de demande"
        className="self-start"
        value={type}
        onChange={setType}
        options={[
          { value: 'all', label: `Toutes (${count('all')})` },
          { value: 'absence', label: `Absences (${count('absence')})` },
          { value: 'INFO_CHANGE', label: `Modifications (${count('INFO_CHANGE')})` },
          { value: 'DELETION', label: `Suppressions (${count('DELETION')})` },
        ]}
      />

      <FlushCard aria-label={tab === 'pending' ? 'Demandes en attente' : 'Demandes traitées'}>
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} />
          </div>
        ) : shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">Aucune demande.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Salarié</Th>
                <Th>Type</Th>
                <Th>Détail</Th>
                <Th>Envoyée le</Th>
                <Th className={num}>{tab === 'pending' ? 'Décision' : 'Statut'}</Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => (
                <tr key={`${item.kind}-${item.id}`}>
                  <Td>
                    <Person
                      firstName={item.user.firstName}
                      lastName={item.user.lastName}
                      sub={item.user.team?.name ?? item.user.email}
                    />
                  </Td>
                  <Td>
                    <TypeBadge item={item} />
                  </Td>
                  <Td>
                    <Detail item={item} />
                    {tab === 'done' && decisionOf(item).decisionComment && (
                      <p className="mt-1 text-xs text-muted">
                        Réponse : « {decisionOf(item).decisionComment} »
                      </p>
                    )}
                  </Td>
                  <Td className="text-muted">{formatDateTime(item.createdAt)}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      {tab === 'done' ? (
                        <DecisionBadge status={item.status} />
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setDeciding({ item, status: 'REJECTED' })}
                          >
                            <X aria-hidden />
                            Refuser
                          </Button>
                          <Button onClick={() => setDeciding({ item, status: 'APPROVED' })}>
                            <Check aria-hidden />
                            Valider
                          </Button>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </FlushCard>

      {tab === 'done' && <AbsenceSynthesis absences={absenceHistory.data} />}

      {deciding && <DecisionDialog {...deciding} onClose={() => setDeciding(null)} />}
    </>
  );
}

function AbsenceSynthesis({ absences }: { absences: Absence[] }) {
  const approved = absences.filter((a) => a.status === 'APPROVED');
  const days = approved.reduce(
    (s, a) => s + differenceInCalendarDays(new Date(a.endDate), new Date(a.startDate)) + 1,
    0,
  );
  return (
    <Card>
      <CardTitle>Synthèse des absences</CardTitle>
      <div className="grid gap-6 sm:grid-cols-3">
        <Stat label="Absences validées" value={approved.length} />
        <Stat label="Absences refusées" value={absences.filter((a) => a.status === 'REJECTED').length} />
        <Stat label="Jours d'absence validés" value={days} />
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <strong className="text-2xl">{value}</strong>
    </div>
  );
}

function TypeBadge({ item }: { item: Item }) {
  if (item.kind === 'absence')
    return (
      <Badge tone="info" dot={false}>
        Absence
      </Badge>
    );
  return item.request.type === 'DELETION' ? (
    <Badge tone="danger" dot={false}>
      Suppression
    </Badge>
  ) : (
    <Badge tone="warning" dot={false}>
      Modification
    </Badge>
  );
}

function Detail({ item }: { item: Item }) {
  if (item.kind === 'absence') {
    const a = item.absence;
    return (
      <>
        {ABSENCE_LABELS[a.type] ?? a.type} · {formatAbsenceRange(a.startDate, a.endDate)}
        {a.comment && <span className="block text-xs text-muted">« {a.comment} »</span>}
      </>
    );
  }
  const r = item.request;
  if (r.type === 'DELETION') return <>Suppression du compte{r.reason && ` · ${r.reason}`}</>;
  return (
    <>
      {FIELD_LABELS[r.field ?? ''] ?? r.field} → {r.newValue}
      {r.reason && <span className="block text-xs text-muted">« {r.reason} »</span>}
    </>
  );
}

function DecisionDialog({
  item,
  status,
  onClose,
}: {
  item: Item;
  status: 'APPROVED' | 'REJECTED';
  onClose: () => void;
}) {
  const decideAbsence = useDecideAbsence();
  const decideRequest = useDecideRequest();
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const mutation = item.kind === 'absence' ? decideAbsence : decideRequest;
  const approve = status === 'APPROVED';
  const who = fullName(item.user);
  // Mockup 13: a refusal must be explained, the employee sees the message.
  const missingReason = !approve && !comment.trim();

  const submit = () => {
    const input = { id: item.id, status, decisionComment: comment.trim() || undefined };
    return item.kind === 'absence' ? decideAbsence.mutateAsync(input) : decideRequest.mutateAsync(input);
  };

  // Approving an account deletion is irreversible: same "type SUPPRIMER" confirmation as elsewhere.
  if (approve && item.kind === 'request' && item.request.type === 'DELETION') {
    return (
      <ConfirmDeleteDialog
        open
        onOpenChange={(o) => !o && onClose()}
        title={`Supprimer le compte de ${who} ?`}
        description={`Demande du ${formatDateTime(item.createdAt)}${item.request.reason ? ` · motif : ${item.request.reason}` : ''}. Les données personnelles sont supprimées ; les pointages sont conservés de façon anonyme.`}
        confirmLabel="Supprimer le compte"
        onConfirm={submit}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        tone={approve ? 'ok' : 'danger'}
        icon={approve ? item.kind === 'request' ? <Edit3 /> : <Check /> : <X />}
        title={approve ? 'Valider la demande' : 'Refuser la demande'}
        description={
          <>
            {who} · <Detail item={item} />
          </>
        }
      >
        {item.kind === 'request' && item.request.type === 'INFO_CHANGE' && item.request.field && (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 rounded-lg border border-border p-4 text-sm">
            <span className="text-muted line-through">{String(item.user[item.request.field] ?? '—')}</span>
            <span className="text-muted" aria-label="devient">
              →
            </span>
            <span className="font-semibold">{item.request.newValue}</span>
          </div>
        )}
        <Field
          label={approve ? 'Commentaire pour le salarié' : 'Motif du refus'}
          required={!approve}
          error={touched && missingReason ? 'Le motif du refus est obligatoire.' : undefined}
          hint={approve ? 'Facultatif.' : 'Le salarié verra ce message dans ses demandes.'}
        >
          <Textarea className="min-h-[70px]" value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        {item.kind === 'absence' && approve && (
          <Alert tone="info">
            <Info aria-hidden />
            <span>Ces jours ne compteront ni comme retards ni comme heures manquantes.</span>
          </Alert>
        )}
        {mutation.isError && (
          <Alert tone="danger" role="alert">
            {getErrorMessage(mutation.error)}
          </Alert>
        )}
        <DialogActions>
          <DialogClose asChild>
            <Button variant="secondary">Annuler</Button>
          </DialogClose>
          <Button
            variant={approve ? 'primary' : 'danger'}
            disabled={mutation.isPending}
            onClick={() => {
              setTouched(true);
              if (missingReason) return;
              submit().then(onClose, () => {});
            }}
          >
            {approve
              ? item.kind === 'request'
                ? 'Valider et appliquer'
                : 'Valider la demande'
              : 'Refuser la demande'}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
