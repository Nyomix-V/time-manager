import type { ReactNode } from 'react';
import { Dialog as D } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Radix Dialog: focus trap, Escape to close, focus returned to the trigger, aria-modal.
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

const iconTones = {
  danger: 'bg-danger-soft text-danger',
  info: 'bg-primary-soft text-primary',
  ok: 'bg-success-soft text-success',
};

interface DialogContentProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof iconTones;
  size?: 'md' | 'lg';
  /** alertdialog for destructive confirmations (no close cross). */
  role?: 'dialog' | 'alertdialog';
  children: ReactNode;
}

export function DialogContent({
  title,
  description,
  icon,
  tone = 'info',
  size = 'md',
  role = 'dialog',
  children,
}: DialogContentProps) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-40 bg-[rgba(20,26,51,0.55)]" />
      <D.Content
        role={role}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-[18px] overflow-y-auto rounded-lg bg-white p-7 shadow-[0_24px_60px_rgba(20,26,51,0.3)]',
          size === 'lg' ? 'max-w-[620px]' : 'max-w-[500px]',
        )}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <div className="flex items-start gap-3.5">
          {icon && (
            <div
              className={cn(
                'grid size-12 shrink-0 place-items-center rounded-full [&_svg]:size-6',
                iconTones[tone],
              )}
            >
              {icon}
            </div>
          )}
          <div className="flex-1">
            <D.Title className="text-xl font-semibold">{title}</D.Title>
            {description && <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>}
          </div>
          {role === 'dialog' && (
            <D.Close
              className="grid size-[34px] place-items-center rounded-lg border border-border bg-white text-muted hover:bg-bg"
              aria-label="Fermer"
            >
              <X className="size-4" aria-hidden />
            </D.Close>
          )}
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

export function DialogActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex justify-end gap-2', className)}>{children}</div>;
}
