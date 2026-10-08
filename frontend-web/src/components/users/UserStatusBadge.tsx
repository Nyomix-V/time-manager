import { format, isToday } from 'date-fns';
import type { ClockStatus, User } from '@/api/types';
import { formatTime } from '@/lib/format';
import { Badge } from '../ui/badge';

/** Account lifecycle: nothing to show once the account is active. */
export function UserStatusBadge({ user }: { user: Pick<User, 'status'> }) {
  if (user.status === 'INVITED') return <Badge tone="warning">Invitation envoyée</Badge>;
  if (user.status === 'DISABLED') return <Badge tone="neutral">Compte désactivé</Badge>;
  return null;
}

/** Live clock status from GET /clocks/:id/status (mockup 08: En poste / En pause / Pas encore pointé). */
export function LiveStatusBadge({
  user,
  status,
}: {
  user: Pick<User, 'role' | 'status'>;
  status?: ClockStatus;
}) {
  if (user.role === 'ADMIN') return <span className="text-muted">—</span>;
  if (user.status === 'INVITED') return <Badge tone="neutral">Compte non activé</Badge>;
  if (!status) return <span className="text-muted">…</span>;
  const since = status.since ? new Date(status.since) : null;
  if (status.state === 'WORKING')
    return <Badge tone="success">En poste · depuis {since && formatTime(since)}</Badge>;
  if (status.state === 'ON_BREAK')
    return <Badge tone="info">En pause · depuis {since && formatTime(since)}</Badge>;
  if (since && isToday(since)) return <Badge tone="neutral">Parti · {formatTime(since)}</Badge>;
  return (
    <Badge tone="neutral">Pas encore pointé{since ? ` · dernier le ${format(since, 'dd/MM')}` : ''}</Badge>
  );
}
