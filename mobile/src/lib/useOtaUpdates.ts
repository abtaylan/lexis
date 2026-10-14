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

export function useOtaUpdates() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const checking = useRef(false);

  useEffect(() => {
    const checkAndApply = async () => {
      if (checking.current || !Updates.isEnabled) return;
      checking.current = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Ag hatasi / gecici sunucu sorunu: sessizce yut, bir sonraki
        // firsatta (ornegin bir sonraki on plana gelişte) tekrar denenecek.
        // Kullanicinin oturumunu/akisini kesintiye ugratmamak onemli.
      } finally {
        checking.current = false;
      }
    };

    // Ilk mount'ta da bir kere dene (uygulama yeni acildiginda).
    checkAndApply();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        checkAndApply();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);
}
