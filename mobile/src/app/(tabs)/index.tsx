import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/auth/AuthProvider';
import { clocksIn } from '@/auth/session';
import { Badge, Button, Card, Screen, text } from '@/components/ui';
import { apiRequest } from '@/lib/api';
import { colors } from '@/theme/tokens';

// Maquette : docs/maquettes/mobile/m02-accueil.html (états « en poste » et « en pause »).
// Branché sur le backend : GET /clocks/:userId et POST /clocks/:userId (bascule arrivée / départ).
// La pause attend une route côté backend : le bouton est affiché mais désactivé.

type Clock = { id: string; status: 'IN' | 'OUT'; time: string };

const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

export default function ClockScreen() {
  const session = useSession();
  const [clocks, setClocks] = useState<Clock[]>([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setClocks(await apiRequest<Clock[]>(`/clocks/${session.userId}`, { token: session.token }));
    } catch (e) {
      Alert.alert('Pointages indisponibles', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  async function toggle() {
    setSending(true);
    try {
      await apiRequest<Clock>(`/clocks/${session.userId}`, { method: 'POST', token: session.token });
      await load();
    } catch (e) {
      Alert.alert('Pointage refusé', e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  if (!clocksIn(session.role)) {
    return (
      <Screen title="Pointage">
        <Card>
          <Text style={text.body}>L'administrateur ne pointe pas. L'administration se fait sur le site web.</Text>
        </Card>
      </Screen>
    );
  }

  const today = clocks.filter((c) => isToday(new Date(c.time)));
  const last = today.at(-1);
  const atWork = last?.status === 'IN';

  return (
    <Screen
      title="Pointage"
      subtitle={now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
    >
      <Card style={styles.clockCard}>
        {loading ? (
          <Text style={text.muted}>Chargement…</Text>
        ) : atWork ? (
          <Badge label={`En poste depuis ${formatTime(new Date(last.time))}`} tone="success" />
        ) : last ? (
          <Badge label={`Parti à ${formatTime(new Date(last.time))}`} tone="neutral" />
        ) : (
          <Badge label="Pas encore pointé aujourd'hui" tone="neutral" />
        )}
        <Text style={styles.clock} accessibilityLabel={`Il est ${formatTime(now)}`}>
          {formatTime(now)}
        </Text>
        {atWork && <Button label="Commencer une pause" variant="pause" icon="pause" disabled onPress={() => {}} />}
        <Button
          label={atWork ? 'Pointer mon départ' : 'Pointer mon arrivée'}
          icon={atWork ? 'log-out' : 'log-in'}
          onPress={toggle}
          loading={sending}
          disabled={loading}
          large
        />
        {atWork && <Text style={text.muted}>Pause : en attente de l'API côté backend.</Text>}
      </Card>

      <Card>
        <Text style={text.h2}>Aujourd'hui</Text>
        {today.length === 0 ? (
          <Text style={text.muted}>Aucun pointage pour l'instant.</Text>
        ) : (
          today.map((clock) => (
            <View key={clock.id} style={styles.row}>
              <Text style={text.body}>{clock.status === 'IN' ? 'Arrivée' : 'Départ'}</Text>
              <Text style={text.body}>{formatTime(new Date(clock.time))}</Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  clockCard: { alignItems: 'stretch', gap: 14, paddingVertical: 24 },
  clock: { fontSize: 52, fontWeight: '700', color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
