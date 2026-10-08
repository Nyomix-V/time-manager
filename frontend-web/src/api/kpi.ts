import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { toApiParams, type DateRange } from '@/lib/period';
import type { KpiReport } from './types';

/** Per-user KPI rows + summary over the range. Scoped by the backend (branch, or everything for the admin). */
export function useKpiReport(range: DateRange, options: { enabled?: boolean; teamId?: string } = {}) {
  const { teamId, enabled } = options;
  return useQuery({
    queryKey: ['kpi', range.from.toISOString(), range.to.toISOString(), teamId ?? 'all'],
    queryFn: async () =>
      (
        await api.get<KpiReport>('/kpi/report', {
          params: { ...toApiParams(range), ...(teamId ? { teamId } : {}) },
        })
      ).data,
    enabled,
  });
}
