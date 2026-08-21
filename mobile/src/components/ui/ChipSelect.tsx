import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';

interface ChipOption {
  value: string;
  label: string;
}

interface ChipSelectProps {
  options: ChipOption[];
  value: string | null;
  onChange: (value: string) => void;
}

export function ChipSelect({ options, value, onChange }: ChipSelectProps) {
  const c = useThemeColors();
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.chip,
              {
                borderColor: selected ? c.primary : c.border,
                backgroundColor: selected ? c.primarySoft : c.surface,
              },
            ]}
          >
            <Text style={{ color: selected ? c.primary : c.textSecondary, fontSize: 13, fontWeight: '600' }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
