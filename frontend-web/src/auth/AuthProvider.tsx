import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { refreshAccessToken, setAccessToken, setSessionExpiredHandler } from '@/api/client';
import * as authApi from '@/api/auth';
import { fetchUser, userKeys } from '@/api/users';
import type { User } from '@/api/types';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: User };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Restoring the session after a page reload: the access token is gone (memory only),
// but the httpOnly refresh cookie is still there -> ask for a new access token.
// Shared promise so React StrictMode's double effect doesn't refresh twice.
let restoring: Promise<User | null> | null = null;
function restoreSession(): Promise<User | null> {
  restoring ??= refreshAccessToken()
    .then((token) => {
      const { sub } = decodeJwt(token);
      return sub ? fetchUser(sub) : null;
    })
    .catch(() => null)
    .finally(() => {
      restoring = null;
    });
  return restoring;
}

/** Reads the (non-secret) payload of our own JWT to know who is logged in. No signature check: the server does it. */
export function decodeJwt(token: string): { sub?: string } {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });
  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    setAccessToken(null);
    queryClient.clear();
    setState({ status: 'anonymous', user: null });
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    let cancelled = false;
    restoreSession().then((user) => {
      if (cancelled) return;
      setState(user ? { status: 'authenticated', user } : { status: 'anonymous', user: null });
    });
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password);
      setAccessToken(session.access_token);
      const user = await fetchUser(session.user.id);
      queryClient.setQueryData(userKeys.detail(user.id), user);
      setState({ status: 'authenticated', user });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {}); // revokes the refresh cookie server-side
    clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Logged-in user. Only call inside routes protected by <RequireAuth>. */
export function useCurrentUser(): User {
  const { state } = useAuth();
  if (state.status !== 'authenticated') throw new Error('useCurrentUser outside an authenticated route');
  return state.user;
}
