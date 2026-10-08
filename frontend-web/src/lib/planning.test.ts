import {
  DEFAULT_PLANNING,
  describePlanning,
  isWorkingDay,
  parseDays,
  plannedEndMin,
  serializeDays,
  weeklyHours,
} from './planning';

describe('planning', () => {
  it('parses and serializes worked days', () => {
    expect(parseDays('1,2,3,4,5')).toEqual([1, 2, 3, 4, 5]);
    expect(parseDays('')).toEqual([]);
    expect(serializeDays([5, 1, 3, 1])).toBe('1,3,5');
  });

  it('computes the planned end of day: arrival + work + break', () => {
    expect(plannedEndMin(DEFAULT_PLANNING)).toBe(16 * 60 + 45); // 09:00 + 7 h + 45 min
  });

  it('computes weekly hours from days and daily work', () => {
    expect(weeklyHours(DEFAULT_PLANNING)).toBe(35);
    expect(weeklyHours({ ...DEFAULT_PLANNING, workingDays: '1,2,3', workMinutesPerDay: 480 })).toBe(24);
  });

  it('describes the planning like the mockup', () => {
    expect(describePlanning(DEFAULT_PLANNING)).toBe('lun → ven · 09:00 → 16:45 · 7 h / jour · pause 45 min');
    expect(describePlanning({ ...DEFAULT_PLANNING, workingDays: '1,3' })).toMatch(/^lun, mer ·/);
  });

  it('knows working days (ISO numbering, Monday = 1)', () => {
    expect(isWorkingDay(DEFAULT_PLANNING, new Date('2026-10-05T12:00:00'))).toBe(true); // Monday
    expect(isWorkingDay(DEFAULT_PLANNING, new Date('2026-10-04T12:00:00'))).toBe(false); // Sunday
  });
});
