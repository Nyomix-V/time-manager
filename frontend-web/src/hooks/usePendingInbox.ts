import { usePendingAbsences } from '@/api/absences';
import { usePendingRequests } from '@/api/accountRequests';
import { useCurrentUser } from '@/auth/AuthProvider';
import { can } from '@/auth/permissions';

/**
 * Pending absences + account requests the current user has to decide.
 * The backend only returns what the actor may decide (their scope, never their own requests).
 */
export function usePendingInbox() {
  const me = useCurrentUser();
  const enabled = can(me.role, 'decideRequests');
  const absences = usePendingAbsences(enabled);
  const requests = usePendingRequests(enabled);
  return {
    absences: absences.data ?? [],
    requests: requests.data ?? [],
    count: (absences.data?.length ?? 0) + (requests.data?.length ?? 0),
    isPending: enabled && (absences.isPending || requests.isPending),
    error: absences.error ?? requests.error,
  };
}
