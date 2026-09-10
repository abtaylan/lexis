// src/components/GoogleSignInButton.tsx — Google ile Giris/Kayit butonu.
// AppleSignInButton.tsx ile BIREBIR AYNI desen (kullanici istegi, 10 Eylul
// 2026: "mobilde apple girisi gibi google girisini de eklememiz lazim") --
// backend zaten hem web hem native icin ayni /auth/google ucunu kullaniyor
// (bkz. backend/app/api/routes/auth.py::google_sign_in, Apple ile AYNI
// sign_in_with_id_token deseni), o yuzden burada SADECE native Google
// kimlik dogrulamasi (id_token elde etme) + authApi.googleSignIn cagrisi
// var.
//
// KURULUM GEREKSINIMI (bilincli sinir -- Behcet'in kendi Google Cloud/
// Supabase hesabinda yapmasi gereken, buradan yapilamayan tek adim):
// 1) Google Cloud Console'da bir OAuth 2.0 Client ID (tip: Web application)
//    olustur -- bu "webClientId" olarak GOOGLE_WEB_CLIENT_ID sabitine
//    yazilacak. Web login zaten calistigi icin (backend docstring'i,
//    "Google ile Giris (web, Google Identity Services)") muhtemelen BU
//    zaten var -- ayni Web Client ID burada da kullanilabilir.
// 2) Ayni Google Cloud projesinde bir "iOS" turu OAuth Client ID daha
//    olustur (bundle identifier: app.json/app.config'teki ios.bundleIdentifier
//    ile birebir ayni olmali) -- REVERSED_CLIENT_ID degerini app.json'daki
//    google-signin plugin'inin iosUrlScheme alanina yaz (bkz. app.json'daki
//    TODO yorumu).
// 3) Supabase Dashboard -> Authentication -> Providers -> Google ->
//    "Authorized Client IDs" alanina yukaridaki iOS Client ID'yi de ekle
//    (Web Client ID zaten kayitli olmali) -- yoksa sign_in_with_id_token
//    "Unacceptable audience" hatasi verir.
// GOOGLE_WEB_CLIENT_ID sabiti asagida -- gercek degeri Behcet doldurmali.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import { authApi } from '@/api/auth';
import { useAuth } from '@/store/auth';
import { useLocale } from '@/i18n';
import { spacing, radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

// TODO (Behcet): Google Cloud Console'dan alinacak GERCEK Web Client ID.
// Bos birakilirsa buton hicbir sey yapmadan gizli kalir (asagida).
const GOOGLE_WEB_CLIENT_ID = '';

interface Props {
  onError: (message: string) => void;
  onStart?: () => void;
  onFinish?: () => void;
}

export function GoogleSignInButton({ onError, onStart, onFinish }: Props) {
  const { t } = useLocale();
  const { login: loginToStore, updateUser } = useAuth();
  const c = useThemeColors();
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    if (!GOOGLE_WEB_CLIENT_ID) return;
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    setConfigured(true);
  }, []);

  // Yapilandirma tamamlanmadan (GOOGLE_WEB_CLIENT_ID bos oldugu surece)
  // buton gizli -- yarim/hatali bir giris denemesi yerine.
  if (!GOOGLE_WEB_CLIENT_ID || !configured) return null;

  const handlePress = async () => {
    onStart?.();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response) || !response.data.idToken) {
        onError(t('googleSignInFailedMsg'));
        return;
      }

      const res = await authApi.googleSignIn({ id_token: response.data.idToken });

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
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return;
      onError(t('googleSignInFailedMsg'));
    } finally {
      onFinish?.();
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={[styles.logoCircle, { backgroundColor: c.background }]}>
          <Text style={styles.logoG}>G</Text>
        </View>
        <Text style={[styles.label, { color: c.text }]}>{t('continueWithGoogleBtn')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  button: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  logoCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  logoG: { color: '#4285F4', fontWeight: '800', fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600' },
});
