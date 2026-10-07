import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useUsers } from '@/api/users';
import { useBranches } from '@/api/branches';
import { useClocksOf } from '@/api/clocks';
import { useWorkingTimesOf } from '@/api/workingtimes';
import { ROLE_LABELS } from '@/auth/permissions';
import { clocksOfDay } from '@/lib/clocks';
import { formatHours, formatTime, fullName } from '@/lib/format';
import { dayRange, toInputDate } from '@/lib/period';
import { downloadCsv } from '@/lib/csv';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { Person } from '@/components/Person';
import { Pagination } from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { FlushCard } from '@/components/ui/card';
import { Table, Td, Th, Tr, num } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';

const PAGE_SIZE = 15;

/** Clock-ins of the day for everybody (mockup 17). The admin does not clock in, so they are excluded. */
export function ClocksPage() {
  const users = useUsers();
  const branches = useBranches();
  const [day, setDay] = useState(() => toInputDate(new Date()));
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');

  const date = useMemo(() => new Date(`${day}T12:00:00`), [day]);
  const range = useMemo(() => dayRange(date), [date]);
  const branchName = new Map(branches.data?.map((b) => [b.id, b.name]));

  const filtered = (users.data ?? [])
    .filter((u) => u.role !== 'ADMIN')
    .filter((u) => !branchId || u.branchId === branchId)
    .filter((u) => !search || fullName(u).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
  const pagination = usePagination(filtered, PAGE_SIZE);
  const ids = pagination.visible.map((u) => u.id);
  const clocks = useClocksOf(ids);
  const hours = useWorkingTimesOf(ids, range);

  const rows = pagination.visible.map((u) => {
    const today = clocksOfDay(clocks.get(u.id) ?? [], date);
    const first = today.find((c) => c.status === 'IN');
    const last = today.at(-1);
    return { user: u, first, last, open: last?.status === 'IN', total: hours.get(u.id)?.totalHours };
  });

  return (
    <>
      <PageHeader title="Pointages" subtitle="Heures d'arrivée et de départ des managers et des salariés.">
        <Button
          variant="secondary"
          onClick={() =>
            downloadCsv(`pointages-${day}.csv`, [
              ['Nom', 'Rôle', 'Branche', 'Arrivée', 'Départ', 'Heures'],
              ...rows.map((r) => [
                fullName(r.user),
                ROLE_LABELS[r.user.role],
                r.user.branchId ? (branchName.get(r.user.branchId) ?? '') : '',
                r.first ? formatTime(r.first.time) : '',
                r.last && !r.open ? formatTime(r.last.time) : '',
                r.total ?? '',
              ]),
            ])
          }
        >
          <Download aria-hidden />
          Exporter en CSV
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Rechercher une personne"
            placeholder="Rechercher une personne…"
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              pagination.reset();
            }}
          />
        </div>
        <Input
          type="date"
          aria-label="Jour"
          className="w-44"
          value={day}
          onChange={(e) => e.target.value && setDay(e.target.value)}
        />
        <Select
          aria-label="Filtrer par branche"
          className="w-48"
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value);
            pagination.reset();
          }}
        >
          <option value="">Toutes les branches</option>
          {branches.data?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>

      <FlushCard aria-label="Pointages du jour">
        <QueryState query={users}>
          {() => (
            <Table>
              <thead>
                <tr>
                  <Th>Personne</Th>
                  <Th>Rôle</Th>
                  <Th>Branche</Th>
                  <Th>Arrivée</Th>
                  <Th>Départ</Th>
                  <Th className={num}>Total</Th>
                  <Th>Statut</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ user: u, first, last, open, total }) => (
                  <Tr key={u.id} highlight={!first}>
                    <Td>
                      <Person firstName={u.firstName} lastName={u.lastName} />
                    </Td>
                    <Td>
                      <Badge tone={u.role === 'EMPLOYEE' ? 'neutral' : 'info'} dot={false}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </Td>
                    <Td>{u.branchId ? branchName.get(u.branchId) : '—'}</Td>
                    <Td>{first ? formatTime(first.time) : <span className="text-muted">—</span>}</Td>
                    <Td>
                      {open ? (
                        <span className="text-muted">en cours</span>
                      ) : last ? (
                        formatTime(last.time)
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                    <Td className={num}>
                      {total ? formatHours(total) : <span className="text-muted">—</span>}
                    </Td>
                    <Td>
                      {!first ? (
                        <Badge tone="danger">Aucun pointage</Badge>
                      ) : open ? (
                        <Badge tone="success">En poste</Badge>
                      ) : (
                        <Badge tone="neutral">Parti</Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </QueryState>
        <Pagination pagination={pagination} />
      </FlushCard>
    </>
  );
}
