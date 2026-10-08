import { Link } from 'react-router';
import { Download } from 'lucide-react';
import { ROUTES } from '@/auth/navigation';
import { useKpiReport } from '@/api/kpi';
import { useBranches } from '@/api/branches';
import { useUsers } from '@/api/users';
import { groupRows, summarizeRows, totals } from '@/lib/kpi';
import { formatHours } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import { format } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { PeriodFilter } from '@/components/PeriodFilter';
import { usePeriod } from '@/hooks/usePeriod';
import { QueryState } from '@/components/QueryState';
import { KpiCards, LateAlert, PunctualityBar } from '@/components/kpi/KpiOverview';
import { HoursChart } from '@/components/HoursChart';
import { Card, CardHead, CardTitle, FlushCard } from '@/components/ui/card';
import { Table, Td, Th, num } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/** Global dashboard (mockup 14): company KPIs, broken down by branch. */
export function AdminDashboardPage() {
  const period = usePeriod('month');
  const report = useKpiReport(period.range);
  const branches = useBranches();
  const users = useUsers();

  return (
    <>
      <PageHeader
        title="Dashboard global"
        subtitle={branches.data && `${branches.data.length} branches`}
      >
        <PeriodFilter period={period} />
        <Button
          variant="secondary"
          disabled={!report.data}
          onClick={() =>
            downloadCsv(`kpi-${format(period.range.from, 'yyyy-MM-dd')}.csv`, [
              ['Salarié', 'Heures totales', 'Heures sup', 'Moyenne / jour', 'Retards', 'Alerte'],
              ...(report.data?.rows ?? []).map((r) => [
                r.name,
                r.totalHours,
                r.overtimeHours,
                r.avgDailyHours,
                r.lateDays,
                r.lateAlert ? 'oui' : 'non',
              ]),
            ])
          }
        >
          <Download aria-hidden />
          Exporter
        </Button>
      </PageHeader>

      <QueryState query={report}>
        {(data) => {
          const byBranch = groupRows(data.rows, 'branchId');
          const perBranch = (branches.data ?? []).map((b) => {
            const rows = byBranch.get(b.id) ?? [];
            return {
              branch: b,
              managers: users.data?.filter((u) => u.branchId === b.id && u.role === 'MANAGER').length ?? 0,
              summary: summarizeRows(rows),
              lateDays: totals(rows).lateDays,
            };
          });

          return (
            <>
              <LateAlert rows={data.rows} />
              <KpiCards summary={data.summary} rows={data.rows} scopeLabel="entreprise" />
              <div className="grid gap-6 xl:grid-cols-3">
                <Card aria-labelledby="c">
                  <CardTitle id="c">Moyenne hebdo par branche</CardTitle>
                  <HoursChart
                    title="Moyenne hebdomadaire par branche"
                    data={perBranch.map((p) => ({
                      label: p.branch.name,
                      value: p.summary.avgWeeklyHours,
                      warn: p.summary.avgWeeklyHours < 35,
                    }))}
                    target={35}
                  />
                </Card>
                <FlushCard className="xl:col-span-2" aria-labelledby="b">
                  <CardHead>
                    <CardTitle id="b">Branches</CardTitle>
                    <Link
                      to={ROUTES.adminBranches}
                      className="text-[13px] font-semibold text-primary hover:underline"
                    >
                      Gérer →
                    </Link>
                  </CardHead>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Branche</Th>
                        <Th className={num}>Managers</Th>
                        <Th className={num}>Effectif</Th>
                        <Th className={num}>Moy. hebdo</Th>
                        <Th className="w-48">Ponctualité</Th>
                        <Th className={num}>Retards</Th>
                        <Th className={num}>Alertes</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {perBranch.map(({ branch, managers, summary: s, lateDays }) => (
                        <tr key={branch.id}>
                          <Td>
                            <strong>{branch.name}</strong>
                          </Td>
                          <Td className={num}>{managers}</Td>
                          <Td className={num}>{s.people}</Td>
                          <Td className={num}>{formatHours(s.avgWeeklyHours)}</Td>
                          <Td>
                            <div className="flex items-center gap-2">
                              <PunctualityBar pct={s.punctualityPct} className="flex-1" />
                              <span className="text-[13px]">{s.punctualityPct} %</span>
                            </div>
                          </Td>
                          <Td className={num}>{lateDays}</Td>
                          <Td className={num}>
                            <Badge
                              tone={s.alerts > 2 ? 'danger' : s.alerts ? 'warning' : 'neutral'}
                              dot={false}
                            >
                              {s.alerts}
                            </Badge>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </FlushCard>
              </div>
            </>
          );
        }}
      </QueryState>
    </>
  );
}
