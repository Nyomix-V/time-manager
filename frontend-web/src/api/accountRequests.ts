import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { AccountRequest, AccountRequestInput, DecisionInput } from './types';

// Profile change / account deletion requests, validated by a manager (mockups 03 and 13).

const requestKeys = {
  all: ['account-requests'] as const,
  user: (userId: string) => ['account-requests', 'user', userId] as const,
  pending: ['account-requests', 'pending'] as const,
};

async function fetchUserRequests(userId: string) {
  return (await api.get<AccountRequest[]>(`/account-requests/user/${userId}`)).data;
}

export function useUserRequests(userId: string | undefined) {
  return useQuery({
    queryKey: requestKeys.user(userId ?? ''),
    queryFn: () => fetchUserRequests(userId!),
    enabled: !!userId,
  });
}

/** Pending requests, with `user` loaded. */
export function usePendingRequests(enabled = true) {
  return useQuery({
    queryKey: requestKeys.pending,
    queryFn: async () => (await api.get<AccountRequest[]>('/account-requests/pending')).data,
    enabled,
  });
}

export function useRequestsOf(userIds: string[], enabled = true) {
  return useQueries({
    queries: userIds.map((id) => ({
      queryKey: requestKeys.user(id),
      queryFn: () => fetchUserRequests(id),
      enabled,
    })),
    combine: (results) => ({
      data: results.flatMap((r) => r.data ?? []),
      isPending: enabled && results.some((r) => r.isPending),
      error: results.find((r) => r.error)?.error ?? null,
    }),
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AccountRequestInput) =>
      (await api.post<AccountRequest>('/account-requests', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: requestKeys.all }),
  });
}

export function useDecideRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: DecisionInput) =>
      (await api.patch<AccountRequest>(`/account-requests/${id}/decision`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.all });
      qc.invalidateQueries({ queryKey: ['users'] }); // an approved change/deletion modifies the user
    },
  });
}
