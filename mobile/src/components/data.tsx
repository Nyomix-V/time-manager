// Affichage des données : KPI, barres, frise du jour, listes, états de chargement.
import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { Button, Card, text, toneColors, type IconName, type Tone } from './ui';

export function Kpi({ label, value, hint, hintTone }: { label: string; value: string; hint?: string; hintTone?: Tone }) {
  return (
    <Card style={styles.kpi}>
      <Text style={text.muted}>{label}</Text>
      <Text style={styles.kpiValue} accessibilityLabel={`${label} : ${value}`}>
        {value}
      </Text>
      {hint && <Text style={[styles.kpiHint, { color: hintTone ? toneColors[hintTone].fg : colors.muted }]}>{hint}</Text>}
    </Card>
  );
}

export function ProgressBar({ value, tone = 'info' }: { value: number; tone?: Tone }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}>
      <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: tone === 'info' ? colors.primary : toneColors[tone].fg }]} />
    </View>
  );
}

export type Bar = { label: string; value: number; highlight?: boolean };

/** Barres verticales simples. `target` trace une ligne d'objectif. */
export function BarChart({ bars, max, target, describe }: { bars: Bar[]; max: number; target?: number; describe: string }) {
  const scale = (v: number) => `${Math.min(100, (v / max) * 100)}%` as const;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={describe}>
      <View style={styles.chart}>
        {target !== undefined && <View style={[styles.target, { bottom: scale(target) }]} />}
        {bars.map((bar, i) => (
          <View key={i} style={styles.barColumn}>
            <View style={[styles.bar, { height: scale(bar.value), backgroundColor: bar.highlight ? '#F59F00' : colors.primary }]} />
          </View>
        ))}
      </View>
      <View style={styles.chartLabels}>
        {bars.map((bar, i) => (
          <Text key={i} style={styles.chartLabel}>
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export type TimelineItem = { title: string; value?: string; state: 'done' | 'live' | 'pending' };

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={[styles.tlItem, i === items.length - 1 && { paddingBottom: 0 }]}>
          {i < items.length - 1 && <View style={styles.tlLine} />}
          <View style={[styles.tlDot, styles[`tl_${item.state}`]]} />
          <Text style={[text.h3, styles.grow, item.state === 'pending' && { color: colors.muted }]}>{item.title}</Text>
          {item.value && <Text style={[text.body, item.state === 'pending' && { color: colors.muted }]}>{item.value}</Text>}
        </View>
      ))}
    </View>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} accessibilityElementsHidden>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

/** Ligne de liste : icône ou avatar à gauche, contenu, élément à droite. */
export function Row({
  left,
  title,
  subtitle,
  right,
  onPress,
  disabled,
  chevron = !!onPress,
  first,
}: {
  left?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  chevron?: boolean;
  first?: boolean;
}) {
  const content = (
    <>
      {left}
      <View style={styles.grow}>
        <Text style={[text.body, styles.rowTitle]}>{title}</Text>
        {subtitle && <Text style={text.small}>{subtitle}</Text>}
      </View>
      {right}
      {chevron && <Feather name="chevron-right" size={18} color={colors.muted} />}
    </>
  );
  const style = [styles.row, !first && styles.rowBorder, disabled && { opacity: 0.45 }];
  return onPress ? (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [...style, pressed && { backgroundColor: colors.bg }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

export function RowIcon({ name }: { name: IconName }) {
  return <Feather name={name} size={18} color={colors.muted} />;
}

/** Chargement, erreur ou liste vide. Renvoie null quand les données sont prêtes. */
export function StateView({
  loading,
  error,
  onRetry,
  empty,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  empty?: string | false;
}) {
  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <Card style={styles.state}>
        <Feather name="wifi-off" size={22} color={colors.danger} />
        <Text style={[text.body, { textAlign: 'center' }]}>{error}</Text>
        <Button label="Réessayer" variant="secondary" small onPress={onRetry} />
      </Card>
    );
  }
  if (empty) {
    return (
      <View style={styles.state}>
        <Feather name="inbox" size={22} color={colors.muted} />
        <Text style={[text.muted, { textAlign: 'center' }]}>{empty}</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  kpi: { flex: 1, padding: 14, gap: 4 },
  kpiValue: { fontSize: 22, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  kpiHint: { fontSize: 12, fontWeight: '500' },
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  chart: { height: 110, flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  // Trait plein : les bordures en pointillés sur un seul côté ne s'affichent pas sur Android.
  target: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: colors.danger, opacity: 0.6 },
  barColumn: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', maxWidth: 32, borderTopLeftRadius: 6, borderTopRightRadius: 6, minHeight: 2 },
  chartLabels: { flexDirection: 'row', gap: 10, marginTop: 6 },
  chartLabel: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.muted },
  tlItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14 },
  tlLine: { position: 'absolute', left: 7, top: 16, bottom: -2, width: 2, backgroundColor: colors.border },
  tlDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.surface },
  tl_done: { backgroundColor: colors.primary },
  tl_live: { backgroundColor: colors.primaryLight },
  tl_pending: { borderColor: colors.border },
  avatar: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 52 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { fontWeight: '500' },
  state: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 28 },
});
