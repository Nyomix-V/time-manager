import type { ComponentProps } from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-[18px] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-hover',
        secondary: 'bg-white border-border text-text hover:bg-bg',
        danger: 'bg-danger text-white hover:bg-danger/90',
        ghost: 'bg-transparent text-primary hover:bg-primary-soft',
        pause: 'bg-primary-soft border-primary-light text-primary hover:bg-[#dbe4ff]',
      },
      size: {
        default: 'px-[18px] py-2.5 text-sm',
        sm: 'px-3 py-1.5 text-[13px]',
        xl: 'px-7 py-[18px] text-[17px] rounded-[14px] [&_svg]:size-[22px]',
        icon: 'size-[34px] rounded-lg border-border bg-white text-muted hover:bg-bg [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, type = 'button', ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type })}
      {...props}
    />
  );
}
