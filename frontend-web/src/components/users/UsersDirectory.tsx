import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { format } from 'date-fns';
import { Edit3, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { ROUTES } from '@/auth/navigation';
import { can, ROLE_LABELS } from '@/auth/permissions';
import { useDeleteUser, useUsers } from '@/api/users';
import { useBranches } from '@/api/branches';
import { useClocksOf } from '@/api/clocks';
import { useKpiReport } from '@/api/kpi';
import type { Clock, Role, User } from '@/api/types';
import { clocksOfDay, currentState } from '@/lib/clocks';
import { formatHours, formatTime, fullName } from '@/lib/format';
import { monthRange, weekRange } from '@/lib/period';
import { PageHeader } from '../PageHeader';
import { QueryState } from '../QueryState';
import { Person } from '../Person';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';
import { Pagination } from '../Pagination';
import { usePagination } from '@/hooks/usePagination';
import { FlushCard } from '../ui/card';
import { Table, Td, Th, Tr, num } from '../ui/table';
import { Badge, type BadgeTone } from '../ui/badge';
import { Button } from '../ui/button';
import { Input, Select } from '../ui/input';

const PAGE_SIZE = 10;
const ROLE_TONES: Record<Role, BadgeTone> = {
  EMPLOYEE: 'neutral',
  MANAGER: 'info',
  DIRECTEUR: 'info',
  ADMIN: 'success',
};

/**
 * User list shared by "Salariés" (manager/director, mockup 08) and "Utilisateurs" (admin, mockup 15).
 * Live status and hours are only loaded for the rows of the current page.
 */
export function UsersDirectory({ variant }: { variant: 'employees' | 'admin' }) {
  const me = useCurrentUser();
  const users = useUsers();
  const branches = useBranches();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [branchId, setBranchId] = useState('');
  const [toDelete, setToDelete] = useState<User | null>(null);
  const deleteUser = useDeleteUser();

  const branchName = useMemo(() => new Map(branches.data?.map((b) => [b.id, b.name])), [branches.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users.data ?? [])
      .filter((u) => !q || `${fullName(u)} ${u.email}`.toLowerCase().includes(q))
      .filter((u) => !role || u.role === role)
      .filter((u) => !branchId || u.branchId === branchId)
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [users.data, search, role, branchId]);

  const pagination = usePagination(filtered, PAGE_SIZE);
  const visible = pagination.visible;

  const clocks = useClocksOf(
    visible.map((u) => u.id),
    { refetchInterval: 60_000 },
  );
  const weekKpi = useKpiReport(weekRange(), { enabled: variant === 'employees' });
  const monthKpi = useKpiReport(monthRange(), { enabled: variant === 'employees' });
  const weekHours = new Map(weekKpi.data?.rows.map((r) => [r.userId, r.totalHours]));
  const monthLate = new Map(monthKpi.data?.rows.map((r) => [r.userId, r]));

  const resetPage =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      pagination.reset();
    };

  return (
    <>
      <PageHeader
        title={variant === 'admin' ? 'Utilisateurs' : 'Salariés'}
        subtitle={
          users.data &&
          (variant === 'admin'
            ? `${users.data.length} comptes · ${users.data.filter((u) => u.role === 'MANAGER').length} managers`
            : `${users.data.length} personnes dans votre périmètre. Modification et suppression depuis la fiche.`)
        }
      >
        {variant === 'employees' && (
          <span className="flex items-center gap-2 text-xs text-muted before:size-2 before:rounded-full before:bg-success before:shadow-[0_0_0_3px_var(--color-success-soft)] before:content-['']">
            Statuts actualisés chaque minute
          </span>
        )}
        {can(me.role, 'createUser') && (
          <Button asChild>
            <Link to={ROUTES.newEmployee}>
              <Plus aria-hidden />
              {variant === 'admin' ? 'Ajouter un utilisateur' : 'Ajouter un salarié'}
            </Link>
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Rechercher un nom, un email"
            placeholder="Rechercher un nom, un email…"
            className="pl-10"
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
          />
        </div>
        <Select
          aria-label="Filtrer par rôle"
          className="w-44"
          value={role}
          onChange={(e) => resetPage(setRole)(e.target.value as Role | '')}
        >
          <option value="">Tous les rôles</option>
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        {variant === 'admin' && (
          <Select
            aria-label="Filtrer par branche"
            className="w-48"
            value={branchId}
            onChange={(e) => resetPage(setBranchId)(e.target.value)}
          >
            <option value="">Toutes les branches</option>
            {branches.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <FlushCard aria-label="Liste des utilisateurs">
        <QueryState query={users}>
          {() =>
            filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">Aucun résultat.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{variant === 'admin' ? 'Utilisateur' : 'Salarié'}</Th>
                    <Th>Rôle</Th>
                    {variant === 'admin' && <Th>Branche</Th>}
                    <Th>Statut actuel</Th>
                    {variant === 'employees' && <Th className={num}>Heures / sem.</Th>}
                    {variant === 'employees' && <Th className={num}>Retards / mois</Th>}
                    <Th className={num}>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u) => {
                    const late = monthLate.get(u.id);
                    return (
                      <Tr key={u.id} highlight={late?.lateAlert}>
                        <Td>
                          <Person firstName={u.firstName} lastName={u.lastName} sub={u.email} />
                        </Td>
                        <Td>
                          <Badge tone={ROLE_TONES[u.role]} dot={false}>
                            {ROLE_LABELS[u.role]}
                          </Badge>
                        </Td>
                        {variant === 'admin' && (
                          <Td>
                            {u.branchId ? branchName.get(u.branchId) : <span className="text-muted">—</span>}
                          </Td>
                        )}
                        <Td>
                          <LiveStatus user={u} clocks={clocks.get(u.id)} />
                        </Td>
                        {variant === 'employees' && (
                          <Td className={num}>
                            {weekHours.has(u.id) ? formatHours(weekHours.get(u.id)!) : '—'}
                          </Td>
                        )}
                        {variant === 'employees' && (
                          <Td className={num}>
                            {late ? (
                              late.lateAlert ? (
                                <Badge tone="danger" dot={false}>
                                  {late.lateDays}
                                </Badge>
                              ) : (
                                late.lateDays
                              )
                            ) : (
                              '—'
                            )}
                          </Td>
                        )}
                        <Td>
                          <div className="flex justify-end gap-2">
                            <Button size="icon" asChild>
                              <Link
                                to={ROUTES.employee(u.id)}
                                aria-label={`Ouvrir la fiche de ${fullName(u)}`}
                              >
                                {variant === 'admin' ? <Edit3 aria-hidden /> : <Eye aria-hidden />}
                              </Link>
                            </Button>
                            {variant === 'admin' && can(me.role, 'deleteUser') && u.id !== me.id && (
                              <Button
                                size="icon"
                                className="text-danger"
                                aria-label={`Supprimer ${fullName(u)}`}
                                onClick={() => setToDelete(u)}
                              >
                                <Trash2 aria-hidden />
                              </Button>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )
          }
        </QueryState>
        <Pagination pagination={pagination} />
      </FlushCard>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Supprimer ${toDelete ? fullName(toDelete) : ''} ?`}
        description="Son compte sera désactivé immédiatement et ses données personnelles supprimées (RGPD). Ses pointages sont conservés de façon anonyme pour les obligations légales."
        onConfirm={() => deleteUser.mutateAsync(toDelete!.id)}
      />
    </>
  );
}

function LiveStatus({ user, clocks }: { user: User; clocks?: Clock[] }) {
  if (user.role === 'ADMIN') return <span className="text-muted">—</span>;
  if (!clocks) return <span className="text-muted">…</span>;
  const today = clocksOfDay(clocks);
  const state = currentState(today);
  const last = today.at(-1);
  if (state === 'in') return <Badge tone="success">En poste · depuis {formatTime(last!.time)}</Badge>;
  if (state === 'out') return <Badge tone="info">Sorti · {formatTime(last!.time)}</Badge>;
  const lastEver = clocks.at(-1);
  return (
    <Badge tone="neutral">
      Pas encore pointé{lastEver ? ` · dernier le ${format(new Date(lastEver.time), 'dd/MM')}` : ''}
    </Badge>
  );
}
