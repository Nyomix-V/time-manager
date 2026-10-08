// Planning d'un salarié (jours, arrivée, temps de travail, pause), dans les formulaires de création et de modification.
// La fin de journée n'est pas saisie : elle se calcule.
import { Text } from 'react-native';

import { expectedEndMin, formatDuration, formatMinutesOfDay, minutesOfDay, plannedWeeklyMinutes, type Planning } from '@/domain/time';
import { Chips, DateField, DaysPicker } from './forms';
import { Banner, text } from './ui';

const DAILY_OPTIONS = [360, 420, 450, 480].map((value) => ({ value, label: formatDuration(value) }));
const BREAK_OPTIONS = [30, 45, 60].map((value) => ({ value, label: formatDuration(value) }));

/** Planning proposé à la création : du lundi au vendredi, 9 h, 7 h de travail, 45 min de pause. */
export const DEFAULT_PLANNING: Planning = { workDays: [1, 2, 3, 4, 5], startMin: 540, dailyMinutes: 420, breakMinutes: 45 };

export function PlanningFields({ value, onChange }: { value: Planning; onChange: (planning: Planning) => void }) {
  const set = (changes: Partial<Planning>) => onChange({ ...value, ...changes });
  const startDate = new Date();
  startDate.setHours(Math.floor(value.startMin / 60), value.startMin % 60, 0, 0);

  return (
    <>
      <Text style={[text.h2, { marginTop: 6 }]}>Planning</Text>
      <DaysPicker value={value.workDays} onChange={(workDays) => set({ workDays })} />
      <DateField label="Heure d'arrivée" mode="time" value={startDate} onChange={(d) => set({ startMin: minutesOfDay(d) })} />
      <Chips label="Travail par jour" options={DAILY_OPTIONS} value={value.dailyMinutes} onChange={(dailyMinutes) => set({ dailyMinutes })} />
      <Chips label="Pause" options={BREAK_OPTIONS} value={value.breakMinutes} onChange={(breakMinutes) => set({ breakMinutes })} />
      <Banner icon="info">
        Fin de journée : {formatMinutesOfDay(expectedEndMin(value))} · {formatDuration(plannedWeeklyMinutes(value))} par semaine (calculé
        automatiquement).
      </Banner>
    </>
  );
}
