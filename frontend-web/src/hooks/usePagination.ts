import { useState } from 'react';

/** Client-side pagination: the backend returns full lists for now. */
export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  return {
    visible: items.slice(current * pageSize, (current + 1) * pageSize),
    current,
    pageCount,
    pageSize,
    total: items.length,
    setPage,
    reset: () => setPage(0),
  };
}
