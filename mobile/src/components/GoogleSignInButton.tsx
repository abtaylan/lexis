// src/components/GoogleSignInButton.tsx — Google ile Giris/Kayit butonu.
// AppleSignInButton.tsx ile BIREBIR AYNI desen (kullanici istegi, 10 Eylul
// 2026: "mobilde apple girisi gibi google girisini de eklememiz lazim") --
// backend zaten hem web hem native icin ayni /auth/google ucunu kullaniyor
// (bkz. backend/app/api/routes/auth.py::google_sign_in, Apple ile AYNI
// sign_in_with_id_token deseni), o yuzden burada SADECE native Google
// kimlik dogrulamasi (id_token elde etme) + authApi.googleSignIn cagrisi
// var.
//
// GUNCELLEME (12 Eylul 2026, V2 oncelik #6): GOOGLE_WEB_CLIENT_ID artik
// BOS DEGIL -- web'in zaten canlida kullandigi GERCEK Web Client ID buraya
// tasindi (bkz. web/src/components/GoogleSignInButton.tsx -- ayni Google
// Cloud projesi/ayni deger, sir degil, web JS bundle'inda zaten herkese
// acik). GOOGLE_IOS_CLIENT_ID ise HALA BOS -- asagidaki `configured` bayragi
// bu yuzden HALA false ve buton HALA gizli: sadece webClientId dolu olmasi
// Android'i bile calistirmaya YETMEZ (Google Cloud Console'da app.lexis.mobile
// paketi + SHA-1 parmak izi icin ayri bir "Android" turu OAuth client
// KAYITLI OLMADAN native Android girisi DEVELOPER_ERROR ile patlar -- bu
// mevcut google-services.json'da da goruluyor: "oauth_client": [] bomboş,
// sadece FCM push icin eklenmisti). Yani gercek kalan is BEHCET'IN Google
// Cloud/Firebase Console'da yapmasi gereken, buradan yapilamayan adimlar:
//
// 1) ANDROID: Google Cloud Console (proje: lexis-291d9, ayni proje numarasi
//    856605079231) -> Credentials -> "Create Credentials" -> OAuth client ID
//    -> tur "Android" -> package name `app.lexis.mobile` + SHA-1 sertifika
//    parmak izi. IKI SHA-1 lazim: (a) yerel debug keystore'un SHA-1'i
//    (`keytool -list -v -keystore ~/.android/debug.keystore -alias
//    androiddebugkey -storepass android -keypass android`) VE (b) Play
//    Console -> Setup -> App integrity -> App signing key certificate'in
//    SHA-1'i (gercek Play Store kullanicilari o sertifikayla imzalaniyor,
//    kendi upload key'i DEGIL). Kayittan sonra Firebase Console'dan
//    google-services.json'u YENIDEN INDIRIP bu repodaki
//    mobile/google-services.json'un yerine koy (artik "oauth_client" alani
//    dolu gelecek).
// 2) IOS: ayni Google Cloud projesinde "iOS" turunde bir OAuth client daha
//    olustur (bundle ID: app.json'daki ios.bundleIdentifier ile BIREBIR
//    ayni olmali: app.lexis.mobile). Olusunca iki deger cikar: Client ID
//    (asagidaki GOOGLE_IOS_CLIENT_ID sabitine yazilacak) ve "iOS URL scheme"
//    (REVERSED_CLIENT_ID, com.googleusercontent.apps.... formatinda --
//    app.json'daki google-signin plugin'inin iosUrlScheme TODO'suna yazilacak).
// 3) SUPABASE: Dashboard -> Authentication -> Providers -> Google ->
//    "Authorized Client IDs" listesinde asagidaki Web Client ID'nin zaten
//    KAYITLI oldugunu dogrula (9 Eylul'deki web Google girisi calistigina
//    gore muhtemelen zaten oradadir -- id_token'in "aud" (audience) claim'i
//    HER ZAMAN webClientId'e esittir, iOS/Android client ID'leri sadece
//    platformun kendi Google hesabiyla konusmasi icin, id_token'e girmez --
//    bu yuzden Supabase tarafinda YENI bir client ID eklemeye GEREK YOK,
//    sadece mevcut kaydin dogru oldugunu teyit etmek yeterli).
// 4) Yukaridaki ADIM 1-2 tamamlanip GOOGLE_IOS_CLIENT_ID + app.json'daki
//    iosUrlScheme doldurulduktan SONRA: bu native modul degisikligi OTA
//    (`eas update`) ile YAYILAMAZ (bkz. 11 Eylul expo-updates krizi notu) --
//    tam native build+submit (`eas-build-submit.yml`) gerekiyor.
//
// Bu 4 adim da Google Cloud/Firebase/Play Console'da interaktif, kimlik
// dogrulamali islemler oldugu icin bu ortamdan (device_bash / Claude)
// YAPILAMIYOR -- gercek "bitti" durumu Behcet bu adimlari tamamlayip iki
// sabiti + app.json'u doldurdugunda gelecek.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import { authApi } from '@/api/auth';
import { useAuth } from '@/store/auth';
import { useLocale } from '@/i18n';
import { spacing, radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

// Web'in zaten canlida kullandigi GERCEK Web Client ID (bkz. yukaridaki
// GUNCELLEME notu) -- sir degil, ID token'in "aud" claim'i bu deger olacak.
const GOOGLE_WEB_CLIENT_ID = '856605079231-jt6reif19ti3nla7c451krr0848r1li9.apps.googleusercontent.com';

// TODO (Behcet): Google Cloud Console'da olusturulacak "iOS" turu OAuth
// client'in Client ID'si (yukaridaki ADIM 2). Bos birakildikca asagidaki
// `configured` bayragi false kalir ve buton (Android dahil, BILINCLI
// OLARAK) hicbir platformda gorunmez -- Android'in de ayrica kendi Cloud
// Console kaydina (ADIM 1) ihtiyaci oldugu icin tek basina webClientId
// yeterli degil, ikisi BIRLIKTE tamamlanip tek seferde acilmasi gerekiyor.
const GOOGLE_IOS_CLIENT_ID = '';

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

  // Ikisi de dolu olmadan hic configure() cagrilmiyor -- yarim (webClientId
  // var ama iosClientId yok, ya da tam tersi) bir yapilandirmayla gercek
  // cihazda sessizce basarisiz olan bir buton gostermektense, ikisi de
  // hazir olana kadar TUM platformlarda gizli kalmasi tercih edildi (bkz.
  // yukaridaki GUNCELLEME notu).
  const readyToConfigure = Boolean(GOOGLE_WEB_CLIENT_ID && GOOGLE_IOS_CLIENT_ID);

  useEffect(() => {
    if (!readyToConfigure) return;
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      offlineAccess: false,
    });
    setConfigured(true);
  }, [readyToConfigure]);

  // Yapilandirma tamamlanmadan buton gizli -- yarim/hatali bir giris
  // denemesi yerine.
  if (!readyToConfigure || !configured) return null;

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
