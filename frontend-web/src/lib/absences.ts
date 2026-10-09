import { isSameDay } from 'date-fns';
import type { AbsenceType } from '@/api/types';
import { formatDateShort } from './format';

export const ABSENCE_TYPES: { value: AbsenceType; label: string }[] = [
  { value: 'SICK', label: 'Arrêt maladie' },
  { value: 'MEDICAL', label: 'Rendez-vous médical' },
  { value: 'LEAVE', label: 'Congé' },
  { value: 'MISSED_CLOCK', label: 'Oubli de pointage' },
  { value: 'OTHER', label: 'Autre' },
];

export const ABSENCE_LABELS = Object.fromEntries(ABSENCE_TYPES.map((t) => [t.value, t.label])) as Record<
  AbsenceType,
  string
>;

export function formatAbsenceRange(start: string, end: string) {
  return isSameDay(new Date(start), new Date(end))
    ? formatDateShort(start)
    : `${formatDateShort(start)} – ${formatDateShort(end)}`;
}
