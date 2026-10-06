import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role, hasGlobalScope } from '../entities/enums';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { AuthUser, assertCanActOnUser, assertCanManageBranch } from '../auth/scope';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  // Managers see only their branch; admins see everyone.
  // Soft-deleted rows are excluded automatically (@DeleteDateColumn).
  // passwordHash never returned (select:false on the column).
  findAll(actor: AuthUser) {
    if (hasGlobalScope(actor.role)) return this.users.find(); // admin + directeur
    return this.users.find({ where: { branchId: actor.branchId ?? undefined } });
  }

  async findOne(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Internal (auth): must include passwordHash, which is select:false by default.
  findByEmail(email: string) {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    const targetRole = dto.role ?? Role.EMPLOYEE;

    // Only admins may create managers or admins.
    if (targetRole !== Role.EMPLOYEE && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only an admin can create managers/admins');
    }
    // A manager may only add employees into their own branch.
    if (actor.role === Role.MANAGER) {
      assertCanManageBranch(actor, dto.branchId ?? null);
    }

    const passwordHash = await AuthService.hash(dto.password);
    const user = this.users.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      role: targetRole,
      branchId: dto.branchId,
      passwordHash,
    });
    const saved = await this.users.save(user);
    delete saved.passwordHash;
    return saved;
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const target = await this.findOne(id);
    assertCanActOnUser(actor, { id: target.id, branchId: target.branchId ?? null });
    await this.users.update(id, dto);
    return this.findOne(id);
  }

  // Soft-delete = "deletion safety": row kept, hidden from queries.
  async remove(actor: AuthUser, id: string) {
    const target = await this.findOne(id);
    assertCanActOnUser(actor, { id: target.id, branchId: target.branchId ?? null });
    await this.users.softDelete(id);
    return { deleted: true };
  }
}
