// src/components/AppleSignInButton.tsx — Apple ile Giris/Kayit butonu.
// Bilal Arikan'in geri bildirimi (7 Eylul 2026 WhatsApp): "sifre sifirlama
// akisinda cok fazla token giriyorsun, hesabi Apple hesabi uzerinde tutma
// gibi bir sey olmuyor mu, oyunlarda Game Center hesabini otomatik goruyor
// ya" -- bu bileseni login.tsx ve register.tsx'e ekleyerek kullanicinin
// sifre/OTP akisina hic girmeden tek dokunusla (Face ID/Touch ID) giris
// yapmasini sagliyoruz. Yalnizca iOS'ta ve gercek cihaz/simulatorde Apple
// kimlik dogrulamasi mumkunse gorunur (isAvailableAsync).
//
// ACIL DUZELTME (21 Eylul 2026, "acilir acilmaz hicbir hata gostermeden
// kapaniyor" olayi devam ederken bulundu): bu dosya da GoogleSignInButton.tsx
// ile AYNI login.tsx/register.tsx ekranlarinda render ediliyor ve AYNI riski
// tasiyordu -- `import * as AppleAuthentication from 'expo-apple-authentication'`
// STATIK importu, bu native modul telefondaki YUKLU build'e henuz
// linklenmemisse (app.json'daki plugin kaydi native koda ancak SONRAKI bir
// EAS Build ile yansir -- App Store'daki canli build'in bu plugin'den once
// derlenmis olma ihtimali var, zira "EAS Submit — iOS" workflow'u 19
// Eylul'den beri basarisiz, yani App Store'a yeni bir native build hic
// gitmemis olabilir) dosya degerlendirilirken -- login.tsx/register.tsx
// mount olur olmaz -- coker. Google Sign-In/AdMob'daki BIREBIR AYNI hata
// sinifi (bkz. o dosyalardaki ayni tarihli notlar) -- AppErrorBoundary bunu
// YAKALAYAMAZ (import-time hatasi, render agaci degil).
//
// Cozum BIREBIR AYNI desen: STATIK import yerine module-scope'ta try/catch
// icinde require(). Native modul yoksa (henuz linklenmemis bir build) buton
// sessizce gizli kaliyor, uygulamanin geri kalani normal calismaya devam
// ediyor. Native modul linklenmis bir build'de hicbir davranis degismiyor.
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { authApi } from '@/api/auth';
import { useAuth } from '@/store/auth';
import { useLocale } from '@/i18n';
import { spacing } from '@/constants/theme';
import { useThemeMode } from '@/store/theme';

type AppleAuthenticationModule = typeof import('expo-apple-authentication');

let AppleAuthentication: AppleAuthenticationModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AppleAuthentication = require('expo-apple-authentication');
} catch {
  AppleAuthentication = null;
}

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
    if (Platform.OS !== 'ios' || !AppleAuthentication) return;
    AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  if (Platform.OS !== 'ios' || !available || !AppleAuthentication) return null;

  const handlePress = async () => {
    if (!AppleAuthentication) return;
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
