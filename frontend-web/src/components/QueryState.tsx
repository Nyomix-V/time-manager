import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import { Alert } from './ui/alert';
import { Button } from './ui/button';

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 p-8 text-sm text-muted">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner />
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert tone="danger" role="alert">
      <AlertTriangle aria-hidden />
      <span className="flex-1">{getErrorMessage(error)}</span>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </Alert>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="p-6 text-center text-sm text-muted">{children}</p>;
}

/** Loading / error / data rendering for one query, so every page handles the 3 states the same way. */
export function QueryState<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return <>{children(query.data)}</>;
}
