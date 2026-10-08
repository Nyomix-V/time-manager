import { api } from '@/api';
import { useSession } from '@/auth/AuthProvider';
import { StateView } from '@/components/data';
import { HoursReport } from '@/components/HoursReport';
import { PeriodPicker, usePeriod } from '@/components/period';
import { Screen } from '@/components/ui';
import { endOfDay, excusedDays, planningOf, summarizeDays } from '@/domain/time';
import { useQuery } from '@/hooks/useQuery';

// Maquette : docs/maquettes/mobile/m03-mes-heures.html
export default function HoursScreen() {
  const session = useSession();
  const period = usePeriod('week');
  const { from, to } = period;

  const { data, error, loading, reload, refreshing, refresh } = useQuery(async () => {
    const [user, clocks, absences] = await Promise.all([
      api.users.get(session.userId),
      api.clocks.list(session.userId, { from, to: endOfDay(to) }),
      api.absences.listForUser(session.userId),
    ]);
    const planning = planningOf(user);
    return { planning, days: summarizeDays(clocks, planning), absences, excused: excusedDays(absences) };
  }, [session.userId, from.getTime(), to.getTime()]);

  return (
    <Screen title="Mes heures" refreshing={refreshing} onRefresh={refresh}>
      <PeriodPicker period={period} />
      {data ? (
        <HoursReport period={period} days={data.days} absences={data.absences} excused={data.excused} planning={data.planning} />
      ) : (
        <StateView loading={loading} error={error} onRetry={reload} />
      )}
    </Screen>
  );
}
