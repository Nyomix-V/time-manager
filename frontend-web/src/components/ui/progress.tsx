import { cn } from '@/lib/utils';

const tones = { primary: 'bg-primary', ok: 'bg-success', warn: 'bg-warning-bar', bad: 'bg-danger' };

export function Progress({
  value,
  label,
  tone = 'primary',
  className,
}: {
  value: number; // 0..100
  label: string;
  tone?: keyof typeof tones;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 overflow-hidden rounded-full bg-bg', className)}
    >
      <div className={cn('h-full rounded-full', tones[tone])} style={{ width: `${v}%` }} />
    </div>
  );
}
