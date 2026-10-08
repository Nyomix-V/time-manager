import { useState } from 'react';
import { Link } from 'react-router';
import { useCurrentUser } from '@/auth/AuthProvider';
import { ROUTES } from '@/auth/navigation';
import { useKpiReport } from '@/api/kpi';
import { useTeams } from '@/api/teams';
import { useClockStatusOf } from '@/api/clocks';
import type { KpiRow, Team } from '@/api/types';
import { groupRows, summarizeRows } from '@/lib/kpi';
import { formatHours } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { PeriodFilter } from '@/components/PeriodFilter';
import { usePeriod } from '@/hooks/usePeriod';
import { QueryState } from '@/components/QueryState';
import { KpiCards, LateAlert, PunctualityBar } from '@/components/kpi/KpiOverview';
import { HoursChart } from '@/components/HoursChart';
import { LiveStatusBadge } from '@/components/users/UserStatusBadge';
import { Card, CardHead, CardTitle, FlushCard } from '@/components/ui/card';
import { Table, Td, Th, Tr, num } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { Person } from '@/components/Person';

/** Manager "Dashboard équipe" (mockup 07) and director "Dashboard branche" (mockup 18). */
export function TeamDashboardPage({ variant }: { variant: 'team' | 'branch' }) {
  const me = useCurrentUser();
  const period = usePeriod('month');
  const teams = useTeams();
  const myTeams = (teams.data ?? []).filter((t) => variant === 'branch' || t.managerId === me.id);
  const [teamId, setTeamId] = useState('');
  const report = useKpiReport(period.range, { teamId: teamId || undefined });

  return (
    <>
      <PageHeader
        title={variant === 'team' ? 'Dashboard équipe' : 'Dashboard branche'}
        subtitle={[
          me.branch && `Branche ${me.branch.name}`,
          teams.data && `${teams.data.length} équipe${teams.data.length > 1 ? 's' : ''}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      >
        {variant === 'team' && (
          <Select
            aria-label="Équipe"
            className="w-52"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            <option value="">Toute la branche</option>
            {myTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        )}
        <PeriodFilter period={period} />
      </PageHeader>

      <QueryState query={report}>
        {({ rows, summary }) => (
          <>
            <LateAlert rows={rows} />
            <KpiCards
              summary={summary}
              rows={rows}
              scopeLabel={variant === 'team' ? "de l'équipe" : 'branche'}
            />
            {variant === 'branch' ? (
              <BranchTeams rows={rows} teams={teams.data ?? []} />
            ) : (
              <TeamDetail rows={rows} />
            )}
          </>
        )}
      </QueryState>
    </>
  );
}

/** Manager view: average day of each employee + lateness ranking. */
function TeamDetail({ rows }: { rows: KpiRow[] }) {
  const byLateness = [...rows].sort((a, b) => b.lateDays - a.lateDays).filter((r) => r.lateDays > 0);
  const chartData = rows
    .filter((r) => r.avgDailyHours > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 15)
    .map((r) => ({ label: r.name.split(' ')[0], value: r.avgDailyHours, warn: r.lateAlert }));

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2" aria-labelledby="c1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id="c1">Moyenne des heures par jour et par salarié</CardTitle>
          <span className="text-xs text-muted">orange = alerte retards</span>
        </div>
        <HoursChart title="Moyenne des heures par jour" data={chartData} target={7} />
      </Card>

      <FlushCard aria-labelledby="late-title">
        <CardHead>
          <CardTitle id="late-title">Retards sur la période</CardTitle>
          <Link to={ROUTES.employees} className="text-[13px] font-semibold text-primary hover:underline">
            Tous →
          </Link>
        </CardHead>
        {byLateness.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">Aucun retard sur la période.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Salarié</Th>
                <Th className={num}>Retards</Th>
              </tr>
            </thead>
            <tbody>
              {byLateness.slice(0, 8).map((r) => {
                const [firstName, ...last] = r.name.split(' ');
                return (
                  <Tr key={r.userId} highlight={r.lateAlert}>
                    <Td>
                      <Link to={ROUTES.employee(r.userId)} className="hover:underline">
                        <Person firstName={firstName} lastName={last.join(' ')} />
                      </Link>
                    </Td>
                    <Td className={num}>
                      <Badge tone={r.lateAlert ? 'danger' : r.lateDays > 1 ? 'warning' : 'neutral'}>
                        {r.lateDays}
                      </Badge>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <p className="px-4 py-3 text-xs text-muted">Seuil d'alerte : plus de 3 retards sur la période.</p>
      </FlushCard>
    </div>
  );
}

/** Director view (mockup 18): one line per team, with the manager's own clock status of the day. */
function BranchTeams({ rows, teams }: { rows: KpiRow[]; teams: Team[] }) {
  const groups = groupRows(rows, 'teamId');
  const managerIds = teams.map((t) => t.managerId).filter((id): id is string => !!id);
  const statuses = useClockStatusOf(managerIds, { refetchInterval: 60_000 });
  const lines = [
    ...teams.map((t) => ({ key: t.id, team: t, summary: summarizeRows(groups.get(t.id) ?? []) })),
    ...(groups.has(null) ? [{ key: 'none', team: null, summary: summarizeRows(groups.get(null)!) }] : []),
  ];

  return (
    <>
      <FlushCard aria-labelledby="teams-title">
        <CardHead>
          <CardTitle id="teams-title">Équipes et managers</CardTitle>
          <Link to={ROUTES.teams} className="text-[13px] font-semibold text-primary hover:underline">
            Gérer les équipes →
          </Link>
        </CardHead>
        <Table>
          <thead>
            <tr>
              <Th>Équipe</Th>
              <Th>Manager</Th>
              <Th>Pointage du manager (auj.)</Th>
              <Th className={num}>Effectif</Th>
              <Th className={num}>Moy. hebdo</Th>
              <Th className="w-48">Ponctualité</Th>
              <Th className={num}>Alertes</Th>
            </tr>
          </thead>
          <tbody>
            {lines.map(({ key, team, summary: s }) => (
              <Tr key={key} highlight={s.alerts > 0}>
                <Td>
                  <strong>{team?.name ?? 'Sans équipe'}</strong>
                </Td>
                <Td>
                  {team?.manager ? (
                    <Person firstName={team.manager.firstName} lastName={team.manager.lastName} />
                  ) : team ? (
                    <Badge tone="warning" dot={false}>
                      Sans manager
                    </Badge>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td>
                  {team?.manager ? (
                    <LiveStatusBadge user={team.manager} status={statuses.get(team.manager.id)} />
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className={num}>{s.people}</Td>
                <Td className={num}>{formatHours(s.avgWeeklyHours)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <PunctualityBar pct={s.punctualityPct} className="flex-1" />
                    <span className="text-[13px]">{s.punctualityPct} %</span>
                  </div>
                </Td>
                <Td className={num}>
                  <Badge tone={s.alerts ? 'danger' : 'neutral'} dot={false}>
                    {s.alerts}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </FlushCard>
      <Card aria-labelledby="c2">
        <CardTitle id="c2">Moyenne hebdo par équipe</CardTitle>
        <HoursChart
          title="Moyenne hebdomadaire par équipe"
          height={180}
          data={lines.map(({ team, summary: s }) => ({
            label: team?.name ?? 'Sans équipe',
            value: s.avgWeeklyHours,
            warn: s.alerts > 0,
          }))}
          target={35}
        />
      </Card>
    </>
  );
}
