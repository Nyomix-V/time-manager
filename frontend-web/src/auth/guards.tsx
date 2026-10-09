import { Navigate, Outlet, useLocation } from 'react-router';
import type { Role } from '@/api/types';
import { useAuth } from './AuthProvider';
import { homeFor, ROUTES } from './navigation';
import { FullPageSpinner } from '@/components/QueryState';

/** Protected area: anonymous visitors are sent to the login page (and come back afterwards). */
export function RequireAuth() {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === 'loading') return <FullPageSpinner />;
  if (state.status === 'anonymous') {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Role-restricted pages. Typing the URL is not enough: the user is redirected to their home. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { state } = useAuth();
  if (state.status !== 'authenticated') return null;
  if (!roles.includes(state.user.role)) return <Navigate to={homeFor(state.user.role)} replace />;
  return <Outlet />;
}

/** Login pages: an already logged-in user goes straight to their home. */
export function RedirectIfAuthenticated() {
  const { state } = useAuth();
  if (state.status === 'loading') return <FullPageSpinner />;
  if (state.status === 'authenticated') return <Navigate to={homeFor(state.user.role)} replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { state } = useAuth();
  if (state.status !== 'authenticated') return null;
  return <Navigate to={homeFor(state.user.role)} replace />;
}
