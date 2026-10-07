import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Clock } from './types';

export const clockKeys = {
  user: (userId: string) => ['clocks', userId] as const,
};

async function fetchClocks(userId: string) {
  return (await api.get<Clock[]>(`/clocks/${userId}`)).data;
}

export function useClocks(userId: string | undefined, options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: clockKeys.user(userId ?? ''),
    queryFn: () => fetchClocks(userId!),
    enabled: !!userId,
    ...options,
  });
}

/** Clocks of several users (one request each — only for the rows currently displayed). */
export function useClocksOf(userIds: string[], options: { refetchInterval?: number } = {}) {
  return useQueries({
    queries: userIds.map((id) => ({
      queryKey: clockKeys.user(id),
      queryFn: () => fetchClocks(id),
      ...options,
    })),
    combine: (results) => {
      const byUser = new Map<string, Clock[]>();
      results.forEach((r, i) => r.data && byUser.set(userIds[i], r.data));
      return byUser;
    },
  });
}

/** The backend toggles: IN if the last clock was OUT, OUT otherwise. */
export function useToggleClock(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<Clock>(`/clocks/${userId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clockKeys.user(userId) });
      qc.invalidateQueries({ queryKey: ['workingtimes', userId] });
    },
  });
}
