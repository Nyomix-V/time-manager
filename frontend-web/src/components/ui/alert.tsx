import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'flex items-start gap-3 rounded-md px-4 py-3.5 text-sm [&>svg]:size-5 [&>svg]:shrink-0',
  {
    variants: {
      tone: {
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
        info: 'bg-primary-soft text-primary',
        success: 'bg-success-soft text-success',
      },
    },
    defaultVariants: { tone: 'info' },
  },
);

export function Alert({
  className,
  tone,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div className={cn(alertVariants({ tone }), className)} {...props} />;
}
