import type { ReactNode } from 'react';
import { Avatar } from './ui/avatar';

export function Person({
  firstName,
  lastName,
  sub,
}: {
  firstName: string;
  lastName: string;
  sub?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar firstName={firstName} lastName={lastName} size="sm" />
      <div>
        <strong className="block whitespace-nowrap text-sm font-semibold">
          {firstName} {lastName}
        </strong>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </div>
    </div>
  );
}
