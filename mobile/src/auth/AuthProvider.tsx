import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/api';
import { setApiToken, setUnauthorizedHandler } from '@/lib/api';
import { sessionFromToken, type Session } from './session';

// Le jeton est rangé dans le stockage chiffré du téléphone (Keystore Android), jamais en clair.
const TOKEN_KEY = 'tm.token';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Connexion avec un jeton déjà délivré par le backend (connexion Microsoft). */
  signInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((next: Session | null) => {
    setApiToken(next?.token ?? null);
    setSession(next);
  }, []);

  // Au lancement : reprend la session si un jeton encore valide est stocké.
  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((token) => applySession(token ? sessionFromToken(token) : null))
      .finally(() => setIsLoading(false));
  }, [applySession]);

  const signInWithToken = useCallback(
    async (token: string) => {
      const next = sessionFromToken(token);
      if (!next) throw new Error('Jeton de connexion invalide.');
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      applySession(next);
    },
    [applySession],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await api.auth.login(email, password);
      await signInWithToken(access_token);
    },
    [signInWithToken],
  );

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    applySession(null);
  }, [applySession]);

  // Jeton refusé par l'API (expiré, ou ancienne session du mode démo) : retour à la connexion.
  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(
    () => ({ session, isLoading, signIn, signInWithToken, signOut }),
    [session, isLoading, signIn, signInWithToken, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return context;
}

// Pour les écrans protégés : la session existe forcément (Stack.Protected dans src/app/_layout.tsx).
export function useSession(): Session {
  const { session } = useAuth();
  if (!session) throw new Error('Aucune session : écran protégé atteint sans connexion.');
  return session;
}
