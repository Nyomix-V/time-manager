// Libellés affichés à l'écran pour les valeurs de l'API.
import type { AbsenceType, DecisionStatus, PresenceState, ProfileField, Role, User } from '@/api/types';
import type { Tone } from '@/components/ui';

export const fullName = (u: Pick<User, 'firstName' | 'lastName'>) => `${u.firstName} ${u.lastName}`;

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Employé',
  MANAGER: 'Manager',
  DIRECTEUR: 'Directeur',
  ADMIN: 'Administrateur',
};

export const ABSENCE_LABELS: Record<AbsenceType, string> = {
  SICK_LEAVE: 'Arrêt maladie',
  MEDICAL: 'Rendez-vous médical',
  LEAVE: 'Congé',
  FORGOTTEN_CLOCK: 'Oubli de pointage',
  OTHER: 'Autre',
};

export const DECISION_LABELS: Record<DecisionStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'En attente', tone: 'warning' },
  APPROVED: { label: 'Validée', tone: 'success' },
  REJECTED: { label: 'Refusée', tone: 'danger' },
};

export const FIELD_LABELS: Record<ProfileField, string> = {
  firstName: 'Prénom',
  lastName: 'Nom',
  email: 'Email',
  phone: 'Téléphone',
};

export const PRESENCE_LABELS: Record<PresenceState, { label: string; tone: Tone }> = {
  WORKING: { label: 'En poste', tone: 'success' },
  ON_BREAK: { label: 'En pause', tone: 'info' },
  NOT_STARTED: { label: 'Pas encore pointé', tone: 'neutral' },
  DONE: { label: 'Parti', tone: 'neutral' },
  ABSENT: { label: 'Absent', tone: 'neutral' },
  OFF_DAY: { label: 'Repos', tone: 'neutral' },
};
