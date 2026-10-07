import {
  Module,
  Injectable,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { User } from '../entities/user.entity';
import { Clock } from '../entities/clock.entity';
import { Role } from '../entities/enums';
import { WorkingTimesService } from '../workingtimes/workingtimes.service';
import { WorkingTimesModule } from '../workingtimes/workingtimes.module';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/scope';
import { countLateDays } from './lateness';

const WEEKLY_LEGAL_HOURS = 35; // legal weekly threshold (France ~ 35h)
const LATE_ALERT_THRESHOLD = 3; // mockup: "Seuil de 3 dépassé"

interface KpiRow {
  userId: string;
  name: string;
  branchId?: string | null;
  teamId?: string | null;
  totalHours: number;
  avgDailyHours: number;
  overtimeHours: number;
  breakMinutes: number;
  lateDays: number;
  lateAlert: boolean;
}

@Injectable()
export class KpiService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Clock) private readonly clocks: Repository<Clock>,
    private readonly wt: WorkingTimesService,
  ) {}

  // Per-user KPI rows, scoped: manager/directeur -> own branch, admin -> all.
  // Optional teamId filter (for a team dashboard).
  async report(actor: AuthUser, from?: Date, to?: Date, teamId?: string) {
    const where: any = {};
    if (actor.role !== Role.ADMIN) where.branchId = actor.branchId ?? undefined;
    if (teamId) where.teamId = teamId;
    const users = await this.users.find({ where });

    let timeFilter;
    if (from && to) timeFilter = Between(from, to);
    else if (from) timeFilter = MoreThanOrEqual(from);
    else if (to) timeFilter = LessThanOrEqual(to);

    const rows: KpiRow[] = [];
    for (const u of users) {
      const { totalHours, perDay, breakMinutes } = await this.wt.summary(u.id, from, to);
      const weeks = Math.max(1, perDay.length / 5);
      const overtime = Math.max(0, totalHours - WEEKLY_LEGAL_HOURS * weeks);
      const avgDaily = perDay.length > 0 ? totalHours / perDay.length : 0;

      const clocks = await this.clocks.find({
        where: timeFilter ? { userId: u.id, time: timeFilter } : { userId: u.id },
        order: { time: 'ASC' },
      });
      const lateDays = countLateDays(clocks, u.expectedStartMin ?? 540);

      rows.push({
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`,
        branchId: u.branchId,
        teamId: u.teamId,
        totalHours,
        avgDailyHours: round2(avgDaily),
        overtimeHours: round2(overtime),
        breakMinutes,
        lateDays,
        lateAlert: lateDays > LATE_ALERT_THRESHOLD,
      });
    }

    // Aggregate for a branch/team dashboard header (mockup pages 14/18).
    const totalDays = rows.reduce((s, r) => s + (r.avgDailyHours > 0 ? 1 : 0), 0);
    const summary = {
      people: rows.length,
      avgWeeklyHours: round2(
        rows.reduce((s, r) => s + r.avgDailyHours * 5, 0) / Math.max(1, rows.length),
      ),
      punctualityPct:
        rows.length === 0
          ? 100
          : Math.round(
              (rows.filter((r) => !r.lateAlert).length / rows.length) * 100,
            ),
      alerts: rows.filter((r) => r.lateAlert).length,
    };

    return { from, to, teamId, summary, rows };
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
  @Roles(Role.MANAGER, Role.DIRECTEUR, Role.ADMIN)
  report(
    @CurrentUser() actor: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.kpi.report(
      actor,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      teamId,
    );
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([User, Clock]), WorkingTimesModule],
  providers: [KpiService],
  controllers: [KpiController],
})
export class KpiModule {}
