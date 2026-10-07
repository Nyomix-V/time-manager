import { isSameDay } from 'date-fns';
import { formatDateShort } from './format';

export const ABSENCE_REASONS = [
  'Arrêt maladie',
  'Rendez-vous médical',
  'Congé',
  'Oubli de pointage',
  'Autre',
] as const;

export function formatAbsenceRange(start: string, end: string) {
  return isSameDay(new Date(start), new Date(end))
    ? formatDateShort(start)
    : `${formatDateShort(start)} – ${formatDateShort(end)}`;
}

/** The backend stores a single `reason` string: "Motif — commentaire". */
export function splitReason(reason: string): { motif: string; comment?: string } {
  const [motif, ...rest] = reason.split(' — ');
  return { motif, comment: rest.join(' — ') || undefined };
}
