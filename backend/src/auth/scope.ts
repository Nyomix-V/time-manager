import { ForbiddenException } from '@nestjs/common';
import { Role } from '../entities/enums';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  branchId?: string | null;
}

type Target = { id: string; branchId?: string | null; role: Role };

// Authorization BY SCOPE, not just by role (aligned with mockup page 18).
//
//   ADMIN     -> everything, every branch (technical). Does NOT clock in.
//   DIRECTEUR -> full management within their OWN branch, managers included.
//   MANAGER   -> manages employees within their OWN branch.
//   EMPLOYEE  -> acts on themselves only.
//
// The can* functions answer yes/no (to filter lists); the assert* functions
// throw a 403 (to guard a single action). Called inside services, after the
// RolesGuard has checked the coarse role.

const sameBranch = (actor: AuthUser, branchId?: string | null) =>
  !!actor.branchId && actor.branchId === (branchId ?? null);

/** May the actor manage this user: update, delete, decide their requests? */
export function canManageUser(actor: AuthUser, target: Target): boolean {
  if (actor.role === Role.ADMIN) return true;
  if (actor.id === target.id) return false; // nobody validates their own requests
  // Directeur: anyone in their branch, including managers (but not admins).
  if (actor.role === Role.DIRECTEUR) return sameBranch(actor, target.branchId) && target.role !== Role.ADMIN;
  // Manager: only employees in their own branch.
  if (actor.role === Role.MANAGER) return sameBranch(actor, target.branchId) && target.role === Role.EMPLOYEE;
  return false;
}

/** May the actor read this user's data (profile, clocks, hours, absences, requests)? */
export function canReadUser(actor: AuthUser, target: { id: string; branchId?: string | null }): boolean {
  if (actor.role === Role.ADMIN || actor.id === target.id) return true;
  return (actor.role === Role.DIRECTEUR || actor.role === Role.MANAGER) && sameBranch(actor, target.branchId);
}

export function assertSameBranchOrGlobal(actor: AuthUser, branchId: string | null) {
  if (actor.role === Role.ADMIN) return;
  if ((actor.role === Role.DIRECTEUR || actor.role === Role.MANAGER) && sameBranch(actor, branchId)) return;
  throw new ForbiddenException('Hors de votre branche');
}

export function assertCanManageUser(actor: AuthUser, target: Target) {
  if (!canManageUser(actor, target)) throw new ForbiddenException('Vous ne pouvez pas gérer cette personne');
}

export function assertCanReadUser(actor: AuthUser, target: { id: string; branchId?: string | null }) {
  if (!canReadUser(actor, target)) throw new ForbiddenException('Vous ne pouvez pas consulter cette personne');
}
