import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { RequestStatus } from '../entities/enums';
import { User } from '../entities/user.entity';
import { AuthUser, canManageUser } from '../auth/scope';

// Shared by absences and account requests: same decision rules (mockup page 13).

export class DecideDto {
  @IsIn([RequestStatus.APPROVED, RequestStatus.REJECTED])
  status: RequestStatus.APPROVED | RequestStatus.REJECTED;

  @IsOptional() @IsString() @MaxLength(500)
  decisionComment?: string;
}

type Decidable = {
  status: RequestStatus;
  user?: User | null;
  decidedById?: string | null;
  decisionComment?: string | null;
  decidedAt?: Date | null;
};

/** Pending requests the actor may decide: their scope only (assertCanManageUser rules). */
export function decidableBy<T extends { user?: User | null }>(actor: AuthUser, items: T[]): T[] {
  return items.filter((item) => item.user && canManageUser(actor, item.user));
}

/**
 * Applies a decision after checking:
 *  - the request exists and its owner is in the actor's scope;
 *  - it is still pending (no second decision);
 *  - a refusal carries a reason, shown to the employee.
 * `item` must be loaded with its `user` relation.
 */
export function applyDecision<T extends Decidable>(actor: AuthUser, item: T | null, dto: DecideDto): T {
  if (!item || !item.user) throw new NotFoundException('Demande introuvable');
  if (!canManageUser(actor, item.user)) throw new ForbiddenException('Cette demande ne relève pas de vous');
  if (item.status !== RequestStatus.PENDING) throw new BadRequestException('Cette demande a déjà été traitée');
  const comment = dto.decisionComment?.trim() || null;
  if (dto.status === RequestStatus.REJECTED && !comment) {
    throw new BadRequestException('Le motif du refus est obligatoire');
  }
  item.status = dto.status;
  item.decidedById = actor.id;
  item.decisionComment = comment;
  item.decidedAt = new Date();
  return item;
}

/** Who decided, without leaking the decider's whole profile to the employee. */
export function withDeciderName<T extends { decidedBy?: User | null }>(item: T) {
  const { decidedBy, ...rest } = item;
  return { ...rest, decidedBy: decidedBy ? { id: decidedBy.id, firstName: decidedBy.firstName, lastName: decidedBy.lastName } : null };
}

/** The requester, reduced to what a manager needs on the requests screen. */
export function withRequester<T extends { user?: User | null }>(item: T) {
  const { user, ...rest } = item;
  return {
    ...rest,
    user: user
      ? { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? null, teamId: user.teamId ?? null, role: user.role }
      : null,
  };
}
