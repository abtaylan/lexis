import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useLocale } from '@/i18n';
import { authApi } from '@/api/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordScreen() {
  const { mt } = useLocale();
  const c = useThemeColors();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>{mt('forgotTitle')}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>{mt('forgotSubtitle')}</Text>
      </View>

      {sent ? (
        <>
          <Text style={[styles.success, { color: c.success }]}>{mt('forgotEmailSentMsg')}</Text>
          <Button title={mt('resetTitle')} onPress={() => router.push({ pathname: '/(auth)/reset-password', params: { email: email.trim() } })} />
        </>
      ) : (
        <>
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button title={mt('forgotSubmitBtn')} onPress={handleSubmit} loading={loading} />
        </>
      )}

      <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.backRow}>
        <Text style={{ color: c.textSecondary, fontSize: 13 }}>{'← ' + mt('backToLoginBtn')}</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xxl, marginBottom: spacing.xl },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
  success: { fontSize: 13, textAlign: 'center', marginBottom: spacing.lg },
  backRow: { alignItems: 'center', marginTop: spacing.lg },
});
