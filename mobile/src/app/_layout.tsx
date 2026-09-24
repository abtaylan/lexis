import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { initAds } from '@/lib/adsInit';
import { AuthProvider, useAuth } from '@/store/auth';
import { LocaleProvider } from '@/i18n';
import { ThemeProvider, useThemeMode } from '@/store/theme';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

// AdMob SDK'sı uygulama açılışında bir kere initialize edilir (bkz.
// components/ads/AdBanner.tsx). Gerçek initialize kodu src/lib/adsInit.ts'te
// (native) — web'de adsInit.web.ts'e (no-op) düşer, çünkü
// react-native-google-mobile-ads native/codegen bir modül ve web bundle'ına
// (örn. `expo export --platform web`) hiç girmemeli. Native modül
// gerektirdiği için sadece EAS/dev-client build'lerde bir şey yapar —
// Expo Go'da zaten proje başka native modüller (expo-iap vb.) nedeniyle de
// kullanılamıyor, olası bir hata sessizce yutulur.
initAds();

// Offline mod / onbellekleme (24 Eylul 2026, V2 oncelik #11): sorgu
// onbellegi AsyncStorage'a yaziliyor, boylece uygulama internetsiz
// yeniden acildiginda ekranlar son bilinen veriyi gosterebiliyor.
// gcTime, persister'in maxAge'inden KUCUK OLAMAZ -- kucuk olursa React
// Query, persister diske yazmadan onbellegi cop toplayabilir.
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, gcTime: ONE_DAY_MS } },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'lexis_query_cache_v1',
});

export default function RootLayout() {
  return (
    // 11 Eylül 2026: en dışa AppErrorBoundary eklendi -- gerçek cihaz
    // crash log'unda görülen "JS hatası -> React Native'in New Architecture
    // hata kurtarma kuyruğu -> yakalanmamış NSException -> native abort()"
    // zincirini burada JS seviyesinde yakalayıp uygulamanın tamamen
    // çökmesi yerine kurtarılabilir bir ekran gösteriyoruz (bkz.
    // AppErrorBoundary.tsx'teki uzun açıklama). ThemeProvider/LocaleProvider/
    // AuthProvider'dan bile DAHA DIŞARIDA -- onlardan biri hata fırlatırsa
    // da yakalansın diye.
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister, maxAge: ONE_DAY_MS }}
        >
          <ThemeProvider>
            <LocaleProvider>
              <AuthProvider>
                <RootNavigator />
              </AuthProvider>
            </LocaleProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();
  const { scheme } = useThemeMode();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
