import { Link } from 'react-router';
import { addDays, format, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Coffee, LogIn, LogOut, Pause, Play, Timer } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthProvider';
import { ROUTES } from '@/auth/navigation';
import { useClockAction, useClocks, type ClockAction } from '@/api/clocks';
import { useWorkingTimes } from '@/api/workingtimes';
import { getErrorMessage } from '@/api/client';
import type { Planning } from '@/api/types';
import { useNow } from '@/hooks/useNow';
import {
  clocksOfDay,
  currentState,
  dayStats,
  timeline,
  type ClockState,
  type TimelineItem,
} from '@/lib/clocks';
import {
  formatDateLong,
  formatDayShort,
  formatHours,
  formatMinutes,
  formatTime,
  minutesToTime,
} from '@/lib/format';
import { isWorkingDay, plannedEndMin, weeklyHours } from '@/lib/planning';
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

/** Clock-in page (mockup 04): arrival, breaks, departure. */
export function ClockPage() {
  const user = useCurrentUser();
  const now = useNow();
  const clocks = useClocks(user.id);
  const action = useClockAction(user.id);
  const week = useWorkingTimes(user.id, weekRange(now));
  const month = useWorkingTimes(user.id, monthRange(now));

  const today = clocks.data ? clocksOfDay(clocks.data, now) : [];
  const state = currentState(today);
  const stats = dayStats(today, now);
  const weeklyTarget = weeklyHours(user);
  const monthDays = month.data?.perDay.length ?? 0;
  const workingToday = isWorkingDay(user, now);

  const punch = (a: ClockAction) => action.mutate(a);

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.firstName}`}
        subtitle={`${formatDateLong(now)} · ${
          workingToday
            ? `Horaires prévus : ${minutesToTime(user.expectedStartMin)} – ${minutesToTime(plannedEndMin(user))} · Pause ${user.breakMinutes} min`
            : 'Jour non travaillé selon votre planning'
        }`}
      />

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
                <StateBadge state={state} since={stats.since} />
              </div>
              <div className="text-[56px] font-bold tabular-nums tracking-tight">{format(now, 'HH:mm')}</div>
              {state === 'break' ? (
                <span
                  role="timer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3.5 py-2 text-sm font-semibold text-primary"
                >
                  <Coffee className="size-[18px]" aria-hidden />
                  Pause en cours ·{' '}
                  {formatMinutes(
                    (now.getTime() - (stats.since?.getTime() ?? now.getTime())) / 60_000,
                  )} sur {user.breakMinutes} prévues
                </span>
              ) : (
                <p className="text-sm text-muted">
                  Travaillé : <strong className="text-text">{formatHours(stats.workedMs / 3_600_000)}</strong>{' '}
                  · Pause prise :{' '}
                  <strong className="text-text">{formatMinutes(stats.breakMs / 60_000)}</strong>
                </p>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                {state === 'working' && (
                  <>
                    <Button
                      variant="pause"
                      size="xl"
                      onClick={() => punch('break/start')}
                      disabled={action.isPending}
                    >
                      <Pause aria-hidden />
                      Commencer une pause
                    </Button>
                    <Button size="xl" onClick={() => punch('depart')} disabled={action.isPending}>
                      <LogOut aria-hidden />
                      Pointer mon départ
                    </Button>
                  </>
                )}
                {state === 'break' && (
                  <Button size="xl" onClick={() => punch('break/end')} disabled={action.isPending}>
                    <Play aria-hidden />
                    Pointer la fin de pause
                  </Button>
                )}
                {(state === 'none' || state === 'out') && (
                  <Button size="xl" onClick={() => punch('arrive')} disabled={action.isPending}>
                    <LogIn aria-hidden />
                    {state === 'none' ? 'Pointer mon arrivée' : 'Pointer une nouvelle arrivée'}
                  </Button>
                )}
              </div>
              {action.isError && (
                <Alert tone="danger" role="alert">
                  {getErrorMessage(action.error)}
                </Alert>
              )}
              <p className="text-xs text-muted">
                {state === 'break'
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
            unit={`/ ${formatHours(weeklyTarget)}`}
            hint="Heures validées (pointages clôturés)"
          >
            <Progress
              label="Avancement de la semaine"
              value={((week.data?.totalHours ?? 0) / (weeklyTarget || 1)) * 100}
            />
          </KpiCard>
          <KpiCard
            label={`Moyenne par jour (${format(now, 'MMMM', { locale: fr })})`}
            icon={Calendar}
            value={month.data ? formatHours(monthDays ? month.data.totalHours / monthDays : 0) : '…'}
            hint={`Objectif ${formatHours(user.workMinutesPerDay / 60)} · ${monthDays} jour${monthDays > 1 ? 's' : ''} travaillé${monthDays > 1 ? 's' : ''}`}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card aria-labelledby="today-title">
          <CardTitle id="today-title">Aujourd'hui</CardTitle>
          <Timeline items={timeline(today)} planning={user} done={state === 'out'} />
        </Card>
        <LastWeekCard userId={user.id} now={now} weeklyTarget={weeklyTarget} />
      </div>
    </>
  );
}

function StateBadge({ state, since }: { state: ClockState; since?: Date }) {
  const at = since ? formatTime(since) : '';
  switch (state) {
    case 'none':
      return <Badge tone="neutral">Pas encore pointé aujourd'hui</Badge>;
    case 'working':
      return <Badge tone="success">En poste depuis {at}</Badge>;
    case 'break':
      return <Badge tone="info">En pause depuis {at}</Badge>;
    case 'out':
      return <Badge tone="neutral">Départ pointé à {at}</Badge>;
  }
}

function Timeline({ items, planning, done }: { items: TimelineItem[]; planning: Planning; done: boolean }) {
  return (
    <ol className="flex flex-col">
      {items.length === 0 && (
        <TimelineRow
          tone="pending"
          title={`Arrivée prévue · ${minutesToTime(planning.expectedStartMin)}`}
          hint="Pas encore pointé"
        />
      )}
      {items.map((item, i) => {
        if (item.kind === 'arrival')
          return <TimelineRow key={i} tone="done" title={`Arrivée · ${formatTime(item.at)}`} />;
        if (item.kind === 'departure')
          return <TimelineRow key={i} tone="done" title={`Départ · ${formatTime(item.at)}`} />;
        return item.to ? (
          <TimelineRow
            key={i}
            tone="done"
            title={`Pause · ${formatTime(item.from)} → ${formatTime(item.to)}`}
            hint={formatMinutes((item.to.getTime() - item.from.getTime()) / 60_000)}
          />
        ) : (
          <TimelineRow
            key={i}
            tone="live"
            title={`Pause en cours · depuis ${formatTime(item.from)}`}
            hint="Fin de pause à pointer"
          />
        );
      })}
      {items.length > 0 && !done && (
        <TimelineRow
          tone="pending"
          title={`Départ prévu · ${minutesToTime(plannedEndMin(planning))}`}
          hint={`Calculé : arrivée prévue + ${formatHours(planning.workMinutesPerDay / 60)} + pause`}
        />
      )}
    </ol>
  );
}

function TimelineRow({
  tone,
  title,
  hint,
}: {
  tone: 'done' | 'live' | 'pending';
  title: string;
  hint?: string;
}) {
  return (
    <li className="relative flex gap-3.5 pb-[18px] before:absolute before:bottom-0 before:left-[7px] before:top-[18px] before:w-0.5 before:bg-border last:before:hidden">
      <span
        aria-hidden
        className={cn(
          'mt-0.5 size-4 shrink-0 rounded-full border-[3px]',
          tone === 'done' && 'border-primary bg-primary',
          tone === 'live' && 'border-primary bg-primary-light shadow-[0_0_0_4px_var(--color-primary-soft)]',
          tone === 'pending' && 'border-border bg-white',
        )}
      />
      <div>
        <h3 className={cn('text-sm font-semibold', tone === 'pending' && 'text-muted')}>{title}</h3>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </li>
  );
}

function LastWeekCard({ userId, now, weeklyTarget }: { userId: string; now: Date; weeklyTarget: number }) {
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
              <Badge tone={total >= weeklyTarget ? 'info' : 'warning'} dot={false}>
                {total >= weeklyTarget && '+'}
                {formatHours(total - weeklyTarget)} vs {formatHours(weeklyTarget)}
              </Badge>
            </strong>
          </div>
        </>
      )}
    </Card>
  );
}
