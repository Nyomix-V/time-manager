import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Absence, AbsenceInput, DecisionStatus } from './types';

export const absenceKeys = {
  user: (userId: string) => ['absences', userId] as const,
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

// The backend has no "list absences of my scope" route yet, so the manager view
// loads them user by user. To replace by GET /absences?status=PENDING (see README).
export function useAbsencesOf(userIds: string[]) {
  return useQueries({
    queries: userIds.map((id) => ({ queryKey: absenceKeys.user(id), queryFn: () => fetchUserAbsences(id) })),
    combine: (results) => ({
      data: results.flatMap((r) => r.data ?? []),
      isPending: results.some((r) => r.isPending),
      error: results.find((r) => r.error)?.error ?? null,
    }),
  });
}

export function useCreateAbsence(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AbsenceInput) => (await api.post<Absence>('/absences', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: absenceKeys.user(userId) }),
  });
}

export function useDecideAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DecisionStatus }) =>
      (await api.patch<Absence>(`/absences/${id}/decision`, { status })).data,
    onSuccess: (absence) => qc.invalidateQueries({ queryKey: absenceKeys.user(absence.userId) }),
  });
}
