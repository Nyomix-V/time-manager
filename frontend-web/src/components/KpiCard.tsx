import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './ui/card';

export function KpiCard({
  label,
  icon: Icon,
  value,
  unit,
  hint,
  hintTone = 'muted',
  children,
}: {
  label: string;
  icon?: LucideIcon;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  hintTone?: 'muted' | 'up' | 'down';
  children?: ReactNode;
}) {
  return (
    <Card className="gap-2">
      <span className="flex items-center gap-2 text-[13px] font-medium text-muted">
        {Icon && <Icon className="size-4" aria-hidden />}
        {label}
      </span>
      <span className="text-[28px] font-bold tracking-tight">
        {value} {unit && <small className="text-[15px] font-medium text-muted">{unit}</small>}
      </span>
      {children}
      {hint && (
        <span
          className={cn(
            'text-xs font-medium',
            hintTone === 'up' && 'text-success',
            hintTone === 'down' && 'text-danger',
            hintTone === 'muted' && 'text-muted',
          )}
        >
          {hint}
        </span>
      )}
    </Card>
  );
}
