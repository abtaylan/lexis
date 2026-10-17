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

  // DUZELTME (17 Ekim 2026 kullanici bildirimi, Android'de canli test): "Kod
  // Gonder" basariyla calisiyor, e-posta geliyor, ama kodu girecegi ekran hic
  // acilmiyordu. Kok neden: bu ekran sent=true olunca SADECE bir sonraki
  // "Sifreyi Sifirla" butonunu gosteriyordu -- reset-password ekranina gecis
  // kullanicinin bu ikinci, ayirt edilmesi zor butona manuel basmasina
  // bagliydi (web'deki ayni iki adimli desenin birebir ayni -- kod incelemesi
  // reset-password.tsx'in ve bu akisin kendisinin bozuk olmadigini dogruladi,
  // backend/Supabase loglarinda da bu cagriyla ilgili hata yok). Riski
  // dusurmek icin artik kod basariyla gonderilir gonderilmez OTOMATIK olarak
  // reset-password ekranina geciliyor -- kullanicinin ekstra bir butona
  // basmasi gerekmiyor, "ekran gelmiyor" hissi ortadan kalkiyor.
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      router.push({ pathname: '/(auth)/reset-password', params: { email: email.trim() } });
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

      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Button title={mt('forgotSubmitBtn')} onPress={handleSubmit} loading={loading} />

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
