import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { ChangeRequest, ChangeRequestInput, DecisionStatus } from './types';

// ⚠ Backend: change requests (profile update / account deletion validated by the manager)
// do not exist yet. Proposed REST contract, see README "Endpoints attendus".

const requestKeys = {
  mine: ['requests', 'me'] as const,
  scope: ['requests', 'scope'] as const,
};

/** Requests of the logged-in user (only one pending at a time). */
export function useMyRequests() {
  return useQuery({
    queryKey: requestKeys.mine,
    queryFn: async () => (await api.get<ChangeRequest[]>('/requests/me')).data,
    retry: false,
  });
}

/** Requests the manager has to handle. */
export function useScopeRequests(enabled = true) {
  return useQuery({
    queryKey: requestKeys.scope,
    queryFn: async () => (await api.get<ChangeRequest[]>('/requests')).data,
    retry: false,
    enabled,
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChangeRequestInput) => (await api.post<ChangeRequest>('/requests', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: requestKeys.mine }),
  });
}

export function useDecideRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, comment }: { id: string; status: DecisionStatus; comment?: string }) =>
      (await api.patch<ChangeRequest>(`/requests/${id}/decision`, { status, comment })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.scope });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
