import { useMemo, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { Check, Edit3, Info, X } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { can } from '@/auth/permissions';
import { useUsers } from '@/api/users';
import { useAbsencesOf, useDecideAbsence } from '@/api/absences';
import { useDecideRequest, useScopeRequests } from '@/api/requests';
import { getErrorMessage } from '@/api/client';
import type { Absence, ChangeRequest, DecisionStatus, User } from '@/api/types';
import { formatDateTime, fullName } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Spinner, ErrorState } from '@/components/QueryState';
import { Person } from '@/components/Person';
import { Field } from '@/components/Field';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { DecisionBadge } from '@/components/absences/DecisionBadge';
import { formatAbsenceRange } from '@/lib/absences';
import { Card, CardTitle, FlushCard } from '@/components/ui/card';
import { Table, Td, Th, num } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Segmented } from '@/components/ui/segmented';
import { Dialog, DialogActions, DialogClose, DialogContent } from '@/components/ui/dialog';

type Item =
  | { kind: 'absence'; id: string; user: User; createdAt: string; status: DecisionStatus; absence: Absence }
  | {
      kind: 'request';
      id: string;
      user: User;
      createdAt: string;
      status: DecisionStatus;
      request: ChangeRequest;
    };

type TypeFilter = 'all' | 'absence' | 'UPDATE' | 'DELETE';

const FIELD_LABELS: Record<string, string> = {
  firstName: 'Prénom',
  lastName: 'Nom',
  email: 'Email',
  phone: 'Téléphone',
};

/** Requests to validate (mockup 13): absences + profile changes + account deletions. */
export function RequestsPage() {
  const me = useCurrentUser();
  const users = useUsers();
  const scopeUsers = (users.data ?? []).filter((u) => u.id !== me.id);
  const absences = useAbsencesOf(scopeUsers.map((u) => u.id));
  const requests = useScopeRequests();
  const [tab, setTab] = useState<'pending' | 'done'>('pending');
  const [type, setType] = useState<TypeFilter>('all');
  const [deciding, setDeciding] = useState<{ item: Item; status: DecisionStatus } | null>(null);
  const canDecide = can(me.role, 'decideRequests');

  const items = useMemo<Item[]>(() => {
    const byId = new Map(users.data?.map((u) => [u.id, u]));
    const list: Item[] = [];
    for (const a of absences.data) {
      const user = byId.get(a.userId);
      if (user)
        list.push({ kind: 'absence', id: a.id, user, createdAt: a.createdAt, status: a.status, absence: a });
    }
    for (const r of requests.data ?? []) {
      const user = byId.get(r.userId);
      if (user)
        list.push({ kind: 'request', id: r.id, user, createdAt: r.createdAt, status: r.status, request: r });
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [absences.data, requests.data, users.data]);

  const inTab = items.filter((i) => (tab === 'pending' ? i.status === 'PENDING' : i.status !== 'PENDING'));
  const count = (t: TypeFilter) =>
    inTab.filter(
      (i) =>
        t === 'all' ||
        (t === 'absence' ? i.kind === 'absence' : i.kind === 'request' && i.request.type === t),
    ).length;
  const shown = inTab.filter(
    (i) =>
      type === 'all' ||
      (type === 'absence' ? i.kind === 'absence' : i.kind === 'request' && i.request.type === type),
  );

  const approvedAbs = absences.data.filter((a) => a.status === 'APPROVED');
  const absenceDays = approvedAbs.reduce(
    (s, a) => s + differenceInCalendarDays(new Date(a.endDate), new Date(a.startDate)) + 1,
    0,
  );
  const pendingCount = items.filter((i) => i.status === 'PENDING').length;

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
            { value: 'pending', label: `En attente (${pendingCount})` },
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
          { value: 'UPDATE', label: `Modifications (${count('UPDATE')})` },
          { value: 'DELETE', label: `Suppressions (${count('DELETE')})` },
        ]}
      />

      {requests.isError && (
        <Alert tone="info">
          <Info aria-hidden />
          <span>
            Les demandes de modification et de suppression de compte ne sont pas encore disponibles côté
            serveur : seules les absences sont affichées.
          </span>
        </Alert>
      )}

      <FlushCard aria-label={tab === 'pending' ? 'Demandes en attente' : 'Demandes traitées'}>
        {users.isPending || absences.isPending ? (
          <Spinner />
        ) : users.isError || absences.error ? (
          <div className="p-4">
            <ErrorState error={users.error ?? absences.error} />
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
                      sub={item.user.email}
                    />
                  </Td>
                  <Td>
                    <TypeBadge item={item} />
                  </Td>
                  <Td>
                    <Detail item={item} />
                  </Td>
                  <Td className="text-muted">{formatDateTime(item.createdAt)}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      {tab === 'done' ? (
                        <DecisionBadge status={item.status} />
                      ) : canDecide ? (
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
                      ) : (
                        <span className="text-xs text-muted">Lecture seule</span>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </FlushCard>

      <Card>
        <CardTitle>Synthèse des absences</CardTitle>
        <div className="grid gap-6 sm:grid-cols-3">
          <Stat label="Absences validées" value={approvedAbs.length} />
          <Stat
            label="Absences refusées"
            value={absences.data.filter((a) => a.status === 'REJECTED').length}
          />
          <Stat label="Jours d'absence validés" value={absenceDays} />
        </div>
      </Card>

      {deciding && <DecisionDialog {...deciding} onClose={() => setDeciding(null)} />}
    </>
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
  return item.request.type === 'DELETE' ? (
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
    return (
      <>
        {item.absence.reason} · {formatAbsenceRange(item.absence.startDate, item.absence.endDate)}
      </>
    );
  }
  const r = item.request;
  if (r.type === 'DELETE') return <>Suppression du compte{r.comment && ` · ${r.comment}`}</>;
  return (
    <>
      {FIELD_LABELS[r.field ?? ''] ?? r.field} → {r.newValue}
    </>
  );
}

function DecisionDialog({
  item,
  status,
  onClose,
}: {
  item: Item;
  status: DecisionStatus;
  onClose: () => void;
}) {
  const decideAbsence = useDecideAbsence();
  const decideRequest = useDecideRequest();
  const [comment, setComment] = useState('');
  const mutation = item.kind === 'absence' ? decideAbsence : decideRequest;
  const approve = status === 'APPROVED';
  const who = fullName(item.user);

  const submit = () =>
    item.kind === 'absence'
      ? decideAbsence.mutateAsync({ id: item.id, status })
      : decideRequest.mutateAsync({ id: item.id, status, comment: comment || undefined });

  // Approving an account deletion is irreversible: same "type SUPPRIMER" confirmation as elsewhere.
  if (approve && item.kind === 'request' && item.request.type === 'DELETE') {
    return (
      <ConfirmDeleteDialog
        open
        onOpenChange={(o) => !o && onClose()}
        title={`Supprimer le compte de ${who} ?`}
        description={`Demande du ${formatDateTime(item.createdAt)}${item.request.comment ? ` · motif : ${item.request.comment}` : ''}. Les données personnelles sont supprimées ; les pointages sont conservés de façon anonyme.`}
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
        {item.kind === 'request' && item.request.type === 'UPDATE' && (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 rounded-lg border border-border p-4 text-sm">
            <span className="text-muted line-through">{String(item.user[item.request.field!] ?? '—')}</span>
            <span className="text-muted" aria-label="devient">
              →
            </span>
            <span className="font-semibold">{item.request.newValue}</span>
          </div>
        )}
        {item.kind === 'request' && (
          <Field label="Commentaire pour le salarié">
            <Textarea
              className="min-h-[70px]"
              placeholder="Facultatif…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
        )}
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
            onClick={() => submit().then(onClose, () => {})}
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
