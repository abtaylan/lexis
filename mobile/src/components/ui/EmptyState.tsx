import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const c = useThemeColors();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: c.textSecondary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: c.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.xxl, alignItems: 'center', paddingHorizontal: spacing.lg },
  title: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 12, marginTop: 4, textAlign: 'center' },
});
