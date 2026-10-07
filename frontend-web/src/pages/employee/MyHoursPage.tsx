import { useCurrentUser } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/PageHeader';
import { PeriodFilter } from '@/components/PeriodFilter';
import { usePeriod } from '@/hooks/usePeriod';
import { WorkHistory } from '@/components/hours/WorkHistory';

export function MyHoursPage() {
  const user = useCurrentUser();
  const period = usePeriod('month');
  return (
    <>
      <PageHeader title="Mes heures" subtitle="Vos heures par jour et vos moyennes sur la période choisie.">
        <PeriodFilter period={period} />
      </PageHeader>
      <WorkHistory userId={user.id} range={period.range} kind={period.kind} exportName="mes-heures" />
    </>
  );
}
