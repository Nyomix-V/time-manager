import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useSession } from '@/auth/AuthProvider';
import { supervises } from '@/auth/session';
import type { IconName } from '@/components/ui';
import { colors } from '@/theme/tokens';

const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Feather name={name} size={size} color={color} />;

// Onglets selon le rôle (maquettes mobiles) :
// employé            → Pointer · Mes heures · Absences · Profil
// manager, directeur → Pointer · Équipe / Branche · Demandes · Absences · Profil
export default function TabsLayout() {
  const { role } = useSession();
  const isSupervisor = supervises(role);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Pointer', tabBarIcon: tabIcon('clock') }} />
      <Tabs.Screen
        name="heures"
        options={{ title: 'Mes heures', tabBarIcon: tabIcon('bar-chart-2'), href: isSupervisor ? null : undefined }}
      />
      <Tabs.Screen
        name="equipe"
        options={{
          title: role === 'DIRECTEUR' ? 'Branche' : 'Équipe',
          tabBarIcon: tabIcon('bar-chart-2'),
          href: isSupervisor ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="demandes"
        options={{ title: 'Demandes', tabBarIcon: tabIcon('check-square'), href: isSupervisor ? undefined : null }}
      />
      <Tabs.Screen name="absences" options={{ title: 'Absences', tabBarIcon: tabIcon('file-text') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
