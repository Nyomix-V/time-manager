// Composants de base, repris des maquettes (docs/maquettes/assets/style.css).
import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Feather>['name'];

export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'pause' | 'danger';

const buttonColors: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  // Pause en bleu clair, pour ne pas la confondre avec le départ (bleu plein).
  pause: { bg: colors.primarySoft, fg: colors.primary, border: colors.primaryLight },
  danger: { bg: colors.danger, fg: colors.onPrimary, border: colors.danger },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  large = false,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  large?: boolean;
}) {
  const palette = buttonColors[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        large && styles.buttonLarge,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Feather name={icon} size={large ? 22 : 18} color={palette.fg} />}
          <Text style={[styles.buttonLabel, large && styles.buttonLabelLarge, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const badgeColors: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.primarySoft, fg: colors.primary },
  neutral: { bg: colors.bg, fg: colors.muted },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const palette = badgeColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeLabel, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

// Écran pas encore développé : rappelle ce qu'il contiendra, d'après les maquettes.
export function Placeholder({ title, maquette, items }: { title: string; maquette: string; items: string[] }) {
  return (
    <Screen title={title}>
      <Card>
        <Badge label="À développer" tone="info" />
        {items.map((item) => (
          <Text key={item} style={styles.placeholderItem}>
            • {item}
          </Text>
        ))}
        <Text style={styles.hint}>Maquette : docs/maquettes/mobile/{maquette}</Text>
      </Card>
    </Screen>
  );
}

export const text = StyleSheet.create({
  h2: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg - 4, gap: space.md - 2 },
  header: { paddingTop: space.sm, gap: 2 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48, // cible tactile confortable (accessibilité)
  },
  buttonLarge: { paddingVertical: 18, borderRadius: 14 },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  buttonLabelLarge: { fontSize: 17 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeLabel: { fontSize: 12, fontWeight: '600' },
  placeholderItem: { fontSize: 14, color: colors.text },
  hint: { fontSize: 12, color: colors.muted },
});
