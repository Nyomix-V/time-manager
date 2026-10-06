// Shared domain enums (string enums so DB values are human-readable).
export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
  DIRECTEUR = 'DIRECTEUR', // métier : supervision lecture seule, toutes branches
}

// Rôles qui voient tout, sans restriction de branche.
export function hasGlobalScope(role: Role): boolean {
  return role === Role.ADMIN || role === Role.DIRECTEUR;
}

export enum ClockStatus {
  IN = 'IN',
  OUT = 'OUT',
}

export enum AbsenceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
