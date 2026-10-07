import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Display helpers only: every business figure (hours, lateness...) comes from the API.

/** 7.0833 -> "7 h 05" ; 0 -> "0 h" ; -1.5 -> "−1 h 30" */
export function formatHours(hours: number): string {
  const sign = hours < 0 ? '−' : '';
  const totalMin = Math.round(Math.abs(hours) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${sign}${h} h`;
  return `${sign}${h} h ${String(m).padStart(2, '0')}`;
}

/** 45 -> "45 min" ; 65 -> "1 h 05" */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return formatHours(minutes / 60);
}

/** Minutes from midnight -> "09:00" (branch expectedStartMin). */
export function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** "09:00" -> 540 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), 'HH:mm');
}

/** "Lun 29" */
export function formatDayShort(date: Date | string): string {
  const s = format(new Date(date), 'EEE d', { locale: fr }).replace('.', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "8 oct." */
export function formatDateShort(date: Date | string): string {
  return format(new Date(date), 'd MMM', { locale: fr });
}

/** "Lundi 6 octobre 2026" */
export function formatDateLong(date: Date | string): string {
  const s = format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "d MMM 'à' HH:mm", { locale: fr });
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`;
}

export function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

export function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`;
}
