// Choix d'une période : semaine, mois (avec flèches) ou dates libres.
// Partagé par « Mes heures », la fiche salarié et le tableau d'équipe.
import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, endOfMonth, formatDate, startOfDay, startOfMonth, startOfWeek } from '@/domain/time';
import { colors } from '@/theme/tokens';
import { DateField, Segmented } from './forms';
import { layout, text } from './ui';

export type PeriodMode = 'week' | 'month' | 'custom';

export function usePeriod(initialMode: PeriodMode = 'week') {
  const [mode, setModeState] = useState<PeriodMode>(initialMode);
  const [anchor, setAnchor] = useState(() => new Date());
  const [customFrom, setCustomFrom] = useState(() => addDays(new Date(), -30));
  const [customTo, setCustomTo] = useState(() => new Date());

  const { from, to } = useMemo(() => periodOf(mode, anchor, customFrom, customTo), [mode, anchor, customFrom, customTo]);

  return {
    mode,
    from,
    /** Dernier jour de la période (à minuit) : utiliser endOfDay(to) pour une requête. */
    to,
    isCurrent: to >= startOfDay(new Date()),
    setMode: (next: PeriodMode) => {
      setModeState(next);
      setAnchor(new Date());
    },
    move: (direction: -1 | 1) =>
      setAnchor((d) => (mode === 'week' ? addDays(d, 7 * direction) : new Date(d.getFullYear(), d.getMonth() + direction, 1))),
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
  };
}

export type Period = ReturnType<typeof usePeriod>;

export function PeriodPicker({ period }: { period: Period }) {
  const { mode, from, to, isCurrent, move } = period;
  return (
    <>
      <Segmented
        options={[
          { value: 'week', label: 'Semaine' },
          { value: 'month', label: 'Mois' },
          { value: 'custom', label: 'Période' },
        ]}
        value={mode}
        onChange={period.setMode}
      />

      {mode === 'custom' ? (
        <View style={layout.grid2}>
          <View style={layout.grow}>
            <DateField label="Du" value={period.customFrom} onChange={period.setCustomFrom} />
          </View>
          <View style={layout.grow}>
            <DateField label="Au" value={period.customTo} onChange={period.setCustomTo} minimumDate={period.customFrom} />
          </View>
        </View>
      ) : (
        <View style={styles.periodNav}>
          <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel="Période précédente" hitSlop={10} style={styles.arrow}>
            <Feather name="chevron-left" size={22} color={colors.primary} />
          </Pressable>
          <Text style={[text.h3, styles.periodLabel]}>{periodLabel(mode, from, to)}</Text>
          <Pressable
            onPress={() => move(1)}
            disabled={isCurrent}
            accessibilityRole="button"
            accessibilityLabel="Période suivante"
            accessibilityState={{ disabled: isCurrent }}
            hitSlop={10}
            style={[styles.arrow, isCurrent && { opacity: 0.3 }]}
          >
            <Feather name="chevron-right" size={22} color={colors.primary} />
          </Pressable>
        </View>
      )}
    </>
  );
}

function periodOf(mode: PeriodMode, anchor: Date, customFrom: Date, customTo: Date) {
  if (mode === 'week') return { from: startOfWeek(anchor), to: addDays(startOfWeek(anchor), 6) };
  if (mode === 'month') return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
  return { from: startOfDay(customFrom), to: startOfDay(customTo) };
}

export function periodLabel(mode: PeriodMode, from: Date, to: Date) {
  if (mode === 'month') return from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return `${from.getDate()} ${from.toLocaleDateString('fr-FR', { month: 'short' })} → ${formatDate(to)}`;
}

const styles = StyleSheet.create({
  periodNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  periodLabel: { flex: 1, textAlign: 'center', textTransform: 'capitalize' },
});
