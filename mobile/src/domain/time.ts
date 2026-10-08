// Calculs d'heures : fonctions pures, utilisées par les écrans ET par le faux backend du mode démo,
// pour que les chiffres soient toujours calculés de la même façon.
// Tout est en heure LOCALE du téléphone (le backend actuel calcule en UTC, voir mobile/API.md).
import type { Clock, ClockType, User } from '@/api/types';

/** Planning d'un salarié. workDays : 1 = lundi … 7 = dimanche. La fin de journée se calcule, elle n'est pas stockée. */
export type Planning = { workDays: number[]; startMin: number; dailyMinutes: number; breakMinutes: number };

/** Le backend stocke le planning sur l'utilisateur. */
export const planningOf = (u: User): Planning => ({
  workDays: u.workingDays.split(',').map(Number).filter((d) => d >= 1 && d <= 7),
  startMin: u.expectedStartMin,
  dailyMinutes: u.workMinutesPerDay,
  breakMinutes: u.breakMinutes,
});

/** Planning au format du backend, pour PUT /users/:id. */
export const planningFields = (p: Planning) => ({
  workingDays: [...p.workDays].sort().join(','),
  expectedStartMin: p.startMin,
  workMinutesPerDay: p.dailyMinutes,
  breakMinutes: p.breakMinutes,
});

// Un retard commence dès la première minute après l'heure prévue.
export const LATE_TOLERANCE_MIN = 0;

const MINUTE = 60_000;
export const pad = (n: number) => String(n).padStart(2, '0');

// ---- Dates ----

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** 1 = lundi … 7 = dimanche */
export const isoWeekday = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());
export const startOfWeek = (d: Date) => addDays(startOfDay(d), 1 - isoWeekday(d));
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// ---- Affichage ----

export const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const formatMinutesOfDay = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

/** 425 → « 7 h 05 », 45 → « 45 min » */
export function formatDuration(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  return hours === 0 ? `${total % 60} min` : `${hours} h ${pad(total % 60)}`;
}

export const formatDay = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
export const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
export const formatDateRange = (from: Date, to: Date) =>
  isSameDay(from, to) ? formatDate(from) : `${formatDate(from)} → ${formatDate(to)}`;

// ---- Planning ----

export const expectedEndMin = (p: Planning) => p.startMin + p.dailyMinutes + p.breakMinutes;
export const plannedWeeklyMinutes = (p: Planning) => p.dailyMinutes * p.workDays.length;
export const isWorkDay = (p: Planning, d: Date) => p.workDays.includes(isoWeekday(d));
export const formatWorkDays = (days: number[]) => [...days].sort().map((d) => WEEKDAYS[d - 1]).join(' · ');

// ---- État du pointage ----

export type WorkState = 'NOT_STARTED' | 'WORKING' | 'ON_BREAK' | 'DONE';

export function workState(dayClocks: Clock[]): WorkState {
  switch (sortClocks(dayClocks).at(-1)?.type) {
    case 'IN':
    case 'BREAK_END':
      return 'WORKING';
    case 'BREAK_START':
      return 'ON_BREAK';
    case 'OUT':
      return 'DONE';
    default:
      return 'NOT_STARTED';
  }
}

// Pointages autorisés depuis chaque état (mêmes règles que ClocksService.allowed dans le backend).
// Pendant une pause, on ne peut que la terminer ; après un départ, une nouvelle arrivée est possible.
export const NEXT_CLOCKS: Record<WorkState, ClockType[]> = {
  NOT_STARTED: ['IN'],
  WORKING: ['BREAK_START', 'OUT'],
  ON_BREAK: ['BREAK_END'],
  DONE: ['IN'],
};

// ---- Résumé d'une journée ----

export type DaySummary = {
  key: string;
  date: Date;
  arrival: Date | null;
  departure: Date | null;
  workedMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  state: WorkState;
  /** Journée passée restée ouverte : oubli de pointage. */
  incomplete: boolean;
};

export const sortClocks = (clocks: Clock[]) => [...clocks].sort((a, b) => a.time.localeCompare(b.time));

/** Les pauses ne sont pas comptées dans le temps travaillé. Pour aujourd'hui, le compteur court jusqu'à `now`. */
export function summarizeDay(dayClocks: Clock[], planning: Planning | null, now = new Date()): DaySummary {
  const clocks = sortClocks(dayClocks);
  let worked = 0;
  let breaks = 0;
  let workStart: Date | null = null;
  let breakStart: Date | null = null;
  let arrival: Date | null = null;
  let departure: Date | null = null;

  for (const clock of clocks) {
    const t = new Date(clock.time);
    if (clock.type === 'IN') {
      arrival ??= t;
      workStart = t;
    } else if (clock.type === 'BREAK_START') {
      if (workStart) worked += t.getTime() - workStart.getTime();
      workStart = null;
      breakStart = t;
    } else if (clock.type === 'BREAK_END') {
      if (breakStart) breaks += t.getTime() - breakStart.getTime();
      breakStart = null;
      workStart = t;
    } else {
      if (workStart) worked += t.getTime() - workStart.getTime();
      if (breakStart) breaks += t.getTime() - breakStart.getTime();
      workStart = breakStart = null;
      departure = t;
    }
  }

  const date = clocks.length ? startOfDay(new Date(clocks[0].time)) : startOfDay(now);
  const today = isSameDay(date, now);
  if (today && workStart) worked += now.getTime() - workStart.getTime();
  if (today && breakStart) breaks += now.getTime() - breakStart.getTime();

  const arrivalMin = arrival ? minutesOfDay(arrival) : null;
  const lateMinutes =
    arrivalMin !== null && planning && arrivalMin > planning.startMin + LATE_TOLERANCE_MIN
      ? arrivalMin - planning.startMin
      : 0;

  return {
    key: dayKey(date),
    date,
    arrival,
    departure,
    workedMinutes: worked / MINUTE,
    breakMinutes: breaks / MINUTE,
    lateMinutes,
    state: workState(clocks),
    incomplete: !today && (workStart !== null || breakStart !== null),
  };
}

/** Une ligne par jour pointé, du plus récent au plus ancien. */
export function summarizeDays(clocks: Clock[], planning: Planning | null, now = new Date()): DaySummary[] {
  const byDay = new Map<string, Clock[]>();
  for (const clock of clocks) {
    const key = dayKey(new Date(clock.time));
    byDay.set(key, [...(byDay.get(key) ?? []), clock]);
  }
  return [...byDay.values()].map((day) => summarizeDay(day, planning, now)).sort((a, b) => b.key.localeCompare(a.key));
}

// ---- Statistiques d'une période ----

export type PeriodStats = {
  totalMinutes: number;
  workedDays: number;
  avgPerDayMinutes: number;
  avgPerWeekMinutes: number;
  lateDays: number;
  breakMinutes: number;
};

export function periodStats(days: DaySummary[]): PeriodStats {
  const worked = days.filter((d) => d.workedMinutes > 0);
  const totalMinutes = worked.reduce((sum, d) => sum + d.workedMinutes, 0);
  const weeks = new Set(worked.map((d) => dayKey(startOfWeek(d.date)))).size;
  return {
    totalMinutes,
    workedDays: worked.length,
    avgPerDayMinutes: worked.length ? totalMinutes / worked.length : 0,
    avgPerWeekMinutes: weeks ? totalMinutes / weeks : 0,
    lateDays: worked.filter((d) => d.lateMinutes > 0).length,
    breakMinutes: worked.reduce((sum, d) => sum + d.breakMinutes, 0),
  };
}

/** Une absence couvre-t-elle ce jour ? */
export const coversDay = (range: { startDate: string; endDate: string }, d: Date) =>
  startOfDay(new Date(range.startDate)) <= startOfDay(d) && startOfDay(d) <= startOfDay(new Date(range.endDate));
