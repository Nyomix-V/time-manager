import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { CreateUserInput, CreatedUser, UpdateUserInput, User, UserFilters } from './types';

export const userKeys = {
  all: ['users'] as const,
  list: (filters: UserFilters) => ['users', 'list', filters] as const,
  detail: (id: string) => ['users', id] as const,
};

export async function fetchUser(id: string) {
  const { data } = await api.get<User>(`/users/${id}`);
  return data;
}

/** Scoped by the backend: manager/directeur get their branch, admin everyone. */
export function useUsers(filters: UserFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: async () => (await api.get<User[]>('/users', { params: filters })).data,
    ...options,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ''),
    queryFn: () => fetchUser(id!),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => (await api.post<CreatedUser>('/users', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateUserInput) => (await api.put<User>(`/users/${id}`, input)).data,
    onSuccess: (user) => {
      qc.setQueryData(userKeys.detail(id), user);
      qc.invalidateQueries({ queryKey: userKeys.all });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: (_, id) => {
      // Refresh the lists but not the deleted user's own page (it would 404 while still on screen).
      qc.invalidateQueries({ queryKey: userKeys.all, predicate: (q) => q.queryKey[1] !== id });
    },
  });
}
