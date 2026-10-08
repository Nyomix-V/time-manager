import { KpiService, excusedDays } from './kpi.module';
import { WorkingTimesService } from '../workingtimes/workingtimes.service';
import { Absence } from '../entities/absence.entity';
import { Clock } from '../entities/clock.entity';
import { User } from '../entities/user.entity';
import { AbsenceType, ClockType, RequestStatus, Role } from '../entities/enums';
import { FakeRepository } from '../testing/fake-repository';
import { seedUsers } from '../testing/test-app';

describe('KpiService.report', () => {
  const day = (date: string, arrival: string, departure: string) => [
    { userId: 'empA', type: ClockType.IN, time: new Date(`${date}T${arrival}:00+02:00`) },
    { userId: 'empA', type: ClockType.OUT, time: new Date(`${date}T${departure}:00+02:00`) },
  ];

  function service(absences: Partial<Absence>[] = []) {
    const users = seedUsers();
    const clocks = new FakeRepository<Clock>().seed(
      ...day('2026-10-01', '09:30', '16:30'), // late, but excused below
      ...day('2026-10-02', '09:20', '16:20'), // late
      ...day('2026-10-05', '08:55', '15:55'), // on time
    );
    const absenceRepo = new FakeRepository<Absence>().seed(...absences);
    return new KpiService(
      users as any,
      clocks as any,
      absenceRepo as any,
      new WorkingTimesService(clocks as any),
    );
  }
  const admin = { id: 'admin', email: 'admin@test.fr', role: Role.ADMIN, branchId: null };
  const empARow = (report: any) => report.rows.find((r: any) => r.userId === 'empA');

  it('counts late days in Paris time and leaves the admin out', async () => {
    const report = await service().report(admin);
    expect(report.rows.map((r: any) => r.userId)).not.toContain('admin');
    expect(empARow(report)).toMatchObject({ workedDays: 3, lateDays: 2, totalHours: 21, weeklyHours: 21 });
  });

  it('does not count a late day covered by an approved absence', async () => {
    const absence = {
      userId: 'empA',
      type: AbsenceType.MEDICAL,
      startDate: new Date('2026-10-01T08:00:00+02:00'),
      endDate: new Date('2026-10-01T10:00:00+02:00'),
    };
    expect(empARow(await service([{ ...absence, status: RequestStatus.PENDING }]).report(admin)).lateDays).toBe(2);
    expect(empARow(await service([{ ...absence, status: RequestStatus.REJECTED }]).report(admin)).lateDays).toBe(2);
    expect(empARow(await service([{ ...absence, status: RequestStatus.APPROVED }]).report(admin)).lateDays).toBe(1);
  });

  it('computes the summary over the people who worked', async () => {
    const { summary } = await service().report(admin);
    // 2 late days out of 3 worked -> 33 % of the days started on time.
    expect(summary).toEqual({ people: 6, avgWeeklyHours: 21, punctualityPct: 33, alerts: 0 });
  });

  it("keeps a manager's report within their branch", async () => {
    const manager = { id: 'mgrB', email: 'mgrB@test.fr', role: Role.MANAGER, branchId: 'b2' };
    const report = await service().report(manager);
    expect(report.rows.map((r: any) => r.userId).sort()).toEqual(['empB', 'mgrB']);
    expect(report.summary.punctualityPct).toBe(100); // nobody worked
  });
});

describe('excusedDays', () => {
  it('expands approved absences to every Paris day they touch', () => {
    const days = excusedDays([
      { status: RequestStatus.APPROVED, startDate: new Date('2026-10-05T08:00:00+02:00'), endDate: new Date('2026-10-07T18:00:00+02:00') },
      { status: RequestStatus.PENDING, startDate: new Date('2026-10-12T08:00:00+02:00'), endDate: new Date('2026-10-12T18:00:00+02:00') },
    ]);
    expect([...days].sort()).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
  });
});
