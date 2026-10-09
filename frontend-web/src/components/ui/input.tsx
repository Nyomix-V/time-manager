import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const fieldBase =
  'w-full min-h-[42px] rounded-md border border-border bg-white px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary-soft aria-[invalid=true]:border-danger disabled:bg-bg disabled:text-muted';

// Not on <select>: CSS considers every select `:read-only`.
const readOnly = 'read-only:bg-bg read-only:text-muted read-only:border-dashed';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldBase, readOnly, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldBase, readOnly, 'min-h-24 resize-y', className)} {...props} />;
}

/** Native <select>: keyboard and screen-reader support for free. */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(fieldBase, 'cursor-pointer pr-8', className)} {...props} />;
}
