import {
  Module,
  Injectable,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Branch } from '../entities/branch.entity';
import { Clock } from '../entities/clock.entity';
import { Role } from '../entities/enums';
import { WorkingTimesService } from '../workingtimes/workingtimes.service';
import { WorkingTimesModule } from '../workingtimes/workingtimes.module';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/scope';
import { countLateDays } from './lateness';

const WEEKLY_LEGAL_HOURS = 35; // legal weekly threshold (France ~ 35h)
const LATE_ALERT_THRESHOLD = 3; // alert if more lateness than this per period

interface KpiRow {
  userId: string;
  name: string;
  totalHours: number;
  overtimeHours: number; // KPI 1
  avgDailyHours: number; // KPI 2
  lateDays: number; // KPI 3
  lateAlert: boolean; // manager story: alert on too many retards
}

@Injectable()
export class KpiService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Clock) private readonly clocks: Repository<Clock>,
    private readonly wt: WorkingTimesService,
  ) {}

  // Report scoped to the actor: manager -> own branch, admin -> everyone.
  async report(actor: AuthUser, from?: Date, to?: Date) {
    const users =
      actor.role === Role.ADMIN
        ? await this.users.find()
        : await this.users.find({
            where: { branchId: actor.branchId ?? undefined },
          });

    let timeFilter;
    if (from && to) timeFilter = Between(from, to);
    else if (from) timeFilter = MoreThanOrEqual(from);
    else if (to) timeFilter = LessThanOrEqual(to);

    const rows: KpiRow[] = [];
    for (const u of users) {
      const { totalHours, perDay } = await this.wt.summary(u.id, from, to);

      const weeks = Math.max(1, perDay.length / 5);
      const overtime = Math.max(0, totalHours - WEEKLY_LEGAL_HOURS * weeks);
      const avgDaily = perDay.length > 0 ? totalHours / perDay.length : 0;

      const branch = u.branchId
        ? await this.branches.findOne({ where: { id: u.branchId } })
        : null;
      const clocks = await this.clocks.find({
        where: timeFilter ? { userId: u.id, time: timeFilter } : { userId: u.id },
        order: { time: 'ASC' },
      });
      const lateDays = countLateDays(clocks, branch?.expectedStartMin ?? 540);

      rows.push({
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`,
        totalHours,
        overtimeHours: round2(overtime),
        avgDailyHours: round2(avgDaily),
        lateDays,
        lateAlert: lateDays > LATE_ALERT_THRESHOLD,
      });
    }
    return { from, to, kpis: ['overtime', 'avgDailyHours', 'lateDays'], rows };
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

@Controller('kpi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KpiController {
  constructor(private readonly kpi: KpiService) {}

  @Get('report')
  @Roles(Role.MANAGER, Role.ADMIN)
  report(
    @CurrentUser() actor: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.kpi.report(
      actor,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Branch, Clock]),
    WorkingTimesModule,
  ],
  providers: [KpiService],
  controllers: [KpiController],
})
export class KpiModule {}
