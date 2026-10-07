import { ForbiddenException } from '@nestjs/common';
import { Role } from '../entities/enums';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  branchId?: string | null;
}

// Authorization BY SCOPE, not just by role (aligned with mockup page 18).
//
//   ADMIN     -> everything, every branch (technical). Does NOT clock in.
//   DIRECTEUR -> full management within their OWN branch, managers included.
//   MANAGER   -> manages employees within their OWN branch.
//   EMPLOYEE  -> acts on themselves only.
//
// Called inside services, after the RolesGuard has checked the coarse role.

export function assertSameBranchOrGlobal(
  actor: AuthUser,
  branchId: string | null,
) {
  if (actor.role === Role.ADMIN) return; // global
  if (
    (actor.role === Role.DIRECTEUR || actor.role === Role.MANAGER) &&
    actor.branchId &&
    actor.branchId === branchId
  ) {
    return;
  }
  throw new ForbiddenException('Out of your branch scope');
}

// Can the actor manage (create/update/delete) this target user?
export function assertCanManageUser(
  actor: AuthUser,
  target: { id: string; branchId: string | null; role: Role },
) {
  if (actor.role === Role.ADMIN) return;

  // Directeur: anyone in their branch, including managers (but not admins).
  if (
    actor.role === Role.DIRECTEUR &&
    actor.branchId === target.branchId &&
    target.role !== Role.ADMIN
  ) {
    return;
  }

  // Manager: only employees in their own branch.
  if (
    actor.role === Role.MANAGER &&
    actor.branchId === target.branchId &&
    target.role === Role.EMPLOYEE
  ) {
    return;
  }

  throw new ForbiddenException('You cannot manage this user');
}

// Read access: self, or someone in your branch (manager/directeur), or anyone (admin).
export function assertCanReadUser(
  actor: AuthUser,
  target: { id: string; branchId: string | null },
) {
  if (actor.role === Role.ADMIN) return;
  if (actor.id === target.id) return;
  if (
    (actor.role === Role.DIRECTEUR || actor.role === Role.MANAGER) &&
    actor.branchId === target.branchId
  ) {
    return;
  }
  throw new ForbiddenException('You cannot view this user');
}
