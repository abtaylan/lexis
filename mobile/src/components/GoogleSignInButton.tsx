// src/components/GoogleSignInButton.tsx — Google ile Giris/Kayit butonu.
// AppleSignInButton.tsx ile BIREBIR AYNI desen (kullanici istegi, 10 Eylul
// 2026: "mobilde apple girisi gibi google girisini de eklememiz lazim") --
// backend zaten hem web hem native icin ayni /auth/google ucunu kullaniyor
// (bkz. backend/app/api/routes/auth.py::google_sign_in, Apple ile AYNI
// sign_in_with_id_token deseni), o yuzden burada SADECE native Google
// kimlik dogrulamasi (id_token elde etme) + authApi.googleSignIn cagrisi
// var.
//
// GUNCELLEME (13 Eylul 2026): ADIM 1-3 TAMAMLANDI. Google Cloud Console'da
// (proje: lexis-291d9) artik 4 OAuth client kayitli: "Lexis Web" (zaten
// vardi), "Lexis Android" (Play App Signing sertifikasinin SHA-1'iyle --
// gercek Play Store kullanicilari bu sertifikayla imzalaniyor), "Lexis
// Android (EAS Internal)" (EAS upload keystore'unun SHA-1'iyle -- EAS'in
// dogrudan dagittigi/internal build'ler icin, Android tek client'ta ikinci
// SHA-1 eklemeyi desteklemedigi icin ayri client acildi) ve "Lexis iOS"
// (bundle ID app.lexis.mobile). Supabase Dashboard -> Authentication ->
// Providers -> Google -> "Authorized Client IDs" listesine de tum 4 client
// ID eklendi (asil zorunlu olan sadece webClientId'di -- id_token'in "aud"
// claim'i webClientId'e esit oluyor -- ama diger client ID'ler de ekstra
// guvenlik icin listeye eklendi, zarari yok).
//
// KALAN TEK ADIM: mobile/google-services.json hala eski ("oauth_client": []
// bos) -- Firebase Console'dan YENIDEN INDIRILIP bu dosyanin yerine
// konulmasi lazim (Android OAuth client'lari artik Firebase projesine
// baglandigina gore Firebase'in google-services.json'u artik onlari
// icerecek). Bu adim tamamlanana kadar Android'de native Google girisi
// DEVELOPER_ERROR ile patlayabilir.
//
// ACIL DUZELTME (21 Eylul 2026, "cikis yap -> tekrar giris dene -> acilip
// kapanma" olayi tekrar tetiklendi): bu dosyadaki
// `import { GoogleSignin, ... } from '@react-native-google-signin/google-signin'`
// STATIK importu, 11 Eylul'deki expo-audio ACIL kriziyle (bkz.
// src/lib/questSounds.ts'teki ayni tarihli not) BIREBIR AYNI kok nedeni
// tasiyordu: bu paketin native modulu telefondaki YUKLU build'e henuz
// linklenmemisse (ornegin bu JS, native modul app.json'a eklenmeden/yeni
// bir native build+submit yapilmadan ONCE, sadece EAS Update OTA'siyla
// eski bir build'e gonderilmisse), bu satir dosya degerlendirilirken --
// login.tsx/register.tsx mount olur olmaz, herhangi bir try/catch'e
// girmeden -- "native modul bulunamadi" hatasi firlatip TUM UYGULAMANIN
// acilmasini/render'ini engelliyordu. Bu, AppErrorBoundary'nin bile
// YAKALAYAMADIGI bir hata sinifi (bkz. AppErrorBoundary.tsx'teki kapsam
// notu -- React error boundary'leri SADECE render agacindaki hatalari
// yakalar, bir dosyanin import-time/module-scope hatalarini DEGIL).
//
// Neden ozellikle "cikis yap -> tekrar giris" tetikliyor, "temiz kurulum"
// degil: iOS'ta SecureStore/Keychain verisi uygulama SILINDIGINDE bile
// cogu zaman silinmiyor -- bu yuzden "yeniden kurulum" cogu zaman zaten
// oturumu ACIK buluyor ve dogrudan dashboard'a gidiyor, login.tsx/
// register.tsx (ve dolayisiyla bu dosya) HIC render edilmiyor. Gercek
// cikis (logout()) token'i temizleyip kullaniciyi (auth) grubuna/login.tsx'e
// dondurunce bu dosya o an ILK KEZ degerlendiriliyor -- native modul
// linklenmemisse crash da tam o an ortaya cikiyor.
//
// Cozum expo-audio'dakiyle BIREBIR AYNI desen: STATIK import yerine
// module-scope'ta ama try/catch icinde require() -- native modul yoksa
// (henuz linklenmemis bir build) buton sessizce gizli kaliyor, uygulamanin
// geri kalani normal calismaya devam ediyor. Native modul linklenmis bir
// build'de (app.json'daki plugin kaydi zaten dogru) hicbir davranis
// degismiyor, sadece ekstra bir guvenlik agi eklenmis oluyor.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { authApi } from '@/api/auth';
import { useAuth } from '@/store/auth';
import { useLocale } from '@/i18n';
import { spacing, radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

type GoogleSigninStatic = typeof import('@react-native-google-signin/google-signin').GoogleSignin;
type IsSuccessResponseFn = typeof import('@react-native-google-signin/google-signin').isSuccessResponse;
type IsErrorWithCodeFn = typeof import('@react-native-google-signin/google-signin').isErrorWithCode;
type StatusCodesConst = typeof import('@react-native-google-signin/google-signin').statusCodes;

interface GoogleSigninModuleShape {
  GoogleSignin: GoogleSigninStatic;
  isSuccessResponse: IsSuccessResponseFn;
  isErrorWithCode: IsErrorWithCodeFn;
  statusCodes: StatusCodesConst;
}

let googleSignInModule: GoogleSigninModuleShape | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  googleSignInModule = require('@react-native-google-signin/google-signin');
} catch {
  googleSignInModule = null;
}

// Web'in zaten canlida kullandigi GERCEK Web Client ID (bkz. yukaridaki
// GUNCELLEME notu) -- sir degil, ID token'in "aud" claim'i bu deger olacak.
const GOOGLE_WEB_CLIENT_ID = '856605079231-jt6reif19ti3nla7c451krr0848r1li9.apps.googleusercontent.com';

// "Lexis iOS" OAuth client'inin Client ID'si (13 Eylul 2026'da Google Cloud
// Console'da olusturuldu, bundle ID app.lexis.mobile) -- sir degil.
const GOOGLE_IOS_CLIENT_ID = '856605079231-s8dm5s2gjhvslaktr21ga4e62qarq28n.apps.googleusercontent.com';

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
  // yukaridaki GUNCELLEME notu). Native modul yuklenemediyse (bkz. yukaridaki
  // ACIL DUZELTME notu) de ayni sekilde gizli kaliyor.
  const readyToConfigure = Boolean(googleSignInModule && GOOGLE_WEB_CLIENT_ID && GOOGLE_IOS_CLIENT_ID);

  useEffect(() => {
    if (!readyToConfigure || !googleSignInModule) return;
    googleSignInModule.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      offlineAccess: false,
    });
    setConfigured(true);
  }, [readyToConfigure]);

  // Yapilandirma tamamlanmadan buton gizli -- yarim/hatali bir giris
  // denemesi yerine.
  if (!readyToConfigure || !configured || !googleSignInModule) return null;

  const handlePress = async () => {
    if (!googleSignInModule) return;
    const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = googleSignInModule;
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
