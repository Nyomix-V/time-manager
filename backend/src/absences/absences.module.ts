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
  NotFoundException,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Absence } from '../entities/absence.entity';
import { AbsenceType, RequestStatus, Role } from '../entities/enums';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/scope';

class CreateAbsenceDto {
  @IsEnum(AbsenceType) type: AbsenceType;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsString() attachmentPath?: string;
}
class DecideDto {
  @IsEnum(RequestStatus) status: RequestStatus; // APPROVED | REJECTED
  @IsOptional() @IsString() decisionComment?: string;
}

@Injectable()
export class AbsencesService {
  constructor(
    @InjectRepository(Absence) private readonly absences: Repository<Absence>,
  ) {}

  create(userId: string, dto: CreateAbsenceDto) {
    return this.absences.save(
      this.absences.create({
        userId,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        comment: dto.comment,
        attachmentPath: dto.attachmentPath,
      }),
    );
  }

  listForUser(userId: string) {
    return this.absences.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  listPending() {
    return this.absences.find({
      where: { status: RequestStatus.PENDING },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async decide(id: string, deciderId: string, dto: DecideDto) {
    const absence = await this.absences.findOne({ where: { id } });
    if (!absence) throw new NotFoundException('Absence not found');
    absence.status = dto.status;
    absence.decidedById = deciderId;
    absence.decisionComment = dto.decisionComment;
    absence.decidedAt = new Date();
    return this.absences.save(absence);
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
  listPending() {
    return this.absences.listPending();
  }

  @Get('user/:userId')
  listForUser(@Param('userId') userId: string) {
    return this.absences.listForUser(userId);
  }

  @Patch(':id/decision')
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  decide(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideDto,
  ) {
    return this.absences.decide(id, actor.id, dto);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Absence])],
  providers: [AbsencesService],
  controllers: [AbsencesController],
})
export class AbsencesModule {}
