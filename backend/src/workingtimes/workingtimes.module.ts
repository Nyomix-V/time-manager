import {
  Module,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clock } from '../entities/clock.entity';
import { User } from '../entities/user.entity';
import { WorkingTimesService } from './workingtimes.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/scope';
import { loadReadableUser } from '../auth/access';

@Controller('workingtimes')
@UseGuards(JwtAuthGuard)
export class WorkingTimesController {
  constructor(
    private readonly wt: WorkingTimesService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // GET /workingtimes/:userId?from=2026-10-01&to=2026-10-31
  @Get(':userId')
  async summary(
    @CurrentUser() actor: AuthUser,
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await loadReadableUser(this.users, actor, userId);
    return this.wt.summary(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Clock, User])],
  providers: [WorkingTimesService],
  controllers: [WorkingTimesController],
  exports: [WorkingTimesService],
})
export class WorkingTimesModule {}
