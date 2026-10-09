import type { Role, User } from '@/api/types';

// What each role may do in the UI. Mirrors the @Roles(...) guards and the scope
// rules of the backend (auth/scope.ts): hiding a button is only comfort, the
// server remains the one enforcing the rules.
const PERMISSIONS = {
  clockIn: ['EMPLOYEE', 'MANAGER', 'DIRECTEUR'], // everybody clocks in, except the admin
  viewUsers: ['MANAGER', 'DIRECTEUR', 'ADMIN'],
  manageUsers: ['MANAGER', 'DIRECTEUR', 'ADMIN'], // create / edit / delete (within scope)
  viewKpi: ['MANAGER', 'DIRECTEUR', 'ADMIN'],
  decideRequests: ['MANAGER', 'DIRECTEUR', 'ADMIN'],
  manageTeams: ['MANAGER', 'DIRECTEUR', 'ADMIN'],
  manageBranches: ['ADMIN'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

type Actor = Pick<User, 'id' | 'role' | 'branchId'>;
type Target = Pick<User, 'role' | 'branchId'>;

/**
 * Same rule as assertCanManageUser in the backend:
 * admin -> anyone ; directeur -> anyone of their branch except admins ;
 * manager -> employees of their branch only.
 */
export function canManageUser(actor: Actor, target: Target): boolean {
  if (actor.role === 'ADMIN') return true;
  if (!actor.branchId || actor.branchId !== target.branchId) return false;
  if (actor.role === 'DIRECTEUR') return target.role !== 'ADMIN';
  if (actor.role === 'MANAGER') return target.role === 'EMPLOYEE';
  return false;
}

/** Roles an actor may give when creating someone. */
export function creatableRoles(role: Role): Role[] {
  if (role === 'ADMIN') return ['EMPLOYEE', 'MANAGER', 'DIRECTEUR', 'ADMIN'];
  if (role === 'DIRECTEUR') return ['EMPLOYEE', 'MANAGER'];
  if (role === 'MANAGER') return ['EMPLOYEE'];
  return [];
}

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Employé',
  MANAGER: 'Manager',
  DIRECTEUR: 'Directeur',
  ADMIN: 'Administrateur',
};
