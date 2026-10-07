import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

// Maquette : docs/maquettes/mobile/m01-connexion.html
export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
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

        {/* La connexion Microsoft attend l'implémentation côté backend (routes /auth/microsoft). */}
        <Button label="Se connecter avec Microsoft" variant="secondary" disabled onPress={() => {}} />
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
            onSubmitEditing={submit}
            accessibilityLabelledBy="password-label"
          />
        </View>

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <Button label="Se connecter" onPress={submit} loading={loading} disabled={!email || !password} large />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: 'center', gap: 18, paddingHorizontal: space.lg },
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
});
