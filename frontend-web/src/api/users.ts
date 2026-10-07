import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { CreateUserInput, UpdateUserInput, User } from './types';

export const userKeys = {
  all: ['users'] as const,
  detail: (id: string) => ['users', id] as const,
};

export async function fetchUser(id: string) {
  const { data } = await api.get<User>(`/users/${id}`);
  return data;
}

/** Scoped by the backend: a manager gets their branch, admin/directeur everyone. */
export function useUsers(options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: async () => (await api.get<User[]>('/users')).data,
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
    mutationFn: async (input: CreateUserInput) => (await api.post<User>('/users', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateUserInput) => (await api.put<User>(`/users/${id}`, input)).data,
    onSuccess: (user) => {
      qc.setQueryData(userKeys.detail(id), user);
      qc.invalidateQueries({ queryKey: userKeys.all, exact: true });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}
