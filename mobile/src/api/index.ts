// Toutes les données de l'app passent par ces fonctions : les écrans n'appellent jamais fetch directement.
// Pour brancher le vrai backend, seules ces fonctions (et API.md) sont à ajuster.
import { apiRequest } from '@/lib/api';
import type {
  Absence,
  AbsenceType,
  Branch,
  Clock,
  ClockStatus,
  DecisionStatus,
  KpiReport,
  Planning,
  Presence,
  ProfileField,
  ProfileRequest,
  Team,
  User,
} from './types';

const range = (from?: Date, to?: Date) => ({ from: from?.toISOString(), to: to?.toISOString() });

export type Decision = { status: Exclude<DecisionStatus, 'PENDING'>; comment?: string };

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiRequest<{ access_token: string }>('/auth/login', { method: 'POST', body: { email, password } }),
    changePassword: (currentPassword: string, newPassword: string) =>
      apiRequest<void>('/auth/password', { method: 'POST', body: { currentPassword, newPassword } }),
  },

  users: {
    list: () => apiRequest<User[]>('/users'),
    get: (id: string) => apiRequest<User>(`/users/${id}`),
    update: (id: string, changes: Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'phone' | 'teamId'>>) =>
      apiRequest<User>(`/users/${id}`, { method: 'PUT', body: changes }),
    remove: (id: string) => apiRequest<void>(`/users/${id}`, { method: 'DELETE' }),
  },

  teams: { list: () => apiRequest<Team[]>('/teams') },
  branches: { list: () => apiRequest<Branch[]>('/branches') },

  plannings: {
    get: (userId: string) => apiRequest<Planning | null>(`/plannings/${userId}`),
    update: (userId: string, planning: Omit<Planning, 'userId'>) =>
      apiRequest<Planning>(`/plannings/${userId}`, { method: 'PUT', body: planning }),
  },

  clocks: {
    list: (userId: string, from?: Date, to?: Date) => apiRequest<Clock[]>(`/clocks/${userId}`, { query: range(from, to) }),
    add: (userId: string, status: ClockStatus) => apiRequest<Clock>(`/clocks/${userId}`, { method: 'POST', body: { status } }),
  },

  presence: { list: () => apiRequest<Presence[]>('/presence') },
  kpi: { report: (from?: Date, to?: Date) => apiRequest<KpiReport>('/kpi/report', { query: range(from, to) }) },

  absences: {
    listForUser: (userId: string) => apiRequest<Absence[]>(`/absences/user/${userId}`),
    listPending: () => apiRequest<Absence[]>('/absences', { query: { status: 'PENDING' } }),
    create: (absence: { type: AbsenceType; startDate: Date; endDate: Date; reason: string; attachmentName: string | null }) =>
      apiRequest<Absence>('/absences', {
        method: 'POST',
        body: { ...absence, startDate: absence.startDate.toISOString(), endDate: absence.endDate.toISOString() },
      }),
    decide: (id: string, decision: Decision) =>
      apiRequest<Absence>(`/absences/${id}/decision`, { method: 'PATCH', body: decision }),
  },

  profileRequests: {
    listForUser: (userId: string) => apiRequest<ProfileRequest[]>(`/profile-requests/user/${userId}`),
    listPending: () => apiRequest<ProfileRequest[]>('/profile-requests', { query: { status: 'PENDING' } }),
    requestUpdate: (field: ProfileField, newValue: string) =>
      apiRequest<ProfileRequest>('/profile-requests', { method: 'POST', body: { kind: 'UPDATE', field, newValue } }),
    requestDeletion: (reason: string) =>
      apiRequest<ProfileRequest>('/profile-requests', { method: 'POST', body: { kind: 'DELETE', reason } }),
    decide: (id: string, decision: Decision) =>
      apiRequest<ProfileRequest>(`/profile-requests/${id}/decision`, { method: 'PATCH', body: decision }),
  },
};
