// Formats échangés avec l'API.
// Ce qui existe déjà dans le backend garde ses noms de champs ; les ajouts sont marqués « NOUVEAU »
// et décrits dans mobile/API.md pour l'équipe backend.
import type { Role } from '@/auth/session';

export type { Role };

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
  branchId: string | null;
  teamId: string | null; // NOUVEAU : équipe du salarié (null = sans équipe)
  microsoftLinked: boolean; // NOUVEAU
};

export type Branch = { id: string; name: string };

// NOUVEAU : les équipes n'existent pas encore côté backend (exigées par le sujet).
export type Team = { id: string; name: string; description: string; branchId: string; managerId: string | null };

// IN / OUT existent ; BREAK_START / BREAK_END sont NOUVEAUX (pointage des pauses).
export type ClockStatus = 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
export type Clock = { id: string; userId: string; status: ClockStatus; time: string };

// NOUVEAU : planning d'un salarié. workDays : 1 = lundi … 7 = dimanche.
// La fin de journée n'est pas stockée : elle se calcule (début + travail + pause).
export type Planning = {
  userId: string;
  workDays: number[];
  startMin: number; // minutes depuis minuit (540 = 09:00)
  dailyMinutes: number;
  breakMinutes: number;
};

export type DecisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type Decision = {
  status: DecisionStatus;
  createdAt: string;
  decidedBy: string | null; // NOUVEAU
  decidedByName: string | null; // NOUVEAU : un employé ne peut pas lire la fiche de son manager
  decidedAt: string | null; // NOUVEAU
  decisionComment: string | null; // NOUVEAU : commentaire, obligatoire en cas de refus
};

export type AbsenceType = 'SICK_LEAVE' | 'MEDICAL' | 'LEAVE' | 'FORGOTTEN_CLOCK' | 'OTHER';

export type Absence = Decision & {
  id: string;
  userId: string;
  type: AbsenceType; // NOUVEAU
  startDate: string;
  endDate: string;
  reason: string; // commentaire libre du salarié
  attachmentName: string | null; // NOUVEAU : justificatif
};

// NOUVEAU : demandes de modification d'informations ou de suppression de compte.
// Un salarié n'a qu'une demande en attente à la fois.
export type ProfileField = 'firstName' | 'lastName' | 'email' | 'phone';

export type ProfileRequest = Decision & {
  id: string;
  userId: string;
  kind: 'UPDATE' | 'DELETE';
  field: ProfileField | null;
  currentValue: string | null;
  newValue: string | null;
  reason: string | null;
};

// NOUVEAU : statut en direct des salariés (écran Équipe du manager).
export type PresenceState = 'NOT_STARTED' | 'WORKING' | 'ON_BREAK' | 'DONE' | 'ABSENT' | 'OFF_DAY';
export type Presence = { userId: string; state: PresenceState; since: string | null; lateMinutes: number };

// GET /kpi/report existe ; workedDays est NOUVEAU (nécessaire au taux de ponctualité).
export type KpiRow = {
  userId: string;
  name: string;
  totalHours: number;
  overtimeHours: number;
  avgDailyHours: number;
  lateDays: number;
  lateAlert: boolean;
  workedDays: number;
};
export type KpiReport = { from: string | null; to: string | null; rows: KpiRow[] };
