// A "retard" = the first IN of a day happens after the user's expected start.
// Pure function -> unit-testable without a DB.
export type ClockLike = {
  time: Date;
  type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
};

export function countLateDays(
  clocks: ClockLike[],
  expectedStartMin: number,
): number {
  const firstInByDay = new Map<string, Date>();

  for (const c of clocks) {
    if (c.type !== 'IN') continue;
    const day = c.time.toISOString().slice(0, 10);
    const existing = firstInByDay.get(day);
    if (!existing || c.time < existing) {
      firstInByDay.set(day, c.time);
    }
  }

  let late = 0;
  for (const firstIn of firstInByDay.values()) {
    const minutes = firstIn.getUTCHours() * 60 + firstIn.getUTCMinutes();
    if (minutes > expectedStartMin) late++;
  }
  return late;
}
