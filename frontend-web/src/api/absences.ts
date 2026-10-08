import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Absence, AbsenceInput, DecisionInput } from './types';

export const absenceKeys = {
  all: ['absences'] as const,
  user: (userId: string) => ['absences', 'user', userId] as const,
  pending: ['absences', 'pending'] as const,
};

async function fetchUserAbsences(userId: string) {
  return (await api.get<Absence[]>(`/absences/user/${userId}`)).data;
}

export function useUserAbsences(userId: string | undefined) {
  return useQuery({
    queryKey: absenceKeys.user(userId ?? ''),
    queryFn: () => fetchUserAbsences(userId!),
    enabled: !!userId,
  });
}

/** Pending absences, with `user` loaded. */
export function usePendingAbsences(enabled = true) {
  return useQuery({
    queryKey: absenceKeys.pending,
    queryFn: async () => (await api.get<Absence[]>('/absences/pending')).data,
    enabled,
  });
}

/** History of several users (the backend has no "decided absences of my scope" route). */
export function useAbsencesOf(userIds: string[], enabled = true) {
  return useQueries({
    queries: userIds.map((id) => ({
      queryKey: absenceKeys.user(id),
      queryFn: () => fetchUserAbsences(id),
      enabled,
    })),
    combine: (results) => ({
      data: results.flatMap((r) => r.data ?? []),
      isPending: enabled && results.some((r) => r.isPending),
      error: results.find((r) => r.error)?.error ?? null,
    }),
  });
}

export function useCreateAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AbsenceInput) => (await api.post<Absence>('/absences', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: absenceKeys.all }),
  });
}

export function useDecideAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: DecisionInput) =>
      (await api.patch<Absence>(`/absences/${id}/decision`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: absenceKeys.all }),
  });
}
