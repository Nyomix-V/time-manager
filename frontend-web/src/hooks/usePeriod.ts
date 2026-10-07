import { useMemo, useState } from 'react';
import { monthRange, weekRange, type DateRange, type PeriodKind } from '@/lib/period';

/** Selected period of a page: this week, this month, or a custom range. */
export function usePeriod(initial: PeriodKind = 'month') {
  const [kind, setKind] = useState<PeriodKind>(initial);
  const [custom, setCustom] = useState<DateRange>(() => monthRange());
  const range = useMemo(
    () => (kind === 'week' ? weekRange() : kind === 'month' ? monthRange() : custom),
    [kind, custom],
  );
  return { kind, setKind, range, custom, setCustom };
}
