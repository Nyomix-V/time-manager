import { ForbiddenException } from '@nestjs/common';
import { Role } from '../entities/enums';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  branchId?: string | null;
}

// Authorization BY SCOPE, not just by role (the subtle part of the user stories).
//
//   ADMIN    -> may act on any branch / any user
//   MANAGER  -> may act only within their OWN branch
//   EMPLOYEE -> may act only on themselves
//
// Call these in services, after the RolesGuard has checked the coarse role.

export function assertCanManageBranch(actor: AuthUser, branchId: string | null) {
  if (actor.role === Role.ADMIN) return;
  if (actor.role === Role.MANAGER && actor.branchId && actor.branchId === branchId) {
    return;
  }
  throw new ForbiddenException('Out of your branch scope');
}

// Can the actor read/manage this target user?
export function assertCanActOnUser(
  actor: AuthUser,
  target: { id: string; branchId: string | null },
) {
  if (actor.role === Role.ADMIN) return;
  if (actor.role === Role.MANAGER && actor.branchId === target.branchId) return;
  if (actor.id === target.id) return; // acting on self
  throw new ForbiddenException('You cannot act on this user');
}
