// Toutes les données de l'app passent par ces fonctions : les écrans n'appellent jamais fetch directement.
// Les routes sont celles du backend (backend/src/*/…module.ts / controller.ts).
import { apiRequest } from '@/lib/api';
import type {
  Absence,
  AbsenceType,
  AccountRequest,
  Clock,
  ClockStatus,
  ClockType,
  EditableField,
  KpiReport,
  RequestStatus,
  Team,
  User,
  UserUpdate,
} from './types';

export type Decision = { status: Exclude<RequestStatus, 'PENDING'>; decisionComment?: string };

// Un pointage = une route par action (POST /clocks/:userId/arrive …).
const CLOCK_ROUTES: Record<ClockType, string> = {
  IN: 'arrive',
  BREAK_START: 'break/start',
  BREAK_END: 'break/end',
  OUT: 'depart',
};

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiRequest<{ access_token: string }>('/auth/login', { method: 'POST', body: { email, password } }),
    changePassword: (currentPassword: string, newPassword: string) =>
      apiRequest<{ changed: true }>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  },

  users: {
    /** Salariés de la branche (toute l'entreprise pour l'admin), avec leur équipe. */
    list: (filters: { teamId?: string } = {}) => apiRequest<User[]>('/users', { query: filters }),
    get: (id: string) => apiRequest<User>(`/users/${id}`),
    update: (id: string, changes: UserUpdate) => apiRequest<User>(`/users/${id}`, { method: 'PUT', body: changes }),
    remove: (id: string) => apiRequest<{ deleted: true }>(`/users/${id}`, { method: 'DELETE' }),
  },

  teams: { list: () => apiRequest<Team[]>('/teams') },

  clocks: {
    /** Tous les pointages de la personne, du plus ancien au plus récent. */
    list: (userId: string) => apiRequest<Clock[]>(`/clocks/${userId}`),
    status: (userId: string) => apiRequest<ClockStatus>(`/clocks/${userId}/status`),
    punch: (userId: string, type: ClockType) => apiRequest<Clock>(`/clocks/${userId}/${CLOCK_ROUTES[type]}`, { method: 'POST' }),
  },

  kpi: {
    report: (from: Date, to: Date, teamId?: string) =>
      apiRequest<KpiReport>('/kpi/report', { query: { from: from.toISOString(), to: to.toISOString(), teamId } }),
  },

  absences: {
    listForUser: (userId: string) => apiRequest<Absence[]>(`/absences/user/${userId}`),
    listPending: () => apiRequest<Absence[]>('/absences/pending'),
    create: (absence: { type: AbsenceType; startDate: Date; endDate: Date; comment?: string; attachmentPath?: string }) =>
      apiRequest<Absence>('/absences', {
        method: 'POST',
        body: { ...absence, startDate: absence.startDate.toISOString(), endDate: absence.endDate.toISOString() },
      }),
    decide: (id: string, decision: Decision) => apiRequest<Absence>(`/absences/${id}/decision`, { method: 'PATCH', body: decision }),
  },

  accountRequests: {
    listForUser: (userId: string) => apiRequest<AccountRequest[]>(`/account-requests/user/${userId}`),
    listPending: () => apiRequest<AccountRequest[]>('/account-requests/pending'),
    requestChange: (field: EditableField, newValue: string) =>
      apiRequest<AccountRequest>('/account-requests', { method: 'POST', body: { type: 'INFO_CHANGE', field, newValue } }),
    requestDeletion: (reason: string) =>
      apiRequest<AccountRequest>('/account-requests', { method: 'POST', body: { type: 'DELETION', reason } }),
    decide: (id: string, decision: Decision) =>
      apiRequest<AccountRequest>(`/account-requests/${id}/decision`, { method: 'PATCH', body: decision }),
  },
};
