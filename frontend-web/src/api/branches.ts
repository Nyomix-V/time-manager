import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Branch, BranchInput } from './types';

export const branchKeys = {
  all: ['branches'] as const,
  detail: (id: string) => ['branches', id] as const,
};

/** Includes `users` (relation loaded by the backend). */
export function useBranches() {
  return useQuery({
    queryKey: branchKeys.all,
    queryFn: async () => (await api.get<Branch[]>('/branches')).data,
  });
}

export function useBranch(id: string | null | undefined) {
  return useQuery({
    queryKey: branchKeys.detail(id ?? ''),
    queryFn: async () => (await api.get<Branch>(`/branches/${id}`)).data,
    enabled: !!id,
  });
}

export function useSaveBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: BranchInput & { id?: string }) =>
      id
        ? (await api.put<Branch>(`/branches/${id}`, input)).data
        : (await api.post<Branch>('/branches', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.all }),
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/branches/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.all }),
  });
}
