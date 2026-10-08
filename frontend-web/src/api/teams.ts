import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Team, TeamInput } from './types';

const teamKeys = {
  all: ['teams'] as const,
  list: (branchId?: string) => ['teams', 'list', branchId ?? 'scope'] as const,
};

/** Includes `manager` and `members`. Non-admins only get the teams of their branch. */
export function useTeams(branchId?: string) {
  return useQuery({
    queryKey: teamKeys.list(branchId),
    queryFn: async () => (await api.get<Team[]>('/teams', { params: branchId ? { branchId } : {} })).data,
  });
}

/**
 * Saves the team, then syncs its members: the backend exposes members as
 * POST/DELETE /teams/:id/members/:userId (a member = a user whose teamId points to the team).
 */
export function useSaveTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      memberIds,
      previousMemberIds = [],
    }: {
      id?: string;
      input: TeamInput;
      memberIds: string[];
      previousMemberIds?: string[];
    }) => {
      const { branchId, ...update } = input;
      const team = id
        ? (await api.put<Team>(`/teams/${id}`, update)).data
        : (await api.post<Team>('/teams', { ...update, branchId })).data;
      const added = memberIds.filter((m) => !previousMemberIds.includes(m));
      const removed = previousMemberIds.filter((m) => !memberIds.includes(m));
      await Promise.all([
        ...added.map((userId) => api.post(`/teams/${team.id}/members/${userId}`)),
        ...removed.map((userId) => api.delete(`/teams/${team.id}/members/${userId}`)),
      ]);
      return team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamKeys.all });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/teams/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamKeys.all });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}
