import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Clock, LogOut, Menu, X } from 'lucide-react';
import { useAuth, useCurrentUser } from '@/auth/AuthProvider';
import { NAV_BY_ROLE } from '@/auth/navigation';
import { can, ROLE_LABELS } from '@/auth/permissions';
import { useScopeRequests } from '@/api/requests';
import { useBranch } from '@/api/branches';
import { Avatar } from '../ui/avatar';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const location = useLocation();
  // The mobile menu is open "for" a given page: navigating elsewhere closes it.
  const [menuOpenAt, setMenuOpenAt] = useState<string | null>(null);
  const menuOpen = menuOpenAt === location.pathname;

  // After a navigation, move keyboard/screen-reader focus to the new page content.
  useEffect(() => {
    document.getElementById('main')?.focus();
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-bg">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setMenuOpenAt(menuOpen ? null : location.pathname)}
          aria-expanded={menuOpen}
          aria-controls="sidebar"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="rounded-md p-2 text-white"
        >
          {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </div>

      <Sidebar open={menuOpen} />

      <main
        id="main"
        tabIndex={-1}
        className="flex min-w-0 flex-1 flex-col gap-6 px-4 pb-8 pt-20 outline-none sm:px-6 lg:px-10 lg:pt-8"
      >
        <Outlet />
      </main>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5 text-lg font-bold text-white">
      <Clock className="size-6" aria-hidden />
      Time Manager
    </div>
  );
}

function Sidebar({ open }: { open: boolean }) {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const branch = useBranch(user.branchId);
  const requests = useScopeRequests(can(user.role, 'decideRequests'));
  const pending = requests.data?.filter((r) => r.status === 'PENDING').length ?? 0;

  return (
    <aside
      id="sidebar"
      className={cn(
        'fixed inset-y-0 left-0 z-20 w-[264px] shrink-0 flex-col gap-1 bg-sidebar px-4 pb-5 pt-20 lg:sticky lg:top-0 lg:flex lg:h-screen lg:pt-6',
        open ? 'flex' : 'hidden',
      )}
    >
      <div className="hidden px-3 pb-7 lg:block">
        <Logo />
      </div>
      <nav aria-label="Navigation principale" className="flex flex-col gap-1 overflow-y-auto">
        {NAV_BY_ROLE[user.role].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-text hover:bg-white/5 hover:text-white',
                isActive && 'bg-primary text-white hover:bg-primary',
              )
            }
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
            {item.badge === 'pendingRequests' && pending > 0 && (
              <span className="ml-auto rounded-full bg-danger px-[7px] py-0.5 text-[11px] font-bold text-white">
                {pending}
                <span className="sr-only"> en attente</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-2.5 px-3 pb-2 pt-3">
        <Avatar firstName={user.firstName} lastName={user.lastName} />
        <div className="min-w-0">
          <strong className="block truncate text-sm font-semibold text-white">
            {user.firstName} {user.lastName}
          </strong>
          <span className="text-xs text-sidebar-text">
            {ROLE_LABELS[user.role]}
            {branch.data && ` · ${branch.data.name}`}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={logout}
        className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-text hover:bg-white/5 hover:text-white"
      >
        <LogOut className="size-5" aria-hidden />
        Déconnexion
      </button>
    </aside>
  );
}
