import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role, UserStatus, TokenType } from '../entities/enums';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import {
  AuthUser,
  assertCanManageUser,
  assertCanReadUser,
  assertSameBranchOrGlobal,
} from '../auth/scope';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly auth: AuthService,
  ) {}

  // List scoped to the actor; optional filters (branch, team, role).
  // Soft-deleted excluded automatically; passwordHash never returned (select:false).
  findAll(actor: AuthUser, filters: { branchId?: string; teamId?: string; role?: Role } = {}) {
    const where: FindOptionsWhere<User> = {};
    if (actor.role !== Role.ADMIN) where.branchId = actor.branchId ?? undefined;
    if (filters.branchId && actor.role === Role.ADMIN) where.branchId = filters.branchId;
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.role) where.role = filters.role;
    return this.users.find({ where, relations: { team: true, branch: true } });
  }

  async findOne(id: string) {
    const user = await this.users.findOne({
      where: { id },
      relations: { team: true, branch: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getScoped(actor: AuthUser, id: string) {
    const user = await this.findOne(id);
    assertCanReadUser(actor, { id: user.id, branchId: user.branchId ?? null });
    return user;
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    const targetRole = dto.role ?? Role.EMPLOYEE;

    // Verify the actor may create this role in this branch.
    assertCanManageUser(actor, {
      id: 'new',
      branchId: dto.branchId ?? null,
      role: targetRole,
    });

    const user = this.users.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      role: targetRole,
      branchId: dto.branchId,
      teamId: dto.teamId,
      status: UserStatus.INVITED, // waits for activation
      workingDays: dto.workingDays,
      expectedStartMin: dto.expectedStartMin,
      workMinutesPerDay: dto.workMinutesPerDay,
      breakMinutes: dto.breakMinutes,
    });
    const saved = await this.users.save(user);

    // Issue an activation token (valid 48h). In prod this is emailed.
    const activationToken = await this.auth.issueToken(
      saved.id,
      TokenType.ACTIVATION,
      48 * 60,
    );
    return { ...saved, activationToken };
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const target = await this.findOne(id);
    assertCanManageUser(actor, {
      id: target.id,
      branchId: target.branchId ?? null,
      role: target.role,
    });
    await this.users.update(id, dto);
    return this.findOne(id);
  }

  // Soft-delete = "deletion safety" + RGPD: the row is hidden, clocks are kept.
  async remove(actor: AuthUser, id: string) {
    const target = await this.findOne(id);
    assertCanManageUser(actor, {
      id: target.id,
      branchId: target.branchId ?? null,
      role: target.role,
    });
    await this.users.softDelete(id);
    return { deleted: true };
  }
}
