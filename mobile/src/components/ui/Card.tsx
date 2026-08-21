import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';

export function Card({ style, ...props }: ViewProps) {
  const c = useThemeColors();
  return (
    <View
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
});
