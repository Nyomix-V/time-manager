import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

// Onglet Équipe : la liste, puis la fiche d'un salarié (avec bouton retour).
export default function TeamLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ headerShown: true, title: 'Fiche salarié' }} />
    </Stack>
  );
}
