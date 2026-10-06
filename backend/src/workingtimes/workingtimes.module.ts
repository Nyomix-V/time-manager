import {
  Module,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Clock } from '../entities/clock.entity';
import { WorkingTimesService } from './workingtimes.service';
import { JwtAuthGuard } from '../auth/guards';

@Controller('workingtimes')
@UseGuards(JwtAuthGuard)
export class WorkingTimesController {
  constructor(private readonly wt: WorkingTimesService) {}

  // GET /workingtimes/:userId?from=2026-10-01&to=2026-10-31
  @Get(':userId')
  summary(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.wt.summary(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Clock])],
  providers: [WorkingTimesService],
  controllers: [WorkingTimesController],
  exports: [WorkingTimesService],
})
export class WorkingTimesModule {}
