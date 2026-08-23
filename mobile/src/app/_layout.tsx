import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import mobileAds from 'react-native-google-mobile-ads';
import { AuthProvider, useAuth } from '@/store/auth';
import { LocaleProvider } from '@/i18n';
import { ThemeProvider, useThemeMode } from '@/store/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// AdMob SDK'sı uygulama açılışında bir kere initialize edilir (bkz.
// components/ads/AdBanner.tsx). Native modül gerektirdiği için sadece
// EAS/dev-client build'lerde çalışır — Expo Go'da zaten proje başka native
// modüller (expo-iap vb.) nedeniyle de kullanılamıyor, o yüzden ek bir
// Platform/Constants kontrolüne gerek yok; olası bir hata sessizce yutulur.
mobileAds()
  .initialize()
  .catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
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
