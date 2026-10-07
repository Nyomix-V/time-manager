// Types mirroring the backend entities/DTOs (backend/src/entities, backend/src/**/dto).

export type Role = 'EMPLOYEE' | 'MANAGER' | 'DIRECTEUR' | 'ADMIN';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: Role;
  branchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role?: Role;
  branchId?: string;
}

export type UpdateUserInput = Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'phone' | 'branchId'>>;

export interface Branch {
  id: string;
  name: string;
  description?: string | null;
  expectedStartMin: number; // minutes from midnight, 540 = 09:00
  users?: User[];
}

export type BranchInput = Pick<Branch, 'name' | 'description' | 'expectedStartMin'>;

export type ClockStatus = 'IN' | 'OUT';

export interface Clock {
  id: string;
  userId: string;
  time: string;
  status: ClockStatus;
}

export interface WorkedDay {
  date: string; // YYYY-MM-DD
  hours: number;
}

export interface WorkingSummary {
  totalHours: number;
  perDay: WorkedDay[];
}

export interface KpiRow {
  userId: string;
  name: string;
  totalHours: number;
  overtimeHours: number;
  avgDailyHours: number;
  lateDays: number;
  lateAlert: boolean;
}

export interface KpiReport {
  from?: string;
  to?: string;
  kpis: string[];
  rows: KpiRow[];
}

export type DecisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Absence {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: DecisionStatus;
  createdAt: string;
}

export interface AbsenceInput {
  startDate: string;
  endDate: string;
  reason: string;
}

// ---- Not implemented by the backend yet (proposed contracts, see README) ----

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  branchId?: string | null;
  managerId?: string | null;
  memberIds: string[];
}

export type TeamInput = Omit<Team, 'id'>;

export type ChangeRequestType = 'UPDATE' | 'DELETE';
export type EditableField = 'firstName' | 'lastName' | 'email' | 'phone';

export interface ChangeRequest {
  id: string;
  userId: string;
  type: ChangeRequestType;
  field?: EditableField;
  newValue?: string;
  comment?: string;
  status: DecisionStatus;
  createdAt: string;
}

export type ChangeRequestInput = Pick<ChangeRequest, 'type' | 'field' | 'newValue' | 'comment'>;

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
