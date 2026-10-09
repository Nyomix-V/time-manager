import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';

const sizes = { sm: 'size-8 text-xs', md: 'size-9 text-[13px]', lg: 'size-16 text-[22px]' };

export function Avatar({
  firstName,
  lastName,
  size = 'md',
  className,
}: {
  firstName?: string;
  lastName?: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary',
        sizes[size],
        className,
      )}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
