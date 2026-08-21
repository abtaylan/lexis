import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useLocale } from '@/i18n';
import { authApi } from '@/api/auth';
import { languagesApi } from '@/api/languages';
import type { Language } from '@/api/types';
import { getErrorMessage } from '@/utils/errors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';

export default function RegisterScreen() {
  const { t, mt } = useLocale();
  const c = useThemeColors();
  const [step, setStep] = useState<'account' | 'language'>('account');

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [languages, setLanguages] = useState<Language[]>([]);
  const [nativeLang, setNativeLang] = useState<string | null>('tr');
  const [learningLang, setLearningLang] = useState<string | null>('en');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    languagesApi.getAll().then(setLanguages).catch(() => {});
  }, []);

  const validateAccount = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return t('emailInvalidError');
    if ((username || '').length > 0 && username.trim().length < 3) return t('usernameMinError');
    if (password.length < 6) return t('passwordMinError');
    if (!displayName.trim()) return t('fullNameLabel');
    return '';
  };

  const goToLanguageStep = () => {
    const err = validateAccount();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep('language');
  };

  const handleRegister = async () => {
    if (!nativeLang || !learningLang) return;
    if (nativeLang === learningLang) {
      setError(t('sameLangError'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.register({
        email: email.trim(),
        password,
        display_name: displayName.trim(),
        username: username.trim() || undefined,
        native_lang: nativeLang,
        learning_lang: learningLang,
      });
      router.push({ pathname: '/(auth)/verify-otp', params: { email: email.trim(), purpose: 'register' } });
    } catch (e) {
      setError(getErrorMessage(e, t('registerFailedGeneric')));
    } finally {
      setLoading(false);
    }
  };

  const langOptions = languages.map((l) => ({ value: l.code, label: `${l.flag_emoji ?? ''} ${l.name_native}`.trim() }));

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: c.text }]}>{t('registerTitleText')}</Text>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('registerSubtitleText')}</Text>

      <View style={styles.stepsRow}>
        <StepDot active={step === 'account'} label={mt('registerStepAccount')} color={c.primary} muted={c.textMuted} />
        <View style={[styles.stepLine, { backgroundColor: c.border }]} />
        <StepDot active={step === 'language'} label={mt('registerStepLanguage')} color={c.primary} muted={c.textMuted} />
      </View>

      {step === 'account' ? (
        <>
          <TextField label={t('fullNameLabel')} value={displayName} onChangeText={setDisplayName} />
          <TextField label={`${t('usernameLabel')} (opsiyonel)`} value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TextField label={t('emailLabel')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField label={t('passwordLabel')} value={password} onChangeText={setPassword} secureTextEntry />
          <Text style={[styles.hint, { color: c.textMuted }]}>{t('passwordHintText')}</Text>

          {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

          <Button title={mt('continueBtn')} onPress={goToLanguageStep} />
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('nativeLangSelectLabel')}</Text>
          <ChipSelect options={langOptions} value={nativeLang} onChange={setNativeLang} />

          <Text style={[styles.label, { color: c.textSecondary, marginTop: spacing.lg }]}>{t('learningLangSelectLabel')}</Text>
          <ChipSelect options={langOptions} value={learningLang} onChange={setLearningLang} />

          {error ? <Text style={[styles.error, { color: c.danger, marginTop: spacing.md }]}>{error}</Text> : null}

          <View style={{ marginTop: spacing.xl }}>
            <Button title={t('createAccountBtn')} onPress={handleRegister} loading={loading} />
          </View>
          <Pressable onPress={() => setStep('account')} style={{ marginTop: spacing.md, alignItems: 'center' }}>
            <Text style={{ color: c.textSecondary }}>{'← ' + mt('otpBackBtn')}</Text>
          </Pressable>
        </>
      )}

      <View style={styles.footer}>
        <Text style={{ color: c.textSecondary }}>{t('haveAccountQuestion')} </Text>
        <Pressable onPress={() => router.replace('/(auth)/login')}>
          <Text style={[styles.link, { color: c.primary }]}>{t('loginLinkText')}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

function StepDot({ active, label, color, muted }: { active: boolean; label: string; color: string; muted: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: active ? color : muted }} />
      <Text style={{ fontSize: 11, color: active ? color : muted, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginTop: spacing.lg },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: spacing.lg },
  stepsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, gap: 8 },
  stepLine: { flex: 1, height: 1.5, marginTop: -14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  hint: { fontSize: 11, marginTop: -spacing.sm, marginBottom: spacing.md },
  error: { fontSize: 13, marginBottom: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  link: { fontSize: 13, fontWeight: '600' },
});
