import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Edit3, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { ROUTES } from '@/auth/navigation';
import { can, canManageUser, ROLE_LABELS } from '@/auth/permissions';
import { useDeleteUser, useUsers } from '@/api/users';
import { useBranches } from '@/api/branches';
import { useTeams } from '@/api/teams';
import { useClockStatusOf } from '@/api/clocks';
import { useKpiReport } from '@/api/kpi';
import type { Role, User } from '@/api/types';
import { formatHours, fullName } from '@/lib/format';
import { monthRange, weekRange } from '@/lib/period';
import { usePagination } from '@/hooks/usePagination';
import { PageHeader } from '../PageHeader';
import { QueryState } from '../QueryState';
import { Person } from '../Person';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';
import { Pagination } from '../Pagination';
import { LiveStatusBadge, UserStatusBadge } from './UserStatusBadge';
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
const NO_TEAM = '__none__';

/**
 * User list shared by "Salariés" (manager/director, mockup 08) and "Utilisateurs" (admin, mockup 15).
 * Live status and KPIs are only loaded for what is displayed.
 */
export function UsersDirectory({ variant }: { variant: 'employees' | 'admin' }) {
  const me = useCurrentUser();
  const users = useUsers();
  const branches = useBranches();
  const teams = useTeams();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [branchId, setBranchId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [toDelete, setToDelete] = useState<User | null>(null);
  const deleteUser = useDeleteUser();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users.data ?? [])
      .filter((u) => !q || `${fullName(u)} ${u.email}`.toLowerCase().includes(q))
      .filter((u) => !role || u.role === role)
      .filter((u) => !branchId || u.branchId === branchId)
      .filter((u) => !teamId || (teamId === NO_TEAM ? !u.teamId : u.teamId === teamId))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [users.data, search, role, branchId, teamId]);

  const pagination = usePagination(filtered, PAGE_SIZE);
  const visible = pagination.visible;
  const statuses = useClockStatusOf(
    visible.map((u) => u.id),
    { refetchInterval: 60_000 },
  );
  const weekKpi = useKpiReport(weekRange(), { enabled: variant === 'employees' });
  const monthKpi = useKpiReport(monthRange(), { enabled: variant === 'employees' });
  const weekHours = new Map(weekKpi.data?.rows.map((r) => [r.userId, r.totalHours]));
  const monthLate = new Map(monthKpi.data?.rows.map((r) => [r.userId, r]));

  const live = (users.data ?? []).filter((u) => u.role !== 'ADMIN');
  const counts = {
    total: users.data?.length ?? 0,
    managers: users.data?.filter((u) => u.role === 'MANAGER').length ?? 0,
    noTeam: live.filter((u) => !u.teamId).length,
    invited: users.data?.filter((u) => u.status === 'INVITED').length ?? 0,
  };

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
            ? `${counts.total} comptes · ${counts.managers} managers · ${counts.invited} invitation(s) en attente`
            : `${counts.total} personnes dans votre branche. Modification et suppression depuis la fiche.`)
        }
      >
        {variant === 'employees' && (
          <span className="flex items-center gap-2 text-xs text-muted before:size-2 before:rounded-full before:bg-success before:shadow-[0_0_0_3px_var(--color-success-soft)] before:content-['']">
            Statuts actualisés chaque minute
          </span>
        )}
        {can(me.role, 'manageUsers') && (
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
        <Select
          aria-label="Filtrer par équipe"
          className="w-52"
          value={teamId}
          onChange={(e) => resetPage(setTeamId)(e.target.value)}
        >
          <option value="">Toutes les équipes</option>
          <option value={NO_TEAM}>Sans équipe ({counts.noTeam})</option>
          {teams.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
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
                    <Th>Équipe</Th>
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
                          <Td>{u.branch?.name ?? <span className="text-muted">—</span>}</Td>
                        )}
                        <Td>
                          {u.team?.name ??
                            (u.role === 'ADMIN' ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <Badge tone="neutral" dot={false}>
                                Sans équipe
                              </Badge>
                            ))}
                        </Td>
                        <Td>
                          {variant === 'admin' && u.status !== 'ACTIVE' ? (
                            <UserStatusBadge user={u} />
                          ) : (
                            <LiveStatusBadge user={u} status={statuses.get(u.id)} />
                          )}
                        </Td>
                        {variant === 'employees' && (
                          <Td className={num}>
                            {weekHours.has(u.id) ? formatHours(weekHours.get(u.id)!) : '—'}
                          </Td>
                        )}
                        {variant === 'employees' && (
                          <Td className={num}>
                            {!late ? (
                              '—'
                            ) : late.lateAlert ? (
                              <Badge tone="danger" dot={false}>
                                {late.lateDays}
                              </Badge>
                            ) : (
                              late.lateDays
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
                            {variant === 'admin' && canManageUser(me, u) && u.id !== me.id && (
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
