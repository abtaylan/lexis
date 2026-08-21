import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useLocale } from '@/i18n';
import { authApi } from '@/api/auth';
import { useAuth } from '@/store/auth';
import { getErrorMessage } from '@/utils/errors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';

const RESEND_COOLDOWN = 60;

export default function VerifyOtpScreen() {
  const { mt } = useLocale();
  const c = useThemeColors();
  const { login, updateUser } = useAuth();
  const params = useLocalSearchParams<{ email: string; purpose: 'login' | 'register' }>();
  const email = params.email ?? '';
  const purpose = (params.purpose ?? 'login') as 'login' | 'register';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.trim().length < 4) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ email, code: code.trim(), purpose });
      await login(res.access_token, res.refresh_token, {
        id: res.user.id,
        email: res.user.email,
        username: '',
        display_name: res.user.display_name,
        is_admin: false,
        daily_goal: 5,
        created_at: '',
      });
      try {
        const fullUser = await authApi.getMe();
        await updateUser(fullUser);
      } catch {
        /* profil sonradan da yenilenebilir */
      }
      router.replace('/(app)/dashboard');
    } catch (e) {
      setError(getErrorMessage(e, mt('otpWrongCode')));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await authApi.resendOtp({ email, purpose });
      setCooldown(RESEND_COOLDOWN);
    } catch {
      /* sessiz */
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>{mt('otpTitle')}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>{mt('otpSubtitleTpl', { email })}</Text>
      </View>

      <TextField
        label={mt('otpCodeLabel')}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.codeInput}
      />

      {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

      <Button title={loading ? mt('otpVerifyingBtn') : mt('otpVerifyBtn')} onPress={handleVerify} loading={loading} />

      <Pressable onPress={handleResend} disabled={cooldown > 0} style={styles.resendRow}>
        <Text style={{ color: cooldown > 0 ? c.textMuted : c.primary, fontWeight: '600', fontSize: 13 }}>
          {cooldown > 0 ? mt('otpResendCooldownTpl', { n: cooldown }) : mt('otpResendBtn')}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Text style={{ color: c.textSecondary, fontSize: 13 }}>{'← ' + mt('otpBackBtn')}</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xxl, marginBottom: spacing.xl },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
  codeInput: { textAlign: 'center', fontSize: 22, letterSpacing: 6, fontWeight: '700' },
  error: { fontSize: 13, marginBottom: spacing.md, textAlign: 'center' },
  resendRow: { alignItems: 'center', marginTop: spacing.lg },
  backRow: { alignItems: 'center', marginTop: spacing.md },
});
