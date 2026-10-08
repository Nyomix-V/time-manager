import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { toApiParams, type DateRange } from '@/lib/period';
import type { Clock, ClockStatus } from './types';

export const clockKeys = {
  list: (userId: string, range?: DateRange) =>
    ['clocks', userId, 'list', range?.from.toISOString() ?? '', range?.to.toISOString() ?? ''] as const,
  status: (userId: string) => ['clocks', userId, 'status'] as const,
};

async function fetchClocks(userId: string, range?: DateRange) {
  return (await api.get<Clock[]>(`/clocks/${userId}`, { params: range ? toApiParams(range) : {} })).data;
}

async function fetchStatus(userId: string) {
  return (await api.get<ClockStatus>(`/clocks/${userId}/status`)).data;
}

/** Clock events of a user, optionally restricted to a range (avoids loading the whole history). */
export function useClocks(userId: string | undefined, range?: DateRange) {
  return useQuery({
    queryKey: clockKeys.list(userId ?? '', range),
    queryFn: () => fetchClocks(userId!, range),
    enabled: !!userId,
  });
}

/** Clock events of several users (one request each — only for the rows currently displayed). */
export function useClocksOf(userIds: string[], range?: DateRange) {
  return useQueries({
    queries: userIds.map((id) => ({ queryKey: clockKeys.list(id, range), queryFn: () => fetchClocks(id, range) })),
    combine: (results) => {
      const byUser = new Map<string, Clock[]>();
      results.forEach((r, i) => r.data && byUser.set(userIds[i], r.data));
      return byUser;
    },
  });
}

/** Live status (En poste / En pause / Hors poste) of several users. */
export function useClockStatusOf(userIds: string[], options: { refetchInterval?: number } = {}) {
  return useQueries({
    queries: userIds.map((id) => ({
      queryKey: clockKeys.status(id),
      queryFn: () => fetchStatus(id),
      ...options,
    })),
    combine: (results) => {
      const byUser = new Map<string, ClockStatus>();
      results.forEach((r, i) => r.data && byUser.set(userIds[i], r.data));
      return byUser;
    },
  });
}

export type ClockAction = 'arrive' | 'break/start' | 'break/end' | 'depart';

/** The backend enforces the IN -> BREAK_START -> BREAK_END -> OUT state machine (400 otherwise). */
export function useClockAction(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: ClockAction) => (await api.post<Clock>(`/clocks/${userId}/${action}`)).data,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['clocks', userId] });
      qc.invalidateQueries({ queryKey: ['workingtimes', userId] });
    },
  });
}
