import { WorkingTimesService } from './workingtimes.service';

// Hour-count logic is business-critical (strikes!) -> tested hard, breaks included.
describe('WorkingTimesService.compute', () => {
  const d = (s: string) => new Date(s);

  it('sums a single IN/OUT pair', () => {
    const r = WorkingTimesService.compute([
      { type: 'IN', time: d('2026-10-01T09:00:00Z') },
      { type: 'OUT', time: d('2026-10-01T17:00:00Z') },
    ]);
    expect(r.totalHours).toBe(8);
    expect(r.breakMinutes).toBe(0);
  });

  it('subtracts a break from worked time', () => {
    const r = WorkingTimesService.compute([
      { type: 'IN', time: d('2026-10-01T09:00:00Z') },
      { type: 'BREAK_START', time: d('2026-10-01T12:00:00Z') },
      { type: 'BREAK_END', time: d('2026-10-01T12:45:00Z') },
      { type: 'OUT', time: d('2026-10-01T17:00:00Z') },
    ]);
    // 09->12 = 3h, 12:45->17 = 4h15 => 7h15 worked ; 45min break.
    expect(r.totalHours).toBe(7.25);
    expect(r.breakMinutes).toBe(45);
  });

  it('handles multiple days', () => {
    const r = WorkingTimesService.compute([
      { type: 'IN', time: d('2026-10-01T09:00:00Z') },
      { type: 'OUT', time: d('2026-10-01T16:00:00Z') },
      { type: 'IN', time: d('2026-10-02T08:00:00Z') },
      { type: 'OUT', time: d('2026-10-02T16:30:00Z') },
    ]);
    expect(r.totalHours).toBe(15.5);
    expect(r.perDay).toEqual([
      { date: '2026-10-01', hours: 7 },
      { date: '2026-10-02', hours: 8.5 },
    ]);
  });

  it('ignores a dangling IN with no OUT', () => {
    const r = WorkingTimesService.compute([
      { type: 'IN', time: d('2026-10-01T09:00:00Z') },
    ]);
    expect(r.totalHours).toBe(0);
  });

  it('returns empty for no clocks', () => {
    expect(WorkingTimesService.compute([])).toEqual({
      totalHours: 0,
      breakMinutes: 0,
      perDay: [],
    });
  });
});
