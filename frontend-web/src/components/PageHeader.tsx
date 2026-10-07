import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumb?: { label: string; to: string };
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <div className="min-w-60 flex-1">
        {breadcrumb && (
          <nav aria-label="Fil d'Ariane" className="mb-1.5 text-[13px] text-muted">
            <Link to={breadcrumb.to} className="font-medium text-primary hover:underline">
              {breadcrumb.label}
            </Link>{' '}
            / <span aria-current="page">{typeof title === 'string' ? title : ''}</span>
          </nav>
        )}
        <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
