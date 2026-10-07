import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('flex flex-col gap-4 rounded-lg border border-border bg-surface p-6', className)}
      {...props}
    />
  );
}

/** Card whose content touches the borders (tables). */
export function FlushCard({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('flex flex-col overflow-hidden rounded-lg border border-border bg-surface', className)}
      {...props}
    />
  );
}

export function CardHead({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex items-center justify-between gap-3 px-6 py-5', className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: ComponentProps<'h2'>) {
  return (
    <h2 className={cn('text-base font-semibold', className)} {...props}>
      {children}
    </h2>
  );
}
