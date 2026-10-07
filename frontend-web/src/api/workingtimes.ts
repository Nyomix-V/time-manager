import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from './client';
import { toApiParams, type DateRange } from '@/lib/period';
import type { WorkingSummary } from './types';

async function fetchSummary(userId: string, range: DateRange) {
  return (await api.get<WorkingSummary>(`/workingtimes/${userId}`, { params: toApiParams(range) })).data;
}

const key = (userId: string, range: DateRange) =>
  ['workingtimes', userId, range.from.toISOString(), range.to.toISOString()] as const;

/** Hours worked per day + total over the range, computed by the server. */
export function useWorkingTimes(userId: string | undefined, range: DateRange) {
  return useQuery({
    queryKey: key(userId ?? '', range),
    queryFn: () => fetchSummary(userId!, range),
    enabled: !!userId,
  });
}

export function useWorkingTimesOf(userIds: string[], range: DateRange) {
  return useQueries({
    queries: userIds.map((id) => ({ queryKey: key(id, range), queryFn: () => fetchSummary(id, range) })),
    combine: (results) => {
      const byUser = new Map<string, WorkingSummary>();
      results.forEach((r, i) => r.data && byUser.set(userIds[i], r.data));
      return byUser;
    },
  });
}
