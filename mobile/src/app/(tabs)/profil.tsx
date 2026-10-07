import { StyleSheet, Text, View } from 'react-native';

import { useAuth, useSession } from '@/auth/AuthProvider';
import type { Role } from '@/auth/session';
import { Badge, Button, Card, Screen, text } from '@/components/ui';

// Maquette : docs/maquettes/mobile/m05-profil.html
// À venir : infos complètes (GET /users/:id), planning, demandes de modification / suppression.
const roleLabels: Record<Role, string> = {
  EMPLOYEE: 'Employé',
  MANAGER: 'Manager',
  DIRECTEUR: 'Directeur',
  ADMIN: 'Administrateur',
};

export default function ProfileScreen() {
  const session = useSession();
  const { signOut } = useAuth();

  return (
    <Screen title="Mon profil">
      <Card>
        <View style={styles.row}>
          <Text style={text.h2}>{session.email}</Text>
          <Badge label="Lecture seule" />
        </View>
        <Text style={text.muted}>Rôle : {roleLabels[session.role]}</Text>
      </Card>
      <Button label="Se déconnecter" variant="secondary" icon="log-out" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
