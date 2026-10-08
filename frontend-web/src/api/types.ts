// Types mirroring the backend entities/DTOs (backend/src/entities, backend/src/**/dto).

export type Role = 'EMPLOYEE' | 'MANAGER' | 'DIRECTEUR' | 'ADMIN';
export type UserStatus = 'INVITED' | 'ACTIVE' | 'DISABLED';

/** Individual planning, set by the manager. */
export interface Planning {
  workingDays: string; // ISO weekdays joined by commas, "1,2,3,4,5" = Mon–Fri
  expectedStartMin: number; // minutes from midnight, 540 = 09:00
  workMinutesPerDay: number;
  breakMinutes: number;
}

export interface User extends Planning {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: Role;
  status: UserStatus;
  branchId?: string | null;
  teamId?: string | null;
  // Loaded by GET /users and GET /users/:id
  branch?: Branch | null;
  team?: Team | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateUserInput = Partial<Planning> & {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: Role;
  branchId?: string;
  teamId?: string;
};

/** POST /users returns the user + a one-time activation token (the email itself is not sent yet). */
export type CreatedUser = User & { activationToken: string };

export type UpdateUserInput = Partial<
  Pick<User, 'firstName' | 'lastName' | 'email' | 'phone' | 'branchId' | 'teamId'> & Planning
>;

export interface UserFilters {
  branchId?: string;
  teamId?: string;
  role?: Role;
}

export interface Branch {
  id: string;
  name: string;
  description?: string | null;
  teams?: Team[];
}

export type BranchInput = Pick<Branch, 'name' | 'description'>;

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  branchId: string;
  managerId?: string | null;
  // Loaded by GET /teams
  manager?: User | null;
  members?: User[];
}

export interface TeamInput {
  name: string;
  description?: string;
  branchId: string;
  managerId?: string;
}

export type ClockType = 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';

export interface Clock {
  id: string;
  userId: string;
  time: string;
  type: ClockType;
}

/** GET /clocks/:userId/status */
export interface ClockStatus {
  state: 'OUT' | 'WORKING' | 'ON_BREAK';
  since: string | null;
}

export interface WorkedDay {
  date: string; // YYYY-MM-DD
  hours: number;
}

export interface WorkingSummary {
  totalHours: number;
  breakMinutes: number;
  perDay: WorkedDay[];
}

export interface KpiRow {
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
  workedDays: number;
  weeklyHours: number; // average per week, given the person's own working days
}

export interface KpiSummary {
  people: number;
  avgWeeklyHours: number;
  punctualityPct: number;
  alerts: number;
}

export interface KpiReport {
  from?: string;
  to?: string;
  teamId?: string;
  summary: KpiSummary;
  rows: KpiRow[];
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** The requester as returned by the /pending routes (reduced profile). */
export type Requester = Pick<User, 'id' | 'firstName' | 'lastName' | 'role'> & {
  phone: string | null;
  teamId: string | null;
};

interface Decision {
  status: RequestStatus;
  decidedById?: string | null;
  /** Who decided (history routes only). */
  decidedBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  decisionComment?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

export type AbsenceType = 'SICK' | 'MEDICAL' | 'LEAVE' | 'MISSED_CLOCK' | 'OTHER';

export interface Absence extends Decision {
  id: string;
  userId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  comment?: string | null;
  attachmentPath?: string | null;
  user?: Requester | null; // GET /absences/pending
}

export interface AbsenceInput {
  type: AbsenceType;
  startDate: string;
  endDate: string;
  comment?: string;
}

export type AccountRequestType = 'INFO_CHANGE' | 'DELETION';
/** Fields an employee may ask to change (the backend refuses the others). */
export type EditableField = 'firstName' | 'lastName' | 'phone';

export interface AccountRequest extends Decision {
  id: string;
  userId: string;
  type: AccountRequestType;
  field?: EditableField | null;
  newValue?: string | null;
  reason?: string | null;
  user?: Requester | null; // GET /account-requests/pending
}

export interface AccountRequestInput {
  type: AccountRequestType;
  field?: EditableField;
  newValue?: string;
  reason?: string;
}

export interface DecisionInput {
  id: string;
  status: Exclude<RequestStatus, 'PENDING'>;
  decisionComment?: string;
}

// ---- Auth ----

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  branchId: string | null;
}

export interface LoginResponse {
  access_token: string;
  user: SessionUser;
}
