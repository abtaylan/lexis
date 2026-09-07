import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useLocale } from '@/i18n';
import { authApi } from '@/api/auth';
import { useAuth } from '@/store/auth';
import { getErrorMessage } from '@/utils/errors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const { t } = useLocale();
  const c = useThemeColors();
  const { login: loginToStore, updateUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // NOT (7 Eylül 2026 kullanıcı isteği): "otp sadece üye olurken ... üye
  // olduktan sonra ilk kez girerken otp gelsin, bundan sonra gelmesin" —
  // backend artık kayıttan sonraki ilk giriş dışında OTP istemiyor, doğrudan
  // access_token ile dönüyor. 'pending' alanı yoksa (yani access_token
  // geldiyse) OTP ekranına hiç gitmeden direkt oturum açılıp dashboard'a
  // geçiliyor; 'pending: true' geldiyse (ilk giriş) eskisi gibi OTP ekranına
  // yönlendiriliyor.
  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
      if ('access_token' in res) {
        await loginToStore(res.access_token, res.refresh_token, {
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
        return;
      }
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
