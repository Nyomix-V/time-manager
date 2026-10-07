import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ColorValue } from 'react-native';

import { api } from '@/api';
import { useSession } from '@/auth/AuthProvider';
import { clocksIn, supervises } from '@/auth/session';
import type { IconName } from '@/components/ui';
import { colors } from '@/theme/tokens';

const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Feather name={name} size={size} color={color} />;

// Onglets selon le rôle (maquettes mobiles) :
// employé            → Pointer · Mes heures · Absences · Profil
// manager, directeur → Pointer · Équipe / Branche · Demandes · Absences · Profil
// admin              → Accueil · Profil (l'administration se fait sur le site web)
export default function TabsLayout() {
  const { role } = useSession();
  const isSupervisor = supervises(role);
  const clocks = clocksIn(role);
  const pending = usePendingCount(isSupervisor);
  const show = (visible: boolean) => (visible ? undefined : null);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: clocks ? 'Pointer' : 'Accueil', tabBarIcon: tabIcon(clocks ? 'clock' : 'home') }} />
      <Tabs.Screen name="heures" options={{ title: 'Mes heures', tabBarIcon: tabIcon('bar-chart-2'), href: show(clocks && !isSupervisor) }} />
      <Tabs.Screen
        name="equipe"
        options={{ title: role === 'DIRECTEUR' ? 'Branche' : 'Équipe', tabBarIcon: tabIcon('users'), href: show(isSupervisor) }}
      />
      <Tabs.Screen
        name="demandes"
        options={{
          title: 'Demandes',
          tabBarIcon: tabIcon('check-square'),
          href: show(isSupervisor),
          tabBarBadge: pending > 0 ? pending : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
        }}
      />
      <Tabs.Screen name="absences" options={{ title: 'Absences', tabBarIcon: tabIcon('file-text'), href: show(clocks) }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}

/** Nombre de demandes en attente, pour la pastille de l'onglet Demandes. */
function usePendingCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () =>
      Promise.all([api.absences.listPending(), api.profileRequests.listPending()])
        .then(([absences, requests]) => alive && setCount(absences.length + requests.length))
        .catch(() => {});
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [enabled]);
  return count;
}
