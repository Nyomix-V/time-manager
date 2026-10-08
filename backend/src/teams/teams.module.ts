import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsOptional, IsString } from 'class-validator';
import { Team } from '../entities/team.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/enums';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser, assertSameBranchOrGlobal } from '../auth/scope';

class CreateTeamDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsString() branchId: string;
  @IsOptional() @IsString() managerId?: string;
}
class UpdateTeamDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() managerId?: string;
}

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findAll(branchId?: string) {
    return this.teams.find({
      where: branchId ? { branchId } : {},
      relations: { manager: true, members: true },
    });
  }

  async findOne(id: string) {
    const team = await this.teams.findOne({
      where: { id },
      relations: { manager: true, members: true, branch: true },
    });
    if (!team) throw new NotFoundException('Équipe introuvable');
    return team;
  }

  create(dto: CreateTeamDto) {
    return this.teams.save(this.teams.create(dto));
  }

  async update(id: string, dto: UpdateTeamDto) {
    await this.findOne(id);
    await this.teams.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const team = await this.findOne(id);
    // Detach members first (they become "sans équipe"), then delete.
    await this.users.update({ teamId: id }, { teamId: null as any });
    await this.teams.delete(id);
    return { deleted: true, teamName: team.name };
  }

  // Add / remove a member = set or clear their teamId.
  async addMember(teamId: string, userId: string) {
    const team = await this.findOne(teamId);
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.branchId !== team.branchId) {
      throw new BadRequestException("Cette personne n'appartient pas à la branche de l'équipe");
    }
    await this.users.update(userId, { teamId });
    return { added: true };
  }

  async removeMember(teamId: string, userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.teamId !== teamId) {
      throw new NotFoundException("Cette personne n'est pas dans l'équipe");
    }
    await this.users.update(userId, { teamId: null as any });
    return { removed: true };
  }
}

@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  findAll(@CurrentUser() actor: AuthUser, @Query('branchId') branchId?: string) {
    // Non-admins are implicitly scoped to their own branch.
    const scope = actor.role === Role.ADMIN ? branchId : actor.branchId ?? undefined;
    return this.teams.findAll(scope);
  }

  @Get(':id')
  async findOne(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    const team = await this.teams.findOne(id);
    // Same scope as the list: own branch only (admin: everything).
    if (actor.role !== Role.ADMIN && team.branchId !== actor.branchId) {
      throw new ForbiddenException('Hors de votre branche');
    }
    return team;
  }

  @Post()
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  async create(@CurrentUser() actor: AuthUser, @Body() dto: CreateTeamDto) {
    assertSameBranchOrGlobal(actor, dto.branchId);
    return this.teams.create(dto);
  }

  @Put(':id')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  async update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    const team = await this.teams.findOne(id);
    assertSameBranchOrGlobal(actor, team.branchId);
    return this.teams.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  async remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    const team = await this.teams.findOne(id);
    assertSameBranchOrGlobal(actor, team.branchId);
    return this.teams.remove(id);
  }

  @Post(':id/members/:userId')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  async addMember(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    const team = await this.teams.findOne(id);
    assertSameBranchOrGlobal(actor, team.branchId);
    return this.teams.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  async removeMember(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    const team = await this.teams.findOne(id);
    assertSameBranchOrGlobal(actor, team.branchId);
    return this.teams.removeMember(id, userId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Team, User])],
  providers: [TeamsService],
  controllers: [TeamsController],
  exports: [TeamsService],
})
export class TeamsModule {}
