import { Calendar } from 'lucide-react';
import { endOfDay, startOfDay } from 'date-fns';
import { describeRange, toInputDate } from '@/lib/period';
import type { usePeriod } from '@/hooks/usePeriod';
import { Segmented } from './ui/segmented';
import { Input } from './ui/input';

export function PeriodFilter({ period }: { period: ReturnType<typeof usePeriod> }) {
  const { kind, setKind, range, custom, setCustom } = period;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented
        label="Période"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'week', label: 'Semaine' },
          { value: 'month', label: 'Mois' },
          { value: 'custom', label: 'Personnalisée' },
        ]}
      />
      {kind === 'custom' ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Date de début"
            className="w-40"
            value={toInputDate(custom.from)}
            max={toInputDate(custom.to)}
            onChange={(e) =>
              e.target.value && setCustom({ ...custom, from: startOfDay(new Date(e.target.value)) })
            }
          />
          <span aria-hidden>→</span>
          <Input
            type="date"
            aria-label="Date de fin"
            className="w-40"
            value={toInputDate(custom.to)}
            min={toInputDate(custom.from)}
            onChange={(e) =>
              e.target.value && setCustom({ ...custom, to: endOfDay(new Date(e.target.value)) })
            }
          />
        </div>
      ) : (
        <span className="flex min-h-[42px] items-center gap-2 rounded-md border border-border bg-white px-3 text-sm">
          <Calendar className="size-[18px] text-muted" aria-hidden />
          {describeRange(kind, range)}
        </span>
      )}
    </div>
  );
}
