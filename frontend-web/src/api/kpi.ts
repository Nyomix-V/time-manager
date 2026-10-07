import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { toApiParams, type DateRange } from '@/lib/period';
import type { KpiReport } from './types';

/** KPI per user over the range (overtime, average daily hours, late days). Scoped by the backend. */
export function useKpiReport(range: DateRange, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['kpi', range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => (await api.get<KpiReport>('/kpi/report', { params: toApiParams(range) })).data,
    ...options,
  });
}
