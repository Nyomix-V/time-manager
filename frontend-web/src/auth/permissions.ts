import type { Role } from '@/api/types';

// What each role may do in the UI. Mirrors the @Roles(...) guards of the backend:
// hiding a button is only comfort, the server remains the one enforcing the rules.
const PERMISSIONS = {
  clockIn: ['EMPLOYEE', 'MANAGER', 'DIRECTEUR'], // everybody clocks in, except the admin
  viewUsers: ['MANAGER', 'DIRECTEUR', 'ADMIN'],
  createUser: ['MANAGER', 'ADMIN'],
  deleteUser: ['MANAGER', 'ADMIN'],
  chooseRole: ['ADMIN'], // only an admin creates managers / directors / admins
  viewKpi: ['MANAGER', 'DIRECTEUR', 'ADMIN'],
  decideRequests: ['MANAGER', 'ADMIN'],
  manageTeams: ['MANAGER', 'DIRECTEUR', 'ADMIN'],
  manageBranches: ['ADMIN'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Employé',
  MANAGER: 'Manager',
  DIRECTEUR: 'Directeur',
  ADMIN: 'Administrateur',
};
