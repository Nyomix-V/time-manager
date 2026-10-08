import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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
  /** Opens the session from a JWT issued by the backend (Microsoft SSO callback). */
  loginWithToken: (token: string) => Promise<void>;
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
  // Set as soon as a login starts, so the session restore below cannot overwrite it.
  const loggingIn = useRef(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    queryClient.clear();
    setState({ status: 'anonymous', user: null });
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    let cancelled = false;
    restoreSession().then((user) => {
      if (cancelled || loggingIn.current) return;
      setState(user ? { status: 'authenticated', user } : { status: 'anonymous', user: null });
    });
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  /** Common end of every login: keep the token in memory, load the profile (the server checks the token). */
  const startSession = useCallback(
    async (token: string) => {
      loggingIn.current = true;
      const { sub } = decodeJwt(token);
      if (!sub) throw new Error('Jeton de connexion invalide.');
      setAccessToken(token);
      try {
        const user = await fetchUser(sub);
        queryClient.setQueryData(userKeys.detail(user.id), user);
        setState({ status: 'authenticated', user });
      } catch (e) {
        setAccessToken(null);
        loggingIn.current = false;
        throw e;
      }
    },
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password);
      await startSession(session.access_token);
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {}); // revokes the refresh cookie server-side
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ state, login, loginWithToken: startSession, logout }),
    [state, login, startSession, logout],
  );
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
