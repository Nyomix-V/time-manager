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
import { Absence } from '../entities/absence.entity';
import { RequestStatus, Role } from '../entities/enums';
import { WorkingTimesService } from '../workingtimes/workingtimes.service';
import { WorkingTimesModule } from '../workingtimes/workingtimes.module';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/scope';
import { businessDaysBetween } from '../common/time';
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
  workedDays: number;
  lateDays: number;
  lateAlert: boolean;
  weeklyHours: number; // average per week, given the user's own working days
}

/** Days covered by the user's approved absences: no lateness counted on them. */
export function excusedDays(absences: Pick<Absence, 'startDate' | 'endDate' | 'status'>[]): Set<string> {
  const days = new Set<string>();
  for (const a of absences) {
    if (a.status !== RequestStatus.APPROVED) continue;
    for (const day of businessDaysBetween(new Date(a.startDate), new Date(a.endDate))) days.add(day);
  }
  return days;
}

@Injectable()
export class KpiService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Clock) private readonly clocks: Repository<Clock>,
    @InjectRepository(Absence) private readonly absences: Repository<Absence>,
    private readonly wt: WorkingTimesService,
  ) {}

  // Per-user KPI rows, scoped: manager/directeur -> own branch, admin -> all.
  // Optional teamId filter (for a team dashboard).
  async report(actor: AuthUser, from?: Date, to?: Date, teamId?: string) {
    const where: any = {};
    if (actor.role !== Role.ADMIN) where.branchId = actor.branchId ?? undefined;
    if (teamId) where.teamId = teamId;
    const users = (await this.users.find({ where })).filter((u) => u.role !== Role.ADMIN); // the admin does not clock in

    let timeFilter;
    if (from && to) timeFilter = Between(from, to);
    else if (from) timeFilter = MoreThanOrEqual(from);
    else if (to) timeFilter = LessThanOrEqual(to);

    const rows: KpiRow[] = [];
    for (const u of users) {
      const { totalHours, perDay, breakMinutes } = await this.wt.summary(u.id, from, to);
      const workedDays = perDay.length;
      const daysPerWeek = Math.max(1, (u.workingDays ?? '1,2,3,4,5').split(',').filter(Boolean).length);
      const weeks = Math.max(1, workedDays / daysPerWeek);
      const overtime = Math.max(0, totalHours - WEEKLY_LEGAL_HOURS * weeks);
      const avgDaily = workedDays > 0 ? totalHours / workedDays : 0;

      const [clocks, absences] = await Promise.all([
        this.clocks.find({
          where: timeFilter ? { userId: u.id, time: timeFilter } : { userId: u.id },
          order: { time: 'ASC' },
        }),
        this.absences.find({ where: { userId: u.id, status: RequestStatus.APPROVED } }),
      ]);
      const lateDays = countLateDays(clocks, u.expectedStartMin ?? 540, excusedDays(absences));

      rows.push({
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`,
        branchId: u.branchId,
        teamId: u.teamId,
        totalHours,
        avgDailyHours: round2(avgDaily),
        overtimeHours: round2(overtime),
        breakMinutes,
        workedDays,
        lateDays,
        lateAlert: lateDays > LATE_ALERT_THRESHOLD,
        weeklyHours: workedDays > 0 ? round2(totalHours / weeks) : 0,
      });
    }

    // Aggregate for a branch/team dashboard header (mockup pages 14/18).
    const active = rows.filter((r) => r.workedDays > 0);
    const workedDays = rows.reduce((s, r) => s + r.workedDays, 0);
    const lateDays = rows.reduce((s, r) => s + r.lateDays, 0);
    const summary = {
      people: rows.length,
      // Average weekly hours of the people who worked over the period.
      avgWeeklyHours: round2(active.reduce((s, r) => s + r.weeklyHours, 0) / Math.max(1, active.length)),
      // Share of worked days started on time (100 when nobody worked).
      punctualityPct: workedDays === 0 ? 100 : Math.round((1 - lateDays / workedDays) * 100),
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
  imports: [TypeOrmModule.forFeature([User, Clock, Absence]), WorkingTimesModule],
  providers: [KpiService],
  controllers: [KpiController],
})
export class KpiModule {}
