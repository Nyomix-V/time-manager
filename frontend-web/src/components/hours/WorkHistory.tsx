import type { ReactNode } from 'react';
import { format, getISOWeek, parseISO } from 'date-fns';
import { Download } from 'lucide-react';
import { useWorkingTimes } from '@/api/workingtimes';
import { useClocks } from '@/api/clocks';
import { groupByDay } from '@/lib/clocks';
import { formatDayShort, formatHours, formatMinutes, formatTime } from '@/lib/format';
import { describeRange, weeksIn, type DateRange, type PeriodKind } from '@/lib/period';
import { downloadCsv } from '@/lib/csv';
import { KpiCard } from '../KpiCard';
import { HoursChart, type ChartPoint } from '../HoursChart';
import { QueryState } from '../QueryState';
import { Card, CardHead, CardTitle, FlushCard } from '../ui/card';
import { Table, Td, Th, num } from '../ui/table';
import { Button } from '../ui/button';
import type { Planning, WorkingSummary } from '@/api/types';
import { weeklyHours } from '@/lib/planning';

/** KPI cards + chart + per-day table for one user over a period ("Mes heures" and the employee page). */
export function WorkHistory({
  userId,
  range,
  kind,
  planning,
  extraKpi,
  exportName,
}: {
  userId: string;
  /** Targets (hours per day / per week) come from the person's planning. */
  planning: Planning;
  range: DateRange;
  kind: PeriodKind;
  extraKpi?: ReactNode;
  exportName: string;
}) {
  const summary = useWorkingTimes(userId, range);
  const clocks = useClocks(userId, range);
  const dailyTarget = planning.workMinutesPerDay / 60;
  const weeklyTarget = weeklyHours(planning);

  return (
    <QueryState query={summary}>
      {(data) => {
        const days = data.perDay.length;
        const weeks = weeksIn(range);
        const byDay = groupByDay(clocks.data ?? []);
        const rows = [...data.perDay].reverse();

        const exportCsv = () =>
          downloadCsv(`${exportName}-${format(range.from, 'yyyy-MM-dd')}.csv`, [
            ['Jour', 'Arrivée', 'Départ', 'Heures'],
            ...data.perDay.map((d) => {
              const c = byDay.get(d.date);
              return [
                d.date,
                c?.firstIn ? formatTime(c.firstIn) : '',
                c?.lastOut ? formatTime(c.lastOut) : '',
                d.hours,
              ];
            }),
          ]);

        return (
          <>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={exportCsv} disabled={days === 0}>
                <Download aria-hidden />
                Exporter
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Total sur la période"
                value={formatHours(data.totalHours)}
                hint={`${days} jour${days > 1 ? 's' : ''} travaillé${days > 1 ? 's' : ''}`}
              />
              <KpiCard
                label="Moyenne par jour"
                value={formatHours(days ? data.totalHours / days : 0)}
                hint={`Objectif ${formatHours(dailyTarget)} · pauses : ${formatMinutes(days ? data.breakMinutes / days : 0)} / jour`}
              />
              <KpiCard
                label="Moyenne par semaine"
                value={formatHours(data.totalHours / weeks)}
                hint={
                  data.totalHours / weeks >= weeklyTarget
                    ? `Objectif ${formatHours(weeklyTarget)} atteint`
                    : `Objectif ${formatHours(weeklyTarget)}`
                }
                hintTone={data.totalHours / weeks >= weeklyTarget ? 'up' : 'muted'}
              />
              {extraKpi}
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2" aria-labelledby="chart-title">
                <CardTitle id="chart-title">
                  {kind === 'week' ? 'Heures par jour' : 'Heures par semaine'}
                </CardTitle>
                {kind === 'week' ? (
                  <HoursChart title="Heures par jour" data={perDayPoints(data)} target={dailyTarget} />
                ) : (
                  <HoursChart title="Heures par semaine" data={perWeekPoints(data)} target={weeklyTarget} />
                )}
              </Card>

              <FlushCard aria-labelledby="days-title">
                <CardHead>
                  <CardTitle id="days-title">Détail par jour</CardTitle>
                  <span className="text-xs text-muted">{describeRange(kind, range)}</span>
                </CardHead>
                {rows.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted">Aucun pointage sur la période.</p>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    <Table>
                      <thead>
                        <tr>
                          <Th>Jour</Th>
                          <Th>Arrivée</Th>
                          <Th>Départ</Th>
                          <Th className={num}>Total</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((d) => {
                          const c = byDay.get(d.date);
                          return (
                            <tr key={d.date}>
                              <Td>{formatDayShort(parseISO(d.date))}</Td>
                              <Td>{c?.firstIn ? formatTime(c.firstIn) : '—'}</Td>
                              <Td>
                                {c?.open ? (
                                  <span className="text-muted">en cours</span>
                                ) : c?.lastOut ? (
                                  formatTime(c.lastOut)
                                ) : (
                                  '—'
                                )}
                              </Td>
                              <Td className={num}>{formatHours(d.hours)}</Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </FlushCard>
            </div>
          </>
        );
      }}
    </QueryState>
  );
}

function perDayPoints(data: WorkingSummary): ChartPoint[] {
  return data.perDay.map((d) => ({ label: formatDayShort(parseISO(d.date)), value: d.hours }));
}

function perWeekPoints(data: WorkingSummary): ChartPoint[] {
  const weeks = new Map<number, number>();
  for (const d of data.perDay) {
    const w = getISOWeek(parseISO(d.date));
    weeks.set(w, (weeks.get(w) ?? 0) + d.hours);
  }
  return [...weeks.entries()].map(([w, hours]) => ({ label: `S${w}`, value: Math.round(hours * 100) / 100 }));
}
