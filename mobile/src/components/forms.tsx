// Champs de formulaire : texte, date / heure, choix, jours de la semaine, sélecteur de vue.
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { WEEKDAYS, formatDate, formatTime } from '@/domain/time';
import { colors, radius } from '@/theme/tokens';
import type { IconName } from './ui';

function Label({ label, required, nativeID }: { label: string; required?: boolean; nativeID?: string }) {
  return (
    <Text style={styles.label} nativeID={nativeID}>
      {label}
      {required && <Text style={{ color: colors.danger }}> *</Text>}
    </Text>
  );
}

export function TextField({
  label,
  required,
  hint,
  error,
  icon,
  readOnly,
  ...input
}: TextInputProps & { label: string; required?: boolean; hint?: string; error?: string | null; icon?: IconName; readOnly?: boolean }) {
  const id = `field-${label}`;
  return (
    <View style={styles.field}>
      <Label label={label} required={required} nativeID={id} />
      <View style={[styles.input, readOnly && styles.readOnly, !!error && { borderColor: colors.danger }]}>
        {icon && <Feather name={icon} size={18} color={colors.muted} />}
        <TextInput
          {...input}
          editable={!readOnly && input.editable !== false}
          accessibilityLabelledBy={id}
          placeholderTextColor={colors.muted}
          style={[styles.inputText, input.multiline && styles.multiline]}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Date ou heure : ouvre le sélecteur natif d'Android. */
export function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate,
  required,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  required?: boolean;
}) {
  const [showIos, setShowIos] = useState(false);
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        is24Hour: true,
        minimumDate,
        onChange: (event, date) => event.type === 'set' && date && onChange(date),
      });
    } else {
      setShowIos((v) => !v);
    }
  };
  const display = mode === 'date' ? formatDate(value) : formatTime(value);
  return (
    <View style={styles.field}>
      <Label label={label} required={required} />
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${label} : ${display}`} style={styles.input}>
        <Feather name={mode === 'date' ? 'calendar' : 'clock'} size={18} color={colors.muted} />
        <Text style={styles.inputText}>{display}</Text>
      </Pressable>
      {showIos && (
        <DateTimePicker value={value} mode={mode} display="inline" minimumDate={minimumDate} onChange={(_, date) => date && onChange(date)} />
      )}
    </View>
  );
}

export type Option<T extends string | number> = { value: T; label: string };

/** Choix unique parmi quelques options (pastilles). */
export function Chips<T extends string | number>({
  label,
  options,
  value,
  onChange,
  required,
}: {
  label?: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  required?: boolean;
}) {
  return (
    <View style={styles.field}>
      {label && <Label label={label} required={required} />}
      <View style={styles.chips} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Jours travaillés : 1 = lundi … 7 = dimanche. */
export function DaysPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  return (
    <View style={styles.field}>
      <Label label="Jours travaillés" required />
      <View style={styles.days}>
        {WEEKDAYS.map((name, i) => {
          const day = i + 1;
          const on = value.includes(day);
          return (
            <Pressable
              key={day}
              onPress={() => onChange(on ? value.filter((d) => d !== day) : [...value, day].sort())}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={name}
              style={[styles.day, on && styles.chipOn, on && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.dayText, on && { color: colors.onPrimary }]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Bascule entre deux ou trois vues (ex. « Nouvelle demande » / « Historique »). */
export function Segmented<T extends string>({ options, value, onChange }: { options: Option<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentOn]}
          >
            <Text style={[styles.segmentText, selected && { color: colors.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: colors.text },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  readOnly: { backgroundColor: colors.bg, borderStyle: 'dashed' },
  inputText: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 10 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: colors.muted },
  error: { fontSize: 12, color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.text },
  chipTextOn: { color: colors.primary },
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, height: 42, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  dayText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: 12, backgroundColor: '#E9ECF4' },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segmentOn: { backgroundColor: colors.surface, elevation: 1 },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.muted },
});
