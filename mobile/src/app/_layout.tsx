import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeOut } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';
import { initAds } from '@/lib/adsInit';
import { getAgeGateAnswer } from '@/lib/ageGate';
import { AgeGateScreen } from '@/components/AgeGateScreen';
import { useOtaUpdates } from '@/lib/useOtaUpdates';
import { AuthProvider, useAuth } from '@/store/auth';
import { LocaleProvider } from '@/i18n';
import { ThemeProvider, useThemeMode } from '@/store/theme';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AnimatedSplash } from '@/components/AnimatedSplash';

SplashScreen.preventAutoHideAsync().catch(() => {});

// 18 Kasım 2026 — AdMob SDK'sının initialize edilmesi artık burada,
// uygulama açılışında KOŞULSUZ çağrılmıyor. Google Play Aile Politikası
// uyumu için (bkz. lib/ageGate.ts + components/AgeGateScreen.tsx + lib/
// adsInit.ts'teki aynı tarihli notlar) önce nötr yaş ekranının cevabı
// (daha önce cevaplanmışsa AsyncStorage'dan, değilse kullanıcıya bir kere
// sorularak) öğrenilmeli — reklam SDK'si o cevaba göre (çocuk-yönelimli ya
// da normal) başlatılıyor. Gerçek initAds(isChild) çağrısı aşağıdaki
// RootLayout'ta, yaş ekranı cevaplandığı anda yapılıyor.

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

// Özel açılış animasyonu (4 Ekim 2026): native expo-splash-screen statik
// logoyu gösterdikten sonra, uygulama içi ekranlar render olmadan önce
// bu süre boyunca AnimatedSplash (Yıldız Tozu + Shimmer Sweep) gösteriliyor
// -- hem "profesyonel" bir açılış hissi veriyor, hem de auth/tema gibi
// başlangıç verisi henüz yüklenmemişken boş/beyaz bir ekran yerine marka
// animasyonu oynatıyor. isLoading daha uzun sürerse animasyon o bitene
// kadar devam eder; daha kısa sürerse bile en az bu süre gösterilir.
const MIN_SPLASH_MS = 3800;

export default function RootLayout() {
  // 14 Ekim 2026: uygulama on plana her geldiginde OTA guncellemesini
  // kontrol edip varsa aninda uygula (bkz. useOtaUpdates.ts) -- yeni build
  // gerektirmez, sadece JS tarafinda calisir.
  useOtaUpdates();

  // 18 Kasım 2026 — nötr yaş ekranı akışı (bkz. dosya başındaki not).
  // 'checking': AsyncStorage'dan önceki cevap okunuyor (ekrana hiçbir şey
  // çizilmez, native splash zaten görünür durumda). 'needed': daha önce
  // cevaplanmamış, AgeGateScreen gösteriliyor. 'resolved': cevap biliniyor,
  // initAds(isChild) çağrıldı, normal uygulama akışına geçilebilir.
  const [ageGateStatus, setAgeGateStatus] = useState<'checking' | 'needed' | 'resolved'>('checking');
  const adsInitedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    // 20 Kasım 2026 -- KOK NEDEN BULUNDU (iOS + Android'de "uygulama hiç
    // açılmıyor, boş/karanlık ekranda donuyor" şikayeti): getAgeGateAnswer()
    // (AsyncStorage okuyor) HİÇ ÇÖZÜLMEZSE (native modül seviyesinde askıda
    // kalma -- hata fırlatmıyor, sadece sonsuza kadar pending kalıyor) bu
    // .then() callback'i ASLA çalışmıyordu. Sonuç: ageGateStatus sonsuza
    // kadar 'checking' kalıyor, aşağıdaki render bloğu bu durumda `null`
    // dönüyor VE native splash hiç kapatılmıyor (hideAsync'in TEK çağrıldığı
    // yerler: bu .then()'in 'needed' dalı ile RootNavigator'ın kendi
    // useEffect'i -- ikisi de 'checking' durumunda asla tetiklenmiyor).
    // AppErrorBoundary bunu YAKALAYAMAZ çünkü ortada fırlatılan bir hata yok,
    // sadece sonsuza kadar bekleyen bir promise var. Bu, platformdan bağımsız
    // (saf JS/AsyncStorage seviyesinde) bir kilitlenme noktasıydı -- iOS'ta
    // da Android'de de aynı şekilde tetiklenebilir.
    //
    // Fix: bir "watchdog" zamanlayıcısı -- AGE_GATE_TIMEOUT_MS içinde cevap
    // gelmezse (ya da getAgeGateAnswer reddedilirse) güvenli tarafta kalıp
    // yaş ekranını göster (initAds daha sonra kullanıcı cevapladığında normal
    // akışla çağrılır) ve native splash'i kapat -- uygulama ASLA sonsuza
    // kadar donmuyor.
    const AGE_GATE_TIMEOUT_MS = 5000;

    // 20 Kasım 2026 -- ACİL GEÇİCİ KİLL-SWITCH: AgeGateScreen'de bağımsız
    // bir render hatası bulundu (başlık/açıklama/buton metni hiç
    // görünmüyor, kullanıcı yılı nereye yazacağını göremiyor, buton boş
    // alanla deve dışı kaldığı için "hiçbir şey olmuyor" hissi veriyor).
    // Bu, TestFlight'ta yeni (daha önce hiç cevaplanmamış) bir kurulumda
    // yakalandı -- ama canlı Android (build 22) ve iOS (build 29) da AYNI
    // runtime'da (1.0.6) ve bu ekranı aynı şekilde HİÇ CEVAPLANMAMIŞ her
    // kullanıcıya göstermeye çalışıyor, yani bu ekran canlıda da aynı
    // şekilde bozuk olabilir. Kullanıcı talebiyle (20 Kasım 2026): sorun
    // test ortamında düzgünce çözülene kadar yaş ekranı TAMAMEN
    // DEVREDE DIŞI -- önceki (bu özellik eklenmeden önceki) davranışa
    // dönülüyor: daha önce cevaplanmışsa o cevap kullanılmaya devam
    // ediyor, hiç cevaplanmamışsa güvenli varsayılanla (isChild: false,
    // normal/kişiselleştirilmiş reklam) sessizce devam ediliyor, kullanıcı
    // hiçbir ekran görmüyor. Google Play'deki 9-12 yaş hedef kitlesi
    // genişletmesi zaten ayrı bir nedenle BEKLEMEDE olduğu için bu geçiş
    // herhangi bir aktif politika taahhüdünü bozmuyor. Düzeltme test
    // ortamında doğrulandığında AGE_GATE_ENABLED tekrar true yapılacak --
    // watchdog/timeout altyapısı DEĞİŞMEDEN korunuyor ki o zaman da askıda
    // kalma riski olmasın.
    const AGE_GATE_ENABLED = true;
    // 20 Kasım 2026 -- TEKRAR AÇILDI: AgeGateScreen'deki asıl render hatası
    // bulundu ve düzeltildi (bkz. AgeGateScreen.tsx -- scroll={false} +
    // padded={false} eksikliği, diğer tüm ekranlarla uyumsuz tek yerdi).
    // Kullanıcı test edip onayladığında bu satır kalıcı sayılacak; sorun
    // geri gelirse tekrar false yapılıp anında (OTA ile, native build
    // gerekmeden) devre dışı bırakılabilir.

    const resolveWithDefault = () => {
      if (!adsInitedRef.current) {
        adsInitedRef.current = true;
        initAds(false);
      }
      setAgeGateStatus('resolved');
    };

    const proceedAsNeeded = () => {
      if (cancelled || settled) return;
      settled = true;
      if (!AGE_GATE_ENABLED) {
        resolveWithDefault();
        return;
      }
      // Yaş ekranı gösterilecek -- RootNavigator henüz mount olmadığı
      // için (bkz. asağıdaki render) native splash'i burada kapatmazsak
      // AgeGateScreen hiç görünmez, kullanıcı native splash'te takılı
      // kalır (RootNavigator'ın kendi hideAsync çağrısı sadece
      // 'resolved' durumunda mount olduğu için çalışmaz).
      SplashScreen.hideAsync().catch(() => {});
      setAgeGateStatus('needed');
    };

    const watchdog = setTimeout(proceedAsNeeded, AGE_GATE_TIMEOUT_MS);

    getAgeGateAnswer()
      .then((answer) => {
        if (cancelled || settled) return;
        settled = true;
        clearTimeout(watchdog);
        if (answer) {
          if (!adsInitedRef.current) {
            adsInitedRef.current = true;
            initAds(answer.isChild);
          }
          setAgeGateStatus('resolved');
        } else if (!AGE_GATE_ENABLED) {
          resolveWithDefault();
        } else {
          SplashScreen.hideAsync().catch(() => {});
          setAgeGateStatus('needed');
        }
      })
      .catch(() => {
        clearTimeout(watchdog);
        proceedAsNeeded();
      });

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
    };
  }, []);

  const handleAgeGateAnswered = (isChild: boolean) => {
    if (!adsInitedRef.current) {
      adsInitedRef.current = true;
      initAds(isChild);
    }
    setAgeGateStatus('resolved');
  };

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
                {ageGateStatus === 'needed' ? (
                  <AgeGateScreen onAnswered={handleAgeGateAnswered} />
                ) : ageGateStatus === 'resolved' ? (
                  <RootNavigator />
                ) : null}
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
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Native splash'i hemen kapatıp yerine JS seviyesindeki AnimatedSplash'i
    // geçiriyoruz -- böylece "statik logo -> boş ekran -> uygulama" yerine
    // "statik logo -> animasyonlu açılış -> uygulama" akışı oluyor.
    SplashScreen.hideAsync().catch(() => {});
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const showIntro = isLoading || !minTimeElapsed;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {!isLoading && (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
        </Stack>
      )}
      {showIntro && (
        <Animated.View style={StyleSheet.absoluteFill} exiting={FadeOut.duration(450)}>
          <AnimatedSplash />
        </Animated.View>
      )}
    </>
  );
}
