import { Clock, Coffee } from 'lucide-react';
import type { Planning } from '@/api/types';
import { formatHours, minutesToTime, timeToMinutes } from '@/lib/format';
import { parseDays, plannedEndMin, serializeDays, weeklyHours, WEEKDAYS } from '@/lib/planning';
import { cn } from '@/lib/utils';
import { Field } from '../Field';
import { Input, Select } from '../ui/input';

const WORK_OPTIONS = [210, 240, 300, 360, 420, 450, 480]; // minutes
const BREAK_OPTIONS = [0, 15, 30, 45, 60, 90];

/** Planning of a person (mockup 09): worked days, arrival, daily work, break, with the computed end of day. */
export function PlanningFields({ value, onChange }: { value: Planning; onChange: (p: Planning) => void }) {
  const days = parseDays(value.workingDays);
  const toggleDay = (iso: number) =>
    onChange({
      ...value,
      workingDays: serializeDays(days.includes(iso) ? days.filter((d) => d !== iso) : [...days, iso]),
    });

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-medium">
          Jours travaillés{' '}
          <span className="text-danger" aria-hidden>
            *
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => {
            const on = days.includes(d.iso);
            return (
              <button
                key={d.iso}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(d.iso)}
                className={cn(
                  'grid h-10 w-11 cursor-pointer place-items-center rounded-md border text-[13px] font-semibold',
                  on ? 'border-primary bg-primary text-white' : 'border-border bg-white text-muted',
                )}
              >
                {d.short}
              </button>
            );
          })}
        </div>
        {days.length === 0 && (
          <span role="alert" className="text-xs text-danger">
            Choisissez au moins un jour.
          </span>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={
            <>
              <Clock className="mr-1 inline size-3.5" aria-hidden />
              Heure d'arrivée
            </>
          }
          required
        >
          <Input
            type="time"
            value={minutesToTime(value.expectedStartMin)}
            onChange={(e) =>
              e.target.value && onChange({ ...value, expectedStartMin: timeToMinutes(e.target.value) })
            }
          />
        </Field>
        <Field label="Travail par jour" required>
          <Select
            value={value.workMinutesPerDay}
            onChange={(e) => onChange({ ...value, workMinutesPerDay: Number(e.target.value) })}
          >
            {[...new Set([...WORK_OPTIONS, value.workMinutesPerDay])]
              .sort((a, b) => a - b)
              .map((m) => (
                <option key={m} value={m}>
                  {formatHours(m / 60)}
                </option>
              ))}
          </Select>
        </Field>
        <Field
          label={
            <>
              <Coffee className="mr-1 inline size-3.5" aria-hidden />
              Temps de pause
            </>
          }
          required
        >
          <Select
            value={value.breakMinutes}
            onChange={(e) => onChange({ ...value, breakMinutes: Number(e.target.value) })}
          >
            {[...new Set([...BREAK_OPTIONS, value.breakMinutes])]
              .sort((a, b) => a - b)
              .map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
          </Select>
        </Field>
      </div>

      <div
        aria-live="polite"
        className="flex flex-wrap gap-6 rounded-md bg-primary-soft px-4 py-3.5 text-[13px] text-primary"
      >
        <div>
          Fin de journée prévue
          <strong className="block text-lg text-text">{minutesToTime(plannedEndMin(value))}</strong>
        </div>
        <div>
          Heures par semaine
          <strong className="block text-lg text-text">{formatHours(weeklyHours(value))}</strong>
        </div>
      </div>
    </div>
  );
}
