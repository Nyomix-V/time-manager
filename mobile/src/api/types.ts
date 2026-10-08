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

/** PUT /users/me : ce que chacun modifie sur son propre compte (UpdateSelfDto). Rôle, équipe et planning restent au manager. */
export type SelfUpdate = Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'phone'>>;

/** POST /users : un manager inscrit un salarié de sa branche (CreateUserDto). */
export type UserCreate = Pick<User, 'firstName' | 'lastName' | 'email' | 'role'> &
  Partial<Pick<User, 'phone' | 'branchId' | 'teamId' | 'workingDays' | 'expectedStartMin' | 'workMinutesPerDay' | 'breakMinutes'>>;

/** Réponse de POST /users : le compte est « invité » tant que la personne n'a pas choisi son mot de passe. */
export type CreatedUser = User & { activationToken: string };

/** POST /teams et PUT /teams/:id. */
export type TeamChanges = { name: string; description?: string; managerId?: string | null };

export type ClockType = 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
export type Clock = { id: string; userId: string; time: string; type: ClockType };

/** GET /clocks/:userId/status */
export type ClockStatus = { state: 'OUT' | 'WORKING' | 'ON_BREAK'; since: string | null };

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Personne réduite à son nom : qui a traité une demande (decidedBy). */
export type PersonRef = { id: string; firstName: string; lastName: string };

/** Personne qui a fait une demande, dans GET /absences/pending et /account-requests/pending. */
export type Requester = PersonRef & { phone: string | null; teamId: string | null; role: Role };

type Decision = {
  status: RequestStatus;
  decidedById?: string | null;
  /** Présent dans les historiques (GET …/user/:id) : qui a validé ou refusé. */
  decidedBy?: PersonRef | null;
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
  user?: Requester | null; // présent dans GET /absences/pending
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
  user?: Requester | null; // présent dans GET /account-requests/pending
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
  workedDays: number;
  /** Heures par semaine, rapportées aux jours travaillés du planning (comme periodStats). */
  weeklyHours: number;
  /** Jours en retard, hors jours couverts par une absence validée. */
  lateDays: number;
  lateAlert: boolean;
};

export type KpiReport = {
  from: string | null;
  to: string | null;
  teamId?: string | null;
  /** punctualityPct = part des jours travaillés commencés à l'heure. */
  summary: { people: number; avgWeeklyHours: number; punctualityPct: number; alerts: number };
  rows: KpiRow[];
};
