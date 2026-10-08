import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clock } from '../entities/clock.entity';
import { User } from '../entities/user.entity';
import { ClockType, Role } from '../entities/enums';
import { JwtAuthGuard } from '../auth/guards';

@Injectable()
export class ClocksService {
  constructor(
    @InjectRepository(Clock) private readonly clocks: Repository<Clock>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  private lastEvent(userId: string) {
    return this.clocks.findOne({ where: { userId }, order: { time: 'DESC' } });
  }

  // Valid transitions of the IN/BREAK/OUT state machine.
  private allowed(last: ClockType | null, next: ClockType): boolean {
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

  async punch(userId: string, type: ClockType) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    // Mockup page 18: the admin does not clock in.
    if (user.role === Role.ADMIN) {
      throw new BadRequestException('Admins do not clock in');
    }
    const last = await this.lastEvent(userId);
    if (!this.allowed(last?.type ?? null, type)) {
      throw new BadRequestException(
        `Invalid transition: last=${last?.type ?? 'none'} next=${type}`,
      );
    }
    return this.clocks.save(
      this.clocks.create({ userId, type, time: new Date() }),
    );
  }

  // Derived real-time status (mockup: En poste / En pause / Pas pointé).
  async status(userId: string) {
    const last = await this.lastEvent(userId);
    let state: 'OUT' | 'WORKING' | 'ON_BREAK' = 'OUT';
    if (last?.type === ClockType.IN || last?.type === ClockType.BREAK_END) {
      state = 'WORKING';
    } else if (last?.type === ClockType.BREAK_START) {
      state = 'ON_BREAK';
    }
    return { state, since: last?.time ?? null };
  }

  list(userId: string) {
    return this.clocks.find({ where: { userId }, order: { time: 'ASC' } });
  }
}

@Controller('clocks')
@UseGuards(JwtAuthGuard)
export class ClocksController {
  constructor(private readonly clocks: ClocksService) {}

  @Post(':userId/arrive')
  arrive(@Param('userId') userId: string) {
    return this.clocks.punch(userId, ClockType.IN);
  }

  @Post(':userId/break/start')
  breakStart(@Param('userId') userId: string) {
    return this.clocks.punch(userId, ClockType.BREAK_START);
  }

  @Post(':userId/break/end')
  breakEnd(@Param('userId') userId: string) {
    return this.clocks.punch(userId, ClockType.BREAK_END);
  }

  @Post(':userId/depart')
  depart(@Param('userId') userId: string) {
    return this.clocks.punch(userId, ClockType.OUT);
  }

  @Get(':userId/status')
  getStatus(@Param('userId') userId: string) {
    return this.clocks.status(userId);
  }

  @Get(':userId')
  list(@Param('userId') userId: string) {
    return this.clocks.list(userId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Clock, User])],
  providers: [ClocksService],
  controllers: [ClocksController],
  exports: [ClocksService],
})
export class ClocksModule {}
