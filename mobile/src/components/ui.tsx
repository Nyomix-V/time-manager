// Composants de base, repris des maquettes (docs/maquettes/assets/style.css).
import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Feather>['name'];
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const toneColors: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.primarySoft, fg: colors.primary },
  neutral: { bg: colors.bg, fg: colors.muted },
};

export function Screen({
  title,
  subtitle,
  right,
  children,
  refreshing,
  onRefresh,
  safeTop = true,
}: {
  title: ReactNode;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** false quand l'écran a déjà un en-tête (bouton retour) qui gère le haut de l'écran. */
  safeTop?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={safeTop ? ['top'] : []}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} /> : undefined
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          </View>
          {right}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'pause' | 'danger' | 'ghost';

const buttonColors: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  // Pause en bleu clair, pour ne pas la confondre avec le départ (bleu plein).
  pause: { bg: colors.primarySoft, fg: colors.primary, border: colors.primaryLight },
  danger: { bg: colors.danger, fg: colors.onPrimary, border: colors.danger },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  large = false,
  small = false,
  color,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  large?: boolean;
  small?: boolean;
  /** Couleur du texte pour un bouton « ghost » (ex. danger). */
  color?: string;
}) {
  const palette = buttonColors[variant];
  const fg = color ?? palette.fg;
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        large && styles.buttonLarge,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Feather name={icon} size={large ? 22 : small ? 16 : 18} color={fg} />}
          <Text style={[styles.buttonLabel, large && styles.buttonLabelLarge, small && styles.buttonLabelSmall, { color: fg }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, tone }: { icon: IconName; label: string; onPress: () => void; tone?: 'danger' }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
    >
      <Feather name={icon} size={18} color={tone === 'danger' ? colors.danger : colors.muted} />
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const palette = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      {icon ? <Feather name={icon} size={12} color={palette.fg} /> : <View style={[styles.dot, { backgroundColor: palette.fg }]} />}
      <Text style={[styles.badgeLabel, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

/** Retard d'un jour ; excusé quand une absence validée couvre ce jour (il ne compte alors pas dans les retards). */
export function LateBadge({ minutes, excused }: { minutes: number; excused: boolean }) {
  return excused ? <Badge label="Retard excusé" tone="info" /> : <Badge label={`+${minutes} min`} tone="warning" />;
}

export function Banner({ tone = 'info', icon = 'info', children }: { tone?: Tone; icon?: IconName; children: ReactNode }) {
  const palette = toneColors[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg }]} accessibilityRole={tone === 'danger' || tone === 'warning' ? 'alert' : undefined}>
      <Feather name={icon} size={18} color={palette.fg} style={{ marginTop: 1 }} />
      <Text style={[styles.bannerText, { color: palette.fg }]}>{children}</Text>
    </View>
  );
}

export const text = StyleSheet.create({
  h2: { fontSize: 16, fontWeight: '600', color: colors.text },
  h3: { fontSize: 14, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  small: { fontSize: 12, color: colors.muted },
  strong: { fontWeight: '600', color: colors.text },
  link: { fontSize: 14, fontWeight: '600', color: colors.primary },
});

export const layout = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  grid2: { flexDirection: 'row', gap: 12 },
  grow: { flex: 1 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 32, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: space.sm },
  headerText: { flex: 1, gap: 2 },
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
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48, // cible tactile confortable (accessibilité)
  },
  buttonLarge: { paddingVertical: 18, borderRadius: 14 },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 40 },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  buttonLabelLarge: { fontSize: 17 },
  buttonLabelSmall: { fontSize: 14 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeLabel: { fontSize: 12, fontWeight: '600' },
  banner: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
