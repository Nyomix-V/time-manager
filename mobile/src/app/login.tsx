import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { signInWithMicrosoft } from '@/auth/microsoft';
import { ForgotPasswordSheet } from '@/components/ForgotPasswordSheet';
import { Badge, Button } from '@/components/ui';
import { MOCK } from '@/lib/config';
import { MOCK_ACCOUNTS, MOCK_PASSWORD } from '@/mock/data';
import { colors, radius, space } from '@/theme/tokens';

// Maquette : docs/maquettes/mobile/m01-connexion.html
export default function LoginScreen() {
  const { signIn, signInWithToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function submit(credentials = { email: email.trim(), password }) {
    setError(null);
    setLoading(true);
    try {
      await signIn(credentials.email, credentials.password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  // Connexion Microsoft : la page de Microsoft s'ouvre dans le navigateur, le backend renvoie ensuite vers l'app avec notre jeton.
  async function microsoft() {
    setError(null);
    if (MOCK) {
      setError('Mode démo : la connexion Microsoft passe par le vrai backend, elle n’est pas simulée.');
      return;
    }
    setMicrosoftLoading(true);
    try {
      const token = await signInWithMicrosoft();
      if (token) await signInWithToken(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion Microsoft impossible.');
    } finally {
      setMicrosoftLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Feather name="clock" size={26} color={colors.text} />
            <Text style={styles.logoText}>Time Manager</Text>
          </View>
          <View>
            <Text style={styles.title} accessibilityRole="header">
              Connexion
            </Text>
            <Text style={styles.subtitle}>Avec le compte créé par votre manager.</Text>
          </View>

          {MOCK && (
            <View style={styles.demo}>
              <Badge label="Mode démo : aucune donnée réelle" tone="warning" />
              <Text style={styles.demoText}>Se connecter en un clic :</Text>
              <View style={styles.demoButtons}>
                {MOCK_ACCOUNTS.map((account) => (
                  <View key={account.email} style={styles.demoButton}>
                    <Button
                      label={account.label}
                      variant="secondary"
                      disabled={loading}
                      onPress={() => submit({ email: account.email, password: MOCK_PASSWORD })}
                    />
                  </View>
                ))}
              </View>
              <Text style={styles.demoText}>
                Ou saisissez par exemple employe@demo.fr, mot de passe {MOCK_PASSWORD}.
              </Text>
            </View>
          )}

          <Button
            label="Se connecter avec Microsoft"
            variant="secondary"
            icon="log-in"
            loading={microsoftLoading}
            disabled={loading}
            onPress={microsoft}
          />
          <Text style={styles.divider}>ou avec votre email</Text>

          <View style={styles.field}>
            <Text style={styles.label} nativeID="email-label">
              Adresse email
            </Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="prenom.nom@trinity-market.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              accessibilityLabelledBy="email-label"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label} nativeID="password-label">
              Mot de passe
            </Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              onSubmitEditing={() => submit()}
              accessibilityLabelledBy="password-label"
            />
          </View>

          {error && (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          )}

          <Button label="Se connecter" onPress={() => submit()} loading={loading} disabled={!email || !password} large />
          <Button label="Mot de passe oublié ?" variant="ghost" onPress={() => setForgotOpen(true)} />
        </ScrollView>
        <ForgotPasswordSheet key={`forgot-${forgotOpen}`} visible={forgotOpen} initialEmail={email.trim()} onClose={() => setForgotOpen(false)} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', gap: 18, paddingHorizontal: space.lg, paddingVertical: space.xl },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoText: { fontSize: 22, fontWeight: '700', color: colors.text },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
  divider: { textAlign: 'center', fontSize: 13, color: colors.muted },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: colors.text },
  input: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 14 },
  demo: {
    gap: 10,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warningSoft,
    backgroundColor: colors.surface,
  },
  demoText: { fontSize: 13, color: colors.muted },
  demoButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  demoButton: { flexGrow: 1, flexBasis: '45%' },
});
