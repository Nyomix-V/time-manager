import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Absence } from '../entities/absence.entity';
import { User } from '../entities/user.entity';
import { AbsenceType, RequestStatus, Role } from '../entities/enums';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/scope';
import { loadReadableUser } from '../auth/access';
import { DecideDto, applyDecision, decidableBy, withDeciderName, withRequester } from '../common/decision';

class CreateAbsenceDto {
  @IsEnum(AbsenceType) type: AbsenceType;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsString() @MaxLength(500) comment?: string;
  @IsOptional() @IsString() @MaxLength(255) attachmentPath?: string;
}

// Employee justifies an absence; their manager / directeur / admin approves or
// rejects it with a comment (mockup pages 06 & 13). An approved absence also
// excuses lateness on the days it covers (see KpiService).
@Injectable()
export class AbsencesService {
  constructor(
    @InjectRepository(Absence) private readonly absences: Repository<Absence>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  create(userId: string, dto: CreateAbsenceDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) throw new BadRequestException('La date de fin est avant la date de début');
    return this.absences.save(
      this.absences.create({
        userId,
        type: dto.type,
        startDate,
        endDate,
        comment: dto.comment,
        attachmentPath: dto.attachmentPath,
      }),
    );
  }

  async listForUser(actor: AuthUser, userId: string) {
    await loadReadableUser(this.users, actor, userId);
    const rows = await this.absences.find({
      where: { userId },
      relations: { decidedBy: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map(withDeciderName);
  }

  // Only the requests the actor may decide (not the whole company).
  async listPending(actor: AuthUser) {
    const rows = await this.absences.find({
      where: { status: RequestStatus.PENDING },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    return decidableBy(actor, rows).map(withRequester);
  }

  async decide(actor: AuthUser, id: string, dto: DecideDto) {
    const absence = await this.absences.findOne({ where: { id }, relations: { user: true } });
    const decided = applyDecision(actor, absence, dto);
    const { user, ...saved } = await this.absences.save(decided);
    return saved;
  }
}

@Controller('absences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsencesController {
  constructor(private readonly absences: AbsencesService) {}

  // Employee files for themselves.
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateAbsenceDto) {
    return this.absences.create(actor.id, dto);
  }

  @Get('pending')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  listPending(@CurrentUser() actor: AuthUser) {
    return this.absences.listPending(actor);
  }

  @Get('user/:userId')
  listForUser(@CurrentUser() actor: AuthUser, @Param('userId') userId: string) {
    return this.absences.listForUser(actor, userId);
  }

  @Patch(':id/decision')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  decide(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideDto,
  ) {
    return this.absences.decide(actor, id, dto);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Absence, User])],
  providers: [AbsencesService],
  controllers: [AbsencesController],
  exports: [AbsencesService],
})
export class AbsencesModule {}
