import { addDays, format, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, Calendar, Coffee, LogIn, LogOut, Pause, Play, Timer } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { useClocks, useToggleClock } from '@/api/clocks';
import { useWorkingTimes } from '@/api/workingtimes';
import { useBranch } from '@/api/branches';
import { getErrorMessage } from '@/api/client';
import { useNow } from '@/hooks/useNow';
import { usePauseFlag } from '@/hooks/usePauseFlag';
import { clocksOfDay, currentState, dayStats, timeline, type TimelineItem } from '@/lib/clocks';
import {
  formatDateLong,
  formatDayShort,
  formatHours,
  formatMinutes,
  formatTime,
  minutesToTime,
} from '@/lib/format';
import { monthRange, weekRange } from '@/lib/period';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { ErrorState, Spinner } from '@/components/QueryState';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import { Link } from 'react-router';
import { ROUTES } from '@/auth/navigation';

const WEEKLY_TARGET = 35;

export function ClockPage() {
  const user = useCurrentUser();
  const now = useNow();
  const clocks = useClocks(user.id);
  const toggle = useToggleClock(user.id);
  const [pauseFlag, setPauseFlag] = usePauseFlag(user.id);
  const branch = useBranch(user.branchId);
  const week = useWorkingTimes(user.id, weekRange(now));
  const month = useWorkingTimes(user.id, monthRange(now));

  const today = clocks.data ? clocksOfDay(clocks.data, now) : [];
  const state = currentState(today);
  const inPause = state === 'out' && pauseFlag;
  const stats = dayStats(today, now);

  const clock = (pause: boolean) => {
    setPauseFlag(pause);
    toggle.mutate();
  };

  const expected = branch.data ? `Arrivée prévue : ${minutesToTime(branch.data.expectedStartMin)}` : null;
  const monthDays = month.data?.perDay.length ?? 0;

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.firstName}`}
        subtitle={[formatDateLong(now), expected].filter(Boolean).join(' · ')}
      >
        <Button variant="secondary" size="icon" aria-label="Notifications (bientôt disponible)" disabled>
          <Bell aria-hidden />
        </Button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="items-center p-8 text-center xl:col-span-2" aria-labelledby="clock-title">
          <h2 id="clock-title" className="text-[13px] font-medium text-muted">
            Pointage du jour
          </h2>
          {clocks.isPending ? (
            <Spinner />
          ) : clocks.isError ? (
            <ErrorState error={clocks.error} onRetry={() => clocks.refetch()} />
          ) : (
            <>
              <div role="status" aria-live="polite">
                <StateBadge state={state} inPause={inPause} since={stats.since} />
              </div>
              <div className="text-[56px] font-bold tabular-nums tracking-tight">{format(now, 'HH:mm')}</div>
              {inPause ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3.5 py-2 text-sm font-semibold text-primary">
                  <Coffee className="size-[18px]" aria-hidden />
                  Pause en cours ·{' '}
                  {formatMinutes((now.getTime() - (stats.since?.getTime() ?? now.getTime())) / 60_000)}
                </span>
              ) : (
                <p className="text-sm text-muted">
                  Travaillé : <strong className="text-text">{formatHours(stats.workedMs / 3_600_000)}</strong>{' '}
                  · Pause prise :{' '}
                  <strong className="text-text">{formatMinutes(stats.pauseMs / 60_000)}</strong>
                </p>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                {state === 'in' && (
                  <>
                    <Button variant="pause" size="xl" onClick={() => clock(true)} disabled={toggle.isPending}>
                      <Pause aria-hidden />
                      Commencer une pause
                    </Button>
                    <Button size="xl" onClick={() => clock(false)} disabled={toggle.isPending}>
                      <LogOut aria-hidden />
                      Pointer mon départ
                    </Button>
                  </>
                )}
                {inPause && (
                  <Button size="xl" onClick={() => clock(false)} disabled={toggle.isPending}>
                    <Play aria-hidden />
                    Pointer la fin de pause
                  </Button>
                )}
                {(state === 'none' || (state === 'out' && !inPause)) && (
                  <Button size="xl" onClick={() => clock(false)} disabled={toggle.isPending}>
                    <LogIn aria-hidden />
                    {state === 'none' ? 'Pointer mon arrivée' : 'Pointer une nouvelle arrivée'}
                  </Button>
                )}
              </div>
              {toggle.isError && (
                <Alert tone="danger" role="alert">
                  {getErrorMessage(toggle.error)}
                </Alert>
              )}
              <p className="text-xs text-muted">
                {inPause
                  ? 'Le compteur d’heures est arrêté. Pointez la fin de pause pour reprendre ; le départ se pointe ensuite.'
                  : 'Pendant une pause, le compteur d’heures s’arrête. Oubli de pointage ? Signalez-le depuis l’onglet Absences.'}
              </p>
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <KpiCard
            label="Cette semaine"
            icon={Timer}
            value={week.data ? formatHours(week.data.totalHours) : '…'}
            unit={`/ ${WEEKLY_TARGET} h`}
            hint="Heures validées (pointages clôturés)"
          >
            <Progress
              label="Avancement de la semaine"
              value={((week.data?.totalHours ?? 0) / WEEKLY_TARGET) * 100}
            />
          </KpiCard>
          <KpiCard
            label={`Moyenne par jour (${format(now, 'MMMM', { locale: fr })})`}
            icon={Calendar}
            value={month.data ? formatHours(monthDays ? month.data.totalHours / monthDays : 0) : '…'}
            hint={`${monthDays} jour${monthDays > 1 ? 's' : ''} travaillé${monthDays > 1 ? 's' : ''} ce mois-ci`}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card aria-labelledby="today-title">
          <CardTitle id="today-title">Aujourd'hui</CardTitle>
          <Timeline items={timeline(today, inPause)} />
        </Card>
        <LastWeekCard userId={user.id} now={now} />
      </div>
    </>
  );
}

function StateBadge({ state, inPause, since }: { state: string; inPause: boolean; since?: Date }) {
  if (state === 'none') return <Badge tone="neutral">Pas encore pointé aujourd'hui</Badge>;
  const at = since ? formatTime(since) : '';
  if (inPause) return <Badge tone="info">En pause depuis {at}</Badge>;
  if (state === 'in') return <Badge tone="success">En poste depuis {at}</Badge>;
  return <Badge tone="neutral">Départ pointé à {at}</Badge>;
}

function Timeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">Aucun pointage pour l'instant.</p>;
  return (
    <ol className="flex flex-col">
      {items.map((item, i) => {
        const live = item.kind === 'pause' && !item.to;
        const title =
          item.kind === 'arrival'
            ? `Arrivée · ${formatTime(item.at)}`
            : item.kind === 'departure'
              ? `Départ · ${formatTime(item.at)}`
              : item.to
                ? `Pause · ${formatTime(item.from)} → ${formatTime(item.to)}`
                : `Pause en cours · depuis ${formatTime(item.from)}`;
        const hint =
          item.kind === 'pause' && item.to
            ? formatMinutes((item.to.getTime() - item.from.getTime()) / 60_000)
            : live
              ? 'Fin de pause à pointer'
              : null;
        return (
          <li
            key={i}
            className="relative flex gap-3.5 pb-[18px] before:absolute before:bottom-0 before:left-[7px] before:top-[18px] before:w-0.5 before:bg-border last:before:hidden"
          >
            <span
              aria-hidden
              className={cn(
                'mt-0.5 size-4 shrink-0 rounded-full border-[3px] border-primary',
                live ? 'bg-primary-light shadow-[0_0_0_4px_var(--color-primary-soft)]' : 'bg-primary',
              )}
            />
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              {hint && <p className="text-xs text-muted">{hint}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function LastWeekCard({ userId, now }: { userId: string; now: Date }) {
  const range = weekRange(subWeeks(now, 1));
  const summary = useWorkingTimes(userId, range);
  const hoursByDay = new Map(summary.data?.perDay.map((d) => [d.date, d.hours]));
  const days = Array.from({ length: 7 }, (_, i) => addDays(range.from, i));
  const total = summary.data?.totalHours ?? 0;

  return (
    <Card className="xl:col-span-2" aria-labelledby="lastweek-title">
      <div className="flex items-center justify-between">
        <CardTitle id="lastweek-title">Semaine dernière</CardTitle>
        <Link to={ROUTES.myHours} className="text-[13px] font-semibold text-primary hover:underline">
          Voir tout l'historique →
        </Link>
      </div>
      {summary.isError ? (
        <ErrorState error={summary.error} />
      ) : (
        <>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {days.map((d) => {
              const h = hoursByDay.get(format(d, 'yyyy-MM-dd'));
              return (
                <li
                  key={d.toISOString()}
                  className={cn(
                    'rounded-md border border-border px-1.5 py-2.5 text-center text-xs text-muted',
                    !h && 'bg-bg',
                  )}
                >
                  {formatDayShort(d)}
                  <strong className="mt-1 block text-[15px] text-text">{h ? formatHours(h) : '—'}</strong>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted">Total semaine {format(range.from, 'I')}</span>
            <strong>
              {formatHours(total)}{' '}
              <Badge tone={total >= WEEKLY_TARGET ? 'info' : 'warning'} dot={false}>
                {total >= WEEKLY_TARGET && '+'}
                {formatHours(total - WEEKLY_TARGET)} vs {WEEKLY_TARGET} h
              </Badge>
            </strong>
          </div>
        </>
      )}
    </Card>
  );
}
