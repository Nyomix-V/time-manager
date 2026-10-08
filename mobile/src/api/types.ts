// Formats échangés avec l'API : copie fidèle des entités du backend (backend/src/entities).
// Le faux backend du mode démo (src/mock) renvoie exactement ces formats.
import type { Role } from '@/auth/session';

export type { Role };

export type UserStatus = 'INVITED' | 'ACTIVE' | 'DISABLED';

export type Branch = { id: string; name: string; description?: string | null };

export type Team = {
  id: string;
  name: string;
  description?: string | null;
  branchId: string;
  managerId?: string | null;
  manager?: User | null;
  members?: User[];
};

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  msOid?: string | null;
  role: Role;
  status: UserStatus;
  branchId?: string | null;
  teamId?: string | null; // null = sans équipe
  team?: Team | null;
  branch?: Branch | null;
  // Planning, fixé par le manager. workingDays : jours ISO séparés par des virgules ("1,2,3,4,5" = lun → ven).
  workingDays: string;
  expectedStartMin: number; // arrivée prévue, en minutes depuis minuit (540 = 09:00)
  workMinutesPerDay: number;
  breakMinutes: number;
};

/** Champs modifiables par un manager (PUT /users/:id). */
export type UserUpdate = Partial<
  Pick<User, 'firstName' | 'lastName' | 'email' | 'phone' | 'teamId' | 'workingDays' | 'expectedStartMin' | 'workMinutesPerDay' | 'breakMinutes'>
>;

export type ClockType = 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
export type Clock = { id: string; userId: string; time: string; type: ClockType };

/** GET /clocks/:userId/status */
export type ClockStatus = { state: 'OUT' | 'WORKING' | 'ON_BREAK'; since: string | null };

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type Decision = {
  status: RequestStatus;
  decidedById?: string | null;
  decisionComment?: string | null;
  decidedAt?: string | null;
  createdAt: string;
};

export type AbsenceType = 'SICK' | 'MEDICAL' | 'LEAVE' | 'MISSED_CLOCK' | 'OTHER';

export type Absence = Decision & {
  id: string;
  userId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  comment?: string | null;
  attachmentPath?: string | null;
  user?: User; // présent dans GET /absences/pending
};

export type AccountRequestType = 'INFO_CHANGE' | 'DELETION';
/** Champs qu'un employé peut demander à modifier (le backend refuse les autres). */
export type EditableField = 'phone' | 'firstName' | 'lastName';

export type AccountRequest = Decision & {
  id: string;
  userId: string;
  type: AccountRequestType;
  field?: EditableField | null;
  newValue?: string | null;
  reason?: string | null;
  user?: User; // présent dans GET /account-requests/pending
};

export type KpiRow = {
  userId: string;
  name: string;
  branchId?: string | null;
  teamId?: string | null;
  totalHours: number;
  avgDailyHours: number;
  overtimeHours: number;
  breakMinutes: number;
  lateDays: number;
  lateAlert: boolean;
};

export type KpiReport = {
  from: string | null;
  to: string | null;
  teamId?: string | null;
  summary: { people: number; avgWeeklyHours: number; punctualityPct: number; alerts: number };
  rows: KpiRow[];
};
