import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Team, TeamInput } from './types';

// ⚠ Backend: the Team entity and /teams routes do not exist yet (required by the subject).
// The UI is wired to this proposed REST contract; see README "Endpoints attendus".

const teamKeys = { all: ['teams'] as const };

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: async () => (await api.get<Team[]>('/teams')).data,
    retry: false,
  });
}

export function useSaveTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TeamInput & { id?: string }) =>
      id ? (await api.put<Team>(`/teams/${id}`, input)).data : (await api.post<Team>('/teams', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/teams/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
  });
}
