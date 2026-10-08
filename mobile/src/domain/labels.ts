// Libellés affichés à l'écran pour les valeurs de l'API.
import type { AbsenceType, ClockStatus, EditableField, RequestStatus, Role, User } from '@/api/types';
import type { Tone } from '@/components/ui';

export const fullName = (u: Pick<User, 'firstName' | 'lastName'>) => `${u.firstName} ${u.lastName}`;

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Employé',
  MANAGER: 'Manager',
  DIRECTEUR: 'Directeur',
  ADMIN: 'Administrateur',
};

export const ABSENCE_LABELS: Record<AbsenceType, string> = {
  SICK: 'Arrêt maladie',
  MEDICAL: 'Rendez-vous médical',
  LEAVE: 'Congé',
  MISSED_CLOCK: 'Oubli de pointage',
  OTHER: 'Autre',
};

export const DECISION_LABELS: Record<RequestStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'En attente', tone: 'warning' },
  APPROVED: { label: 'Validée', tone: 'success' },
  REJECTED: { label: 'Refusée', tone: 'danger' },
};

export const FIELD_LABELS: Record<EditableField, string> = {
  phone: 'Téléphone',
  firstName: 'Prénom',
  lastName: 'Nom',
};

export const PRESENCE_LABELS: Record<ClockStatus['state'], { label: string; tone: Tone }> = {
  WORKING: { label: 'En poste', tone: 'success' },
  ON_BREAK: { label: 'En pause', tone: 'info' },
  OUT: { label: 'Pas en poste', tone: 'neutral' },
};
