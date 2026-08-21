import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, fullWidth = true }: ButtonProps) {
  const c = useThemeColors();
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary' ? c.primary : variant === 'danger' ? c.danger : variant === 'secondary' ? c.primarySoft : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : variant === 'secondary' ? c.primary : c.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1, width: fullWidth ? '100%' : undefined },
        variant === 'ghost' && { paddingVertical: spacing.sm },
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={fg} size="small" /> : icon}
        <Text style={[styles.text, { color: fg }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 15, fontWeight: '600' },
});
