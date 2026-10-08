import type { Planning } from '@/api/types';
import { formatHours, minutesToTime } from './format';

export const WEEKDAYS = [
  { iso: 1, short: 'Lun', letter: 'L' },
  { iso: 2, short: 'Mar', letter: 'M' },
  { iso: 3, short: 'Mer', letter: 'M' },
  { iso: 4, short: 'Jeu', letter: 'J' },
  { iso: 5, short: 'Ven', letter: 'V' },
  { iso: 6, short: 'Sam', letter: 'S' },
  { iso: 7, short: 'Dim', letter: 'D' },
] as const;

export const DEFAULT_PLANNING: Planning = {
  workingDays: '1,2,3,4,5',
  expectedStartMin: 540,
  workMinutesPerDay: 420,
  breakMinutes: 45,
};

/** "1,2,3,4,5" -> [1, 2, 3, 4, 5] */
export function parseDays(workingDays: string): number[] {
  return workingDays
    .split(',')
    .map(Number)
    .filter((d) => d >= 1 && d <= 7);
}

export function serializeDays(days: number[]): string {
  return [...new Set(days)].sort().join(',');
}

/** Planned end of the day: arrival + work + break. */
export function plannedEndMin(p: Planning): number {
  return p.expectedStartMin + p.workMinutesPerDay + p.breakMinutes;
}

export function weeklyHours(p: Planning): number {
  return (p.workMinutesPerDay / 60) * parseDays(p.workingDays).length;
}

/** "lun → ven · 09:00 → 16:45 · 7 h / jour · pause 45 min" */
export function describePlanning(p: Planning): string {
  const days = parseDays(p.workingDays);
  const first = WEEKDAYS.find((d) => d.iso === days[0])?.short.toLowerCase();
  const last = WEEKDAYS.find((d) => d.iso === days.at(-1))?.short.toLowerCase();
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  const dayText =
    days.length === 0
      ? 'aucun jour'
      : contiguous && days.length > 1
        ? `${first} → ${last}`
        : days.map((d) => WEEKDAYS[d - 1].short.toLowerCase()).join(', ');
  return `${dayText} · ${minutesToTime(p.expectedStartMin)} → ${minutesToTime(plannedEndMin(p))} · ${formatHours(p.workMinutesPerDay / 60)} / jour · pause ${p.breakMinutes} min`;
}

/** Is `date` a working day of this planning? */
export function isWorkingDay(p: Planning, date: Date): boolean {
  const iso = ((date.getDay() + 6) % 7) + 1; // JS: 0 = Sunday
  return parseDays(p.workingDays).includes(iso);
}
