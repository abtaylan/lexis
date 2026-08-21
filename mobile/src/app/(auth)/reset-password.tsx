import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useLocale } from '@/i18n';
import { authApi } from '@/api/auth';
import { getErrorMessage } from '@/utils/errors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordScreen() {
  const { mt } = useLocale();
  const c = useThemeColors();
  const params = useLocalSearchParams<{ email: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim(), code: code.trim(), new_password: newPassword });
      setDone(true);
    } catch (e) {
      setError(getErrorMessage(e, mt('genericErrorMsg')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: c.text }]}>{mt('resetTitle')}</Text>

      {done ? (
        <>
          <Text style={[styles.success, { color: c.success }]}>{mt('resetSuccessMsg')}</Text>
          <Button title={mt('backToLoginBtn')} onPress={() => router.replace('/(auth)/login')} />
        </>
      ) : (
        <>
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField label={mt('resetCodeLabel')} value={code} onChangeText={setCode} keyboardType="number-pad" />
          <TextField label={mt('resetNewPasswordLabel')} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
          <Button title={mt('resetSubmitBtn')} onPress={handleSubmit} loading={loading} />
        </>
      )}

      <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.backRow}>
        <Text style={{ color: c.textSecondary, fontSize: 13 }}>{'← ' + mt('backToLoginBtn')}</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginTop: spacing.xxl, marginBottom: spacing.xl, textAlign: 'center' },
  success: { fontSize: 13, textAlign: 'center', marginBottom: spacing.lg },
  error: { fontSize: 13, marginBottom: spacing.md, textAlign: 'center' },
  backRow: { alignItems: 'center', marginTop: spacing.lg },
});
