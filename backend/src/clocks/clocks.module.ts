import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Clock } from '../entities/clock.entity';
import { User } from '../entities/user.entity';
import { ClockType, Role } from '../entities/enums';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/scope';
import { loadReadableUser } from '../auth/access';
import { businessDay } from '../common/time';

@Injectable()
export class ClocksService {
  constructor(
    @InjectRepository(Clock) private readonly clocks: Repository<Clock>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  private lastEvent(userId: string) {
    return this.clocks.findOne({ where: { userId }, order: { time: 'DESC' } });
  }

  /** Last clock of TODAY (business time zone): each day starts fresh. */
  private async lastEventToday(userId: string, now: Date) {
    const last = await this.lastEvent(userId);
    return last && businessDay(last.time) === businessDay(now) ? last : null;
  }

  // Valid transitions of the IN/BREAK/OUT state machine, within one day.
  // A clock-out forgotten yesterday does not block today's arrival.
  static allowed(last: ClockType | null, next: ClockType): boolean {
    switch (next) {
      case ClockType.IN:
        return last === null || last === ClockType.OUT;
      case ClockType.BREAK_START:
        return last === ClockType.IN || last === ClockType.BREAK_END;
      case ClockType.BREAK_END:
        return last === ClockType.BREAK_START;
      case ClockType.OUT:
        return last === ClockType.IN || last === ClockType.BREAK_END;
    }
  }

  // Subject: "set the arrival / departure of the AUTHENTICATED user".
  async punch(actor: AuthUser, userId: string, type: ClockType) {
    if (actor.id !== userId) {
      throw new ForbiddenException('Vous ne pouvez pointer que pour vous-même');
    }
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    // Mockup page 18: the admin does not clock in.
    if (user.role === Role.ADMIN) {
      throw new BadRequestException("L'administrateur ne pointe pas");
    }
    const now = new Date();
    const last = await this.lastEventToday(userId, now);
    if (!ClocksService.allowed(last?.type ?? null, type)) {
      throw new BadRequestException(`Pointage impossible maintenant (dernier : ${last?.type ?? 'aucun'}, demandé : ${type})`);
    }
    return this.clocks.save(this.clocks.create({ userId, type, time: now }));
  }

  // Real-time status for TODAY (mockup: En poste / En pause / Pas pointé).
  // `since` keeps the last clock time, even from a previous day.
  async status(actor: AuthUser, userId: string) {
    await loadReadableUser(this.users, actor, userId);
    const now = new Date();
    const lastToday = await this.lastEventToday(userId, now);
    let state: 'OUT' | 'WORKING' | 'ON_BREAK' = 'OUT';
    if (lastToday?.type === ClockType.IN || lastToday?.type === ClockType.BREAK_END) {
      state = 'WORKING';
    } else if (lastToday?.type === ClockType.BREAK_START) {
      state = 'ON_BREAK';
    }
    const last = lastToday ?? (await this.lastEvent(userId));
    return { state, since: last?.time ?? null };
  }

  async list(actor: AuthUser, userId: string, from?: Date, to?: Date) {
    await loadReadableUser(this.users, actor, userId);
    let time;
    if (from && to) time = Between(from, to);
    else if (from) time = MoreThanOrEqual(from);
    else if (to) time = LessThanOrEqual(to);
    return this.clocks.find({ where: time ? { userId, time } : { userId }, order: { time: 'ASC' } });
  }
}

const parseDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`Date invalide : ${value}`);
  return date;
};

@Controller('clocks')
@UseGuards(JwtAuthGuard)
export class ClocksController {
  constructor(private readonly clocks: ClocksService) {}

  @Post(':userId/arrive')
  arrive(@CurrentUser() actor: AuthUser, @Param('userId') userId: string) {
    return this.clocks.punch(actor, userId, ClockType.IN);
  }

  @Post(':userId/break/start')
  breakStart(@CurrentUser() actor: AuthUser, @Param('userId') userId: string) {
    return this.clocks.punch(actor, userId, ClockType.BREAK_START);
  }

  @Post(':userId/break/end')
  breakEnd(@CurrentUser() actor: AuthUser, @Param('userId') userId: string) {
    return this.clocks.punch(actor, userId, ClockType.BREAK_END);
  }

  @Post(':userId/depart')
  depart(@CurrentUser() actor: AuthUser, @Param('userId') userId: string) {
    return this.clocks.punch(actor, userId, ClockType.OUT);
  }

  @Get(':userId/status')
  getStatus(@CurrentUser() actor: AuthUser, @Param('userId') userId: string) {
    return this.clocks.status(actor, userId);
  }

  // GET /clocks/:userId?from=2026-10-01T00:00:00Z&to=2026-10-31T23:59:59Z
  @Get(':userId')
  list(
    @CurrentUser() actor: AuthUser,
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.clocks.list(actor, userId, parseDate(from), parseDate(to));
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Clock, User])],
  providers: [ClocksService],
  controllers: [ClocksController],
  exports: [ClocksService],
})
export class ClocksModule {}
