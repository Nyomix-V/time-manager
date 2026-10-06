import { WorkingTimesService } from './workingtimes.service';

// The hour-count logic is the business-critical part (strikes!), so test it hard.
describe('WorkingTimesService.compute', () => {
  const d = (s: string) => new Date(s);

  it('sums a single IN/OUT pair', () => {
    const r = WorkingTimesService.compute([
      { status: 'IN', time: d('2026-10-01T09:00:00Z') },
      { status: 'OUT', time: d('2026-10-01T17:00:00Z') },
    ]);
    expect(r.totalHours).toBe(8);
    expect(r.perDay).toEqual([{ date: '2026-10-01', hours: 8 }]);
  });

  it('handles several pairs across days', () => {
    const r = WorkingTimesService.compute([
      { status: 'IN', time: d('2026-10-01T09:00:00Z') },
      { status: 'OUT', time: d('2026-10-01T12:00:00Z') },
      { status: 'IN', time: d('2026-10-01T13:00:00Z') },
      { status: 'OUT', time: d('2026-10-01T17:00:00Z') },
      { status: 'IN', time: d('2026-10-02T08:00:00Z') },
      { status: 'OUT', time: d('2026-10-02T16:30:00Z') },
    ]);
    expect(r.totalHours).toBe(15.5);
    expect(r.perDay).toEqual([
      { date: '2026-10-01', hours: 7 },
      { date: '2026-10-02', hours: 8.5 },
    ]);
  });

  it('ignores a dangling IN with no OUT', () => {
    const r = WorkingTimesService.compute([
      { status: 'IN', time: d('2026-10-01T09:00:00Z') },
    ]);
    expect(r.totalHours).toBe(0);
  });

  it('ignores an OUT with no preceding IN', () => {
    const r = WorkingTimesService.compute([
      { status: 'OUT', time: d('2026-10-01T17:00:00Z') },
    ]);
    expect(r.totalHours).toBe(0);
  });

  it('returns empty for no clocks', () => {
    expect(WorkingTimesService.compute([])).toEqual({
      totalHours: 0,
      perDay: [],
    });
  });
});
