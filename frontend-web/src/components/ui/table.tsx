import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'bg-bg px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('border-t border-border px-4 py-3 align-middle', className)} {...props} />;
}

export function Tr({ className, highlight, ...props }: ComponentProps<'tr'> & { highlight?: boolean }) {
  return <tr className={cn(highlight && '[&>td]:bg-[#fffbf5]', className)} {...props} />;
}

export const num = 'text-right tabular-nums';
