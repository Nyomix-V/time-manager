// Shared domain enums (string enums so DB values are human-readable).

export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  DIRECTEUR = 'DIRECTEUR', // business head: full management WITHIN their branch (managers included)
  ADMIN = 'ADMIN',         // technical: everything across all branches (does not clock in)
}

// Admin (and directeur) see/act across branches; manager is scoped to their branch.
export function hasGlobalScope(role: Role): boolean {
  return role === Role.ADMIN;
}

// Who may manage accounts (create/update/delete users)?
export function canManageAccounts(role: Role): boolean {
  return role === Role.ADMIN || role === Role.DIRECTEUR || role === Role.MANAGER;
}

// Clock events. BREAK_* let us stop the hour counter during a pause.
export enum ClockType {
  IN = 'IN',
  OUT = 'OUT',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
}

// Kinds of absence an employee can justify (mockup page 06).
export enum AbsenceType {
  SICK = 'SICK',             // Arrêt maladie
  MEDICAL = 'MEDICAL',       // Rendez-vous médical
  LEAVE = 'LEAVE',           // Congé
  MISSED_CLOCK = 'MISSED_CLOCK', // Oubli de pointage
  OTHER = 'OTHER',
}

// Shared decision status for absences and account requests.
export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Account requests an employee sends to their manager (mockup page 13).
export enum AccountRequestType {
  INFO_CHANGE = 'INFO_CHANGE', // e.g. phone number update
  DELETION = 'DELETION',       // account removal (RGPD)
}

// Account lifecycle (mockup: "Invitation envoyée", "Compte non activé").
export enum UserStatus {
  INVITED = 'INVITED', // created, waiting for the user to set a password
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

// One-time tokens for the email flows (activation / password reset, pages 02 & 09).
export enum TokenType {
  ACTIVATION = 'ACTIVATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}
