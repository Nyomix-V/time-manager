import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

import { errorMessage } from '@/lib/api';

/**
 * Charge des données quand l'écran est affiché, et les recharge :
 * - à chaque retour sur l'écran ;
 * - quand une dépendance change ;
 * - toutes les `refreshMs` millisecondes si demandé (ex. statut des salariés, chaque minute).
 */
export function useQuery<T>(load: () => Promise<T>, deps: DependencyList, { refreshMs }: { refreshMs?: number } = {}) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    try {
      const next = await loadRef.current();
      setData(next);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Tirer l'écran vers le bas pour actualiser.
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
      if (!refreshMs) return;
      const timer = setInterval(reload, refreshMs);
      return () => clearInterval(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, refreshMs, ...deps]),
  );

  return { data, error, loading, refreshing, refresh, reload, updatedAt };
}

/** Heure courante, mise à jour toutes les `intervalMs` millisecondes. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
