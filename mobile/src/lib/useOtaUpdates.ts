// src/lib/useOtaUpdates.ts
//
// OTA GUNCELLEME KONTROLU (14 Ekim 2026 kullanici istegi): varsayilan olarak
// expo-updates SADECE uygulama SOGUK ACILISTA (cold start) guncelleme
// kontrolu yapar; bulursa indirir ama O ANKI acilista eski bundle ile
// calismaya devam eder -- yeni kod ancak BIR SONRAKI acilista aktif olur.
// Yani bir "eas update" yayinladiktan sonra kullanicinin bunu gormesi icin
// uygulamayi tamamen kapatip iki kez acmasi gerekebiliyordu.
//
// Bu hook, uygulama her ON PLANA GELDIGINDE (arka plandan/inactive'den
// 'active'e gecince) -- native "checkAutomatically" ayarina DOKUNMADAN, salt
// JS tarafinda -- manuel olarak guncelleme kontrolu yapar; bulursa indirir ve
// HEMEN reloadAsync() ile uygular. Boylece bir sonraki "eas update" yayinindan
// itibaren, kullanici uygulamayi arka plana atip geri getirdigi an (ya da
// yeniden actiginda) en guncel JS bundle'ini alir -- yeni bir native build
// gerekmez, cunku native checkAutomatically ayari degismiyor, sadece ek bir
// JS kontrolu ekleniyor.
//
// Not: expo-updates'in calismasi icin native taraf zaten gerekli (zaten
// mevcut production build'lerde var) -- burada sadece JS API'leri
// (checkForUpdateAsync/fetchUpdateAsync/reloadAsync) kullaniliyor, bunlar
// OTA ile dagitilabilir. Expo Go'da veya dev build'de Updates.isEnabled
// false oldugu icin hook sessizce no-op kalir.
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

// 20 Kasim 2026 -- KOK NEDEN BULUNDU: Android'de "build sonrasi uygulama
// hic acilmiyor" sikayeti. CI (eas-update.yml) her mobile/src push'unda
// otomatik OTA yayinliyor; bu hook soguk acilista (ilk mount) HEMEN
// checkForUpdateAsync -> fetchUpdateAsync -> reloadAsync zincirini
// calistiriyordu. reloadAsync() TUM JS baglamini yeniden baslatiyor --
// indirilen update manifest/bundle'i yarim/gecikmeli senkronize olmus
// Play Store CDN'i yuzunden (yeni yuklenen native build + hemen ardindan
// tetiklenen ilk OTA kontrolu arasindaki yaris durumu) ya da baska bir
// geçici sorun yuzunden duzgun yuklenemezse, AppErrorBoundary'nin bile
// yakalayamayacagi sekilde (eski React agaci zaten yikilmis) karanlik/bos
// bir ekranda SONSUZA KADAR takili kaliniyor -- native splash capture'inda
// gorulen "sadece bir skeleton/progress cubugu, hicbir zaman ilerlemiyor"
// deseniyle birebir uyusuyor.
//
// Fix: soguk acilista SADECE indir (prefetch) -- reloadAsync YOK, mevcut
// (zaten native build'e gomulu) bundle ile devam et; yeni surum bir
// sonraki ön plana geliste (uygulama zaten bir kere basariyla acilip
// calistiktan SONRA) uygulanir. Boylece en kotu ihtimalle kullanici "bir
// adim gecikmis" JS gorur, ama uygulama ASLA acilista kilitlenmez.
// 20 Kasim 2026 (ek not) -- bu dosyadaki fix ilk pushta YANLIS runtime'a
// (1.0.7) yayinlandi: app.json o sirada zaten iOS icin 1.0.7'ye yukseltilmisti,
// ama CANLI TEK Android native build'i (build 22) hala runtime 1.0.6 --
// EAS Update sadece BIREBIR ayni runtime'a yayinlanmis update'i cihaza
// gonderir, bu yuzden 1.0.6 Android cihazlar bu fix'i hic ALMADI (eas-update.
// yml'deki 10 Eylul notuyla AYNI desen: iOS/Android runtime'lari birbirinden
// kopup OTA'nin bir platforma ulasmamasi). Bu commit, app.json'u GECICI olarak
// 1.0.6'ya dondurup (bir sonraki commit'te tekrar 1.0.7'ye alinacak) bu
// dosyayi (zaten pushlanmis fix icerigiyle) dogru runtime'a yeniden
// yayinlamak icin.
const RELOAD_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ota-timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export function useOtaUpdates() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const checking = useRef(false);
  const hasRenderedOnce = useRef(false);

  useEffect(() => {
    const checkAndApply = async (allowReload: boolean) => {
      if (checking.current || !Updates.isEnabled) return;
      checking.current = true;
      try {
        const result = await withTimeout(Updates.checkForUpdateAsync(), RELOAD_TIMEOUT_MS);
        if (result.isAvailable) {
          await withTimeout(Updates.fetchUpdateAsync(), RELOAD_TIMEOUT_MS);
          // Soguk acilista reloadAsync() KASITLI OLARAK cagrilmiyor (bkz.
          // dosya basindaki 20 Kasim 2026 notu) -- indirilen bundle bir
          // sonraki soguk acilista zaten otomatik olarak aktif olacak
          // (expo-updates'in varsayilan davranisi), ayrica bu oturum
          // icinde bir sonraki on-plana-gelişte de uygulanmaya calisilir.
          if (allowReload) {
            await withTimeout(Updates.reloadAsync(), RELOAD_TIMEOUT_MS);
          }
        }
      } catch {
        // Ag hatasi / gecici sunucu sorunu / zaman asimi: sessizce yut,
        // bir sonraki firsatta tekrar denenecek. Kullanicinin oturumunu/
        // akisini kesintiye ugratmamak onemli.
      } finally {
        checking.current = false;
      }
    };

    // Ilk mount'ta da bir kere dene (uygulama yeni acildiginda) -- AMA
    // sadece indir, reloadAsync YOK (bkz. yukaridaki not).
    checkAndApply(false);
    hasRenderedOnce.current = true;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active' && hasRenderedOnce.current) {
        // Uygulama bu oturumda zaten en az bir kere basariyla render oldu
        // -- artik reloadAsync() cagirmak soguk acilistaki kadar riskli
        // degil (AppErrorBoundary + mevcut calisir durum bir fallback
        // olarak duruyor), bu yuzden burada reload'a izin veriliyor.
        checkAndApply(true);
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);
}
