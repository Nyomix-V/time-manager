import type { usePagination } from '@/hooks/usePagination';
import { Button } from './ui/button';

export function Pagination({ pagination: p }: { pagination: ReturnType<typeof usePagination> }) {
  const first = p.total === 0 ? 0 : p.current * p.pageSize + 1;
  const last = Math.min((p.current + 1) * p.pageSize, p.total);
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between border-t border-border px-4 py-3.5 text-[13px] text-muted"
    >
      <span>
        {first} – {last} sur {p.total}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={p.current === 0} onClick={() => p.setPage(p.current - 1)}>
          Précédent
        </Button>
        <Button
          variant="secondary"
          disabled={p.current >= p.pageCount - 1}
          onClick={() => p.setPage(p.current + 1)}
        >
          Suivant
        </Button>
      </div>
    </nav>
  );
}
