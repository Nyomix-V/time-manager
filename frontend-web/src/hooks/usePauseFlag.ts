import { useCallback, useState } from 'react';
import { format } from 'date-fns';

// The backend only stores IN/OUT: a pause and a departure are both an OUT.
// We remember locally that the last OUT of the day was a pause, to show the
// "En pause" state of the mockup. To move server-side (Clock.kind = PAUSE), see README.
export function usePauseFlag(userId: string) {
  const key = `tm.pause.${userId}.${format(new Date(), 'yyyy-MM-dd')}`;
  const [flag, setFlagState] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  const setFlag = useCallback(
    (value: boolean) => {
      setFlagState(value);
      try {
        if (value) localStorage.setItem(key, '1');
        else localStorage.removeItem(key);
      } catch {
        /* storage unavailable: state kept in memory only */
      }
    },
    [key],
  );
  return [flag, setFlag] as const;
}
