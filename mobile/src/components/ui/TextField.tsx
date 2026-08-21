import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function TextField({ label, error, style, ...props }: TextFieldProps) {
  const c = useThemeColors();
  return (
    <View style={{ width: '100%', marginBottom: spacing.md }}>
      {label ? <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={c.textMuted}
        style={[
          styles.input,
          { borderColor: error ? c.danger : c.border, color: c.text, backgroundColor: c.surface },
          style,
        ]}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: 15,
  },
  error: { fontSize: 12, marginTop: 4 },
});
