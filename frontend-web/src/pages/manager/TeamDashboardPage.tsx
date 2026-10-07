import { Link } from 'react-router';
import { useCurrentUser } from '@/auth/AuthProvider';
import { ROUTES } from '@/auth/navigation';
import { useKpiReport } from '@/api/kpi';
import { useUsers } from '@/api/users';
import { useBranch } from '@/api/branches';
import { summarizeKpi } from '@/lib/kpi';
import type { KpiRow } from '@/api/types';
import { PageHeader } from '@/components/PageHeader';
import { PeriodFilter } from '@/components/PeriodFilter';
import { usePeriod } from '@/hooks/usePeriod';
import { QueryState } from '@/components/QueryState';
import { KpiCards, LateAlert } from '@/components/kpi/KpiOverview';
import { HoursChart } from '@/components/HoursChart';
import { Card, CardHead, CardTitle, FlushCard } from '@/components/ui/card';
import { Table, Td, Th, Tr, num } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Person } from '@/components/Person';

/** Manager "Dashboard équipe" (mockup 07) and director "Dashboard branche" (mockup 18). */
export function TeamDashboardPage({ variant }: { variant: 'team' | 'branch' }) {
  const user = useCurrentUser();
  const period = usePeriod('month');
  const report = useKpiReport(period.range);
  const users = useUsers();
  const branch = useBranch(user.branchId);

  // A director has a global scope in the backend: narrow the dashboard to their own branch when they have one.
  const inScope = (row: KpiRow) =>
    variant === 'team' ||
    !user.branchId ||
    users.data?.find((u) => u.id === row.userId)?.branchId === user.branchId;

  return (
    <>
      <PageHeader
        title={variant === 'team' ? 'Dashboard équipe' : 'Dashboard branche'}
        subtitle={branch.data ? `Branche ${branch.data.name}` : undefined}
      >
        <PeriodFilter period={period} />
      </PageHeader>

      <QueryState query={report}>
        {(data) => {
          const rows = data.rows.filter(inScope);
          const summary = summarizeKpi(rows, period.range);
          const byLateness = [...rows].sort((a, b) => b.lateDays - a.lateDays).filter((r) => r.lateDays > 0);
          const chartData = rows
            .filter((r) => r.avgDailyHours > 0)
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 15)
            .map((r) => ({ label: r.name.split(' ')[0], value: r.avgDailyHours, warn: r.lateAlert }));

          return (
            <>
              <LateAlert summary={summary} />
              <KpiCards summary={summary} scopeLabel={variant === 'team' ? "de l'équipe" : 'branche'} />
              <div className="grid gap-6 xl:grid-cols-3">
                <Card className="xl:col-span-2" aria-labelledby="c1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle id="c1">Moyenne des heures par jour et par salarié</CardTitle>
                    <span className="text-xs text-muted">
                      {summary.headcount} salarié{summary.headcount > 1 ? 's' : ''} · orange = alerte retards
                    </span>
                  </div>
                  <HoursChart title="Moyenne des heures par jour" data={chartData} target={7} />
                </Card>

                <FlushCard aria-labelledby="late-title">
                  <CardHead>
                    <CardTitle id="late-title">Retards sur la période</CardTitle>
                    <Link
                      to={ROUTES.employees}
                      className="text-[13px] font-semibold text-primary hover:underline"
                    >
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
                  <p className="px-4 py-3 text-xs text-muted">
                    Seuil d'alerte : plus de 3 retards sur la période.
                  </p>
                </FlushCard>
              </div>
            </>
          );
        }}
      </QueryState>
    </>
  );
}
