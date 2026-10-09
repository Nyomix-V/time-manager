import { cloneElement, useId, type ReactElement, type ReactNode } from 'react';

/**
 * Label + control + hint/error, correctly linked for screen readers:
 * htmlFor/id, aria-invalid and aria-describedby pointing to the error message.
 */
export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactElement<Record<string, unknown>>;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  const control = cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error || hint ? msgId : undefined,
    'aria-required': required || undefined,
  });
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}{' '}
        {required && (
          <span className="text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {control}
      {(error || hint) && (
        <span
          id={msgId}
          className={error ? 'text-xs text-danger' : 'text-xs text-muted'}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </span>
      )}
    </div>
  );
}

/** Read-only value displayed like an input (profile, locked branch...). */
export function ReadOnlyField({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      <div className="flex min-h-[42px] items-center gap-2 rounded-md border border-dashed border-border bg-bg px-3 py-2.5 text-sm text-muted [&_svg]:size-[18px]">
        {icon}
        {value || '—'}
      </div>
    </div>
  );
}
