import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiRequest } from '@/lib/api';
import { sessionFromToken, type Session } from './session';

// Le jeton est rangé dans le stockage chiffré du téléphone (Keystore Android), jamais en clair.
const TOKEN_KEY = 'tm.token';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Au lancement : reprend la session si un jeton encore valide est stocké.
  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((token) => setSession(token ? sessionFromToken(token) : null))
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { access_token } = await apiRequest<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    const next = sessionFromToken(access_token);
    if (!next) throw new Error('Jeton de connexion invalide.');
    await SecureStore.setItemAsync(TOKEN_KEY, access_token);
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, isLoading, signIn, signOut }), [session, isLoading, signIn, signOut]);
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
