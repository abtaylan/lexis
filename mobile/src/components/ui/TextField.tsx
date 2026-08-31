import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  /**
   * true ise sağda göz ikonu gösterilir; basınca şifre görünür/gizli yapılır
   * (secureTextEntry prop'u varsa onu override eder). Login/Register/Reset
   * şifre alanlarında kullanılıyor — kullanıcı isteği, 31 Ağustos 2026:
   * "şifre girilen alanda göz iconu olsun, şifreyi girince kontrol etmek için".
   */
  secureToggle?: boolean;
}

export function TextField({ label, error, style, secureToggle, secureTextEntry, ...props }: TextFieldProps) {
  const c = useThemeColors();
  const [visible, setVisible] = useState(false);
  const isSecure = secureToggle ? !visible : secureTextEntry;

  return (
    <View style={{ width: '100%', marginBottom: spacing.md }}>
      {label ? <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={c.textMuted}
          secureTextEntry={isSecure}
          style={[
            styles.input,
            { borderColor: error ? c.danger : c.border, color: c.text, backgroundColor: c.surface },
            secureToggle && styles.inputWithIcon,
            style,
          ]}
          {...props}
        />
        {secureToggle && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
          >
            {visible ? <EyeOff size={18} color={c.textMuted} /> : <Eye size={18} color={c.textMuted} />}
          </Pressable>
        )}
      </View>
      {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputWrap: { justifyContent: 'center' },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: 15,
  },
  inputWithIcon: { paddingRight: spacing.md + 26 },
  eyeBtn: { position: 'absolute', right: spacing.md - 4, padding: 4 },
  error: { fontSize: 12, marginTop: 4 },
});
