import { useState } from 'react';
import { ChevronRight, Info, Plus } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { useTeams } from '@/api/teams';
import { useUsers } from '@/api/users';
import { useKpiReport } from '@/api/kpi';
import type { KpiSummary, Team } from '@/api/types';
import { groupRows, summarizeRows } from '@/lib/kpi';
import { formatHours } from '@/lib/format';
import { monthRange } from '@/lib/period';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { Person } from '@/components/Person';
import { TeamDialog } from '@/components/teams/TeamDialog';
import { Avatar } from '@/components/ui/avatar';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** Teams of the branch (mockup 12): cards with this month's KPIs, click to edit. */
export function TeamsPage() {
  const me = useCurrentUser();
  const teams = useTeams();
  const users = useUsers();
  const kpi = useKpiReport(monthRange());
  const [editing, setEditing] = useState<Team | 'new' | null>(null);
  const kpiByTeam = groupRows(kpi.data?.rows ?? [], 'teamId');
  const withoutTeam = (users.data ?? []).filter((u) => u.role === 'EMPLOYEE' && !u.teamId);

  return (
    <>
      <PageHeader title="Équipes" subtitle="Cliquez sur une équipe pour voir ses membres et la modifier.">
        <Button onClick={() => setEditing('new')} disabled={!me.branchId}>
          <Plus aria-hidden />
          Créer une équipe
        </Button>
      </PageHeader>

      <QueryState query={teams}>
        {(list) => (
          <>
            {list.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
                Aucune équipe pour l'instant.
              </p>
            ) : (
              <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {list.map((team) => (
                  <li key={team.id}>
                    <TeamCard
                      team={team}
                      kpi={kpi.data ? summarizeRows(kpiByTeam.get(team.id) ?? []) : undefined}
                      onOpen={() => setEditing(team)}
                    />
                  </li>
                ))}
              </ul>
            )}
            {withoutTeam.length > 0 && (
              <Alert tone="info">
                <Info aria-hidden />
                <span>
                  {withoutTeam.length} salarié
                  {withoutTeam.length > 1 ? 's de la branche sont' : ' de la branche est'}{' '}
                  <strong>sans équipe</strong>. Ajoutez-les depuis la fenêtre d'une équipe.
                </span>
              </Alert>
            )}
          </>
        )}
      </QueryState>

      {editing && me.branchId && (
        <TeamDialog
          team={editing === 'new' ? null : editing}
          branchId={editing === 'new' ? me.branchId : editing.branchId}
          users={users.data ?? []}
          defaultManagerId={me.role === 'MANAGER' ? me.id : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function TeamCard({ team, kpi, onOpen }: { team: Team; kpi?: KpiSummary; onOpen: () => void }) {
  const members = team.members ?? [];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer flex-col gap-4 rounded-lg border border-border bg-surface p-6 text-left hover:border-primary hover:shadow-[0_0_0_3px_var(--color-primary-soft)]"
    >
      <span className="flex items-center justify-between">
        <span className="text-lg font-semibold">{team.name}</span>
        <ChevronRight className="size-5 text-muted" aria-hidden />
      </span>
      {team.description && <span className="text-sm text-muted">{team.description}</span>}
      {team.manager ? (
        <Person firstName={team.manager.firstName} lastName={team.manager.lastName} sub="Manager" />
      ) : (
        <span className="text-sm text-warning">Sans manager</span>
      )}
      <span className="flex items-center justify-between">
        <span className="flex">
          {members.slice(0, 4).map((m) => (
            <Avatar
              key={m.id}
              firstName={m.firstName}
              lastName={m.lastName}
              size="sm"
              className="-ml-2 border-2 border-white first:ml-0"
            />
          ))}
          {members.length > 4 && (
            <span className="-ml-2 grid size-8 place-items-center rounded-full border-2 border-white bg-bg text-[11px] font-semibold text-muted">
              +{members.length - 4}
            </span>
          )}
        </span>
        <span className="text-[13px] text-muted">
          {members.length} membre{members.length > 1 ? 's' : ''}
        </span>
      </span>
      {kpi && (
        <span className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <span className="flex flex-col gap-0.5">
            <span className="text-xs text-muted">Moyenne hebdo</span>
            <strong className="text-lg">{formatHours(kpi.avgWeeklyHours)}</strong>
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-xs text-muted">Ponctualité</span>
            <strong className={cn('text-lg', kpi.punctualityPct >= 90 ? 'text-success' : 'text-danger')}>
              {kpi.punctualityPct} %
            </strong>
          </span>
        </span>
      )}
    </button>
  );
}
