import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clock } from '../entities/clock.entity';
import { ClockStatus } from '../entities/enums';
import { JwtAuthGuard } from '../auth/guards';

@Injectable()
export class ClocksService {
  constructor(
    @InjectRepository(Clock)
    private readonly clocks: Repository<Clock>,
  ) {}

  // Toggle: if last clock was IN -> next is OUT, else IN.
  async toggle(userId: string) {
    const last = await this.clocks.findOne({
      where: { userId },
      order: { time: 'DESC' },
    });
    const status =
      last?.status === ClockStatus.IN ? ClockStatus.OUT : ClockStatus.IN;
    return this.clocks.save(
      this.clocks.create({ userId, status, time: new Date() }),
    );
  }

  list(userId: string) {
    return this.clocks.find({ where: { userId }, order: { time: 'ASC' } });
  }
}

@Controller('clocks')
@UseGuards(JwtAuthGuard)
export class ClocksController {
  constructor(private readonly clocks: ClocksService) {}

  @Post(':userId')
  toggle(@Param('userId') userId: string) {
    return this.clocks.toggle(userId);
  }

  @Get(':userId')
  list(@Param('userId') userId: string) {
    return this.clocks.list(userId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Clock])],
  providers: [ClocksService],
  controllers: [ClocksController],
  exports: [ClocksService],
})
export class ClocksModule {}
