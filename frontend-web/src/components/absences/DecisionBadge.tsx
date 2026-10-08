import type { RequestStatus } from '@/api/types';
import { Badge } from '../ui/badge';

const STATUS = {
  PENDING: { label: 'En attente', tone: 'warning' },
  APPROVED: { label: 'Validée', tone: 'success' },
  REJECTED: { label: 'Refusée', tone: 'danger' },
} as const;

export function DecisionBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}
