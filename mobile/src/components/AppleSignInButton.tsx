// src/components/AppleSignInButton.tsx — Apple ile Giris/Kayit butonu.
// Bilal Arikan'in geri bildirimi (7 Eylul 2026 WhatsApp): "sifre sifirlama
// akisinda cok fazla token giriyorsun, hesabi Apple hesabi uzerinde tutma
// gibi bir sey olmuyor mu, oyunlarda Game Center hesabini otomatik goruyor
// ya" -- bu bileseni login.tsx ve register.tsx'e ekleyerek kullanicinin
// sifre/OTP akisina hic girmeden tek dokunusla (Face ID/Touch ID) giris
// yapmasini sagliyoruz. Yalnizca iOS'ta ve gercek cihaz/simulatorde Apple
// kimlik dogrulamasi mumkunse gorunur (isAvailableAsync).
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { authApi } from '@/api/auth';
import { useAuth } from '@/store/auth';
import { useLocale } from '@/i18n';
import { spacing } from '@/constants/theme';
import { useThemeMode } from '@/store/theme';

interface Props {
  onError: (message: string) => void;
  onStart?: () => void;
  onFinish?: () => void;
}

export function AppleSignInButton({ onError, onStart, onFinish }: Props) {
  const { t } = useLocale();
  const { login: loginToStore, updateUser } = useAuth();
  const { scheme } = useThemeMode();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  const handlePress = async () => {
    onStart?.();
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        onError(t('appleSignInFailedMsg'));
        return;
      }
      // Apple, ad-soyadi SADECE ilk yetkilendirmede doner -- bu yuzden
      // istemci tarafinda yakalanip backend'e iletiliyor (backend bunu
      // sonraki giriglerde bir daha alamayacagi icin ilk seferde kaydediyor).
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ').trim()
        : undefined;

      const res = await authApi.appleSignIn({
        id_token: credential.identityToken,
        full_name: fullName || undefined,
      });

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
        const me = await authApi.getMe();
        await updateUser(me);
      } catch {
        /* profil sonradan da yenilenebilir */
      }
      router.replace('/(app)/dashboard');
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === 'ERR_REQUEST_CANCELED') return;
      onError(t('appleSignInFailedMsg'));
    } finally {
      onFinish?.();
    }
  };

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={
          scheme === 'dark'
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={10}
        style={styles.button}
        onPress={handlePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  button: { width: '100%', height: 48 },
});
