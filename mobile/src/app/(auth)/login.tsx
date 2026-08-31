import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useLocale } from '@/i18n';
import { authApi } from '@/api/auth';
import { getErrorMessage } from '@/utils/errors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const { t } = useLocale();
  const c = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await authApi.login({ email: email.trim(), password });
      router.push({ pathname: '/(auth)/verify-otp', params: { email: email.trim(), purpose: 'login' } });
    } catch (e) {
      setError(getErrorMessage(e, t('loginErrorMsg')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Image source={require('../../../assets/logo-icon.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: c.text }]}>{t('loginTitle')}</Text>
      </View>

      <TextField
        label={t('emailLabel')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label={t('passwordLabel')}
        value={password}
        onChangeText={setPassword}
        secureToggle
        textContentType="password"
      />

      {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

      <Button title={loading ? t('loggingInBtn') : t('loginBtnText')} onPress={handleLogin} loading={loading} />

      <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.linkRow}>
        <Text style={[styles.link, { color: c.primary }]}>{t('forgotPasswordLink')}</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={{ color: c.textSecondary }}>{t('noAccountQuestion')} </Text>
        <Pressable onPress={() => router.push('/(auth)/register')}>
          <Text style={[styles.link, { color: c.primary }]}>{t('registerLinkText')}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xl },
  logo: { width: 64, height: 64, marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '700' },
  error: { fontSize: 13, marginBottom: spacing.md },
  linkRow: { alignItems: 'flex-end', marginTop: spacing.sm },
  link: { fontSize: 13, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
});
