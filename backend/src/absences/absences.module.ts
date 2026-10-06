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
import { IsDateString, IsEnum, IsString } from 'class-validator';
import { Absence } from '../entities/absence.entity';
import { AbsenceStatus, Role } from '../entities/enums';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/scope';

class CreateAbsenceDto {
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsString() reason: string;
}
class DecideAbsenceDto {
  @IsEnum(AbsenceStatus) status: AbsenceStatus;
}

@Injectable()
export class AbsencesService {
  constructor(
    @InjectRepository(Absence)
    private readonly absences: Repository<Absence>,
  ) {}

  create(userId: string, dto: CreateAbsenceDto) {
    return this.absences.save(
      this.absences.create({
        userId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
      }),
    );
  }

  listForUser(userId: string) {
    return this.absences.find({
      where: { userId },
      order: { startDate: 'DESC' },
    });
  }

  async decide(id: string, status: AbsenceStatus) {
    const absence = await this.absences.findOne({ where: { id } });
    if (!absence) throw new NotFoundException('Absence not found');
    absence.status = status;
    return this.absences.save(absence);
  }
}

@Controller('absences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsencesController {
  constructor(private readonly absences: AbsencesService) {}

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateAbsenceDto) {
    return this.absences.create(actor.id, dto);
  }

  @Get('user/:userId')
  listForUser(@Param('userId') userId: string) {
    return this.absences.listForUser(userId);
  }

  @Patch(':id/decision')
  @Roles(Role.MANAGER, Role.ADMIN)
  decide(@Param('id') id: string, @Body() dto: DecideAbsenceDto) {
    return this.absences.decide(id, dto.status);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Absence])],
  providers: [AbsencesService],
  controllers: [AbsencesController],
})
export class AbsencesModule {}
