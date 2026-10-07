import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

// Connecté : les onglets. Sinon : l'écran de connexion. Expo Router redirige tout seul
// quand la session change (connexion, déconnexion, jeton expiré).
function RootNavigator() {
  const { session, isLoading } = useAuth();
  if (isLoading) return null; // le splash screen reste affiché pendant la lecture du jeton

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
