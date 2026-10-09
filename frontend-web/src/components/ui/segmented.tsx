import { ToggleGroup } from 'radix-ui';
import { cn } from '@/lib/utils';

/** Segmented control ("Semaine | Mois | Personnalisée") — arrow-key navigation via Radix ToggleGroup. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className={cn('inline-flex gap-1 rounded-md border border-border bg-bg p-1', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className="cursor-pointer rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-muted data-[state=on]:bg-white data-[state=on]:text-text data-[state=on]:shadow-[0_1px_2px_rgba(20,26,51,0.1)]"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
