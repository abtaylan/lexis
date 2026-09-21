// src/components/ads/AdBanner.tsx — web'deki components/ads/AdBanner.tsx'in
// react-native-google-mobile-ads (AdMob) tabanlı mobil karşılığı.
//
// Kullanıcı kararı: reklam sistemi gerçek ağa bağlanacak (bkz. backlog Bölüm
// "Reklam sistemi: gerçek ağa ekle ve mobil işlemlerine başla"). Ancak
// kullanıcının henüz bir AdMob hesabı yok ("Hiçbiri yok, nasıl açacağımı
// anlat" cevabı) — o yüzden gerçek App ID / birim ID'leri app.json'daki
// `extra.admob` altında BOŞ placeholder olarak duruyor. Boşken (ya da __DEV__
// modunda) Google'ın herkese açık, güvenli TEST birim ID'lerine düşülür —
// böylece kod gerçek hesap açılmadan önce de çalışır/derlenir, gerçek para
// karışan bir reklam göstermez ve Play/App Store politika ihlaline yol açmaz.
//
// AdMob App ID (app.json > plugins > react-native-google-mobile-ads) ayrı bir
// şeydir: uygulamayı AdMob'a tanıtır, SDK onsuz initialize olmaz. O da şu an
// Google'ın herkese açık ÖRNEK App ID'leri ile dolu — gerçek hesap açılınca
// ikisi de (App ID + birim ID) değiştirilmeli.
//
// ACİL DÜZELTME (21 Eylül 2026): src/lib/adsInit.ts'teki aynı tarihli notla
// AYNI kök neden -- `import { BannerAd, ... } from 'react-native-google-
// mobile-ads'` STATİK importu, bu native modül telefondaki yüklü build'e
// henüz linklenmemişse bu dosya değerlendirilirken (bu bileşeni kullanan
// ekran render olur olmaz) "TurboModuleRegistry.getEnforcing(...):
// 'RNGoogleMobileAdsModule' could not be found" hatasıyla çöküyordu.
// adsInit.ts'teki BİREBİR AYNI desen: statik import yerine module-scope'ta
// try/catch içinde require(). Native modül yoksa banner sessizce hiç
// render edilmez.
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '@/store/auth';

type GoogleMobileAdsModule = {
  BannerAd: typeof import('react-native-google-mobile-ads').BannerAd;
  BannerAdSize: typeof import('react-native-google-mobile-ads').BannerAdSize;
  TestIds: typeof import('react-native-google-mobile-ads').TestIds;
};

let adsModule: GoogleMobileAdsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  adsModule = require('react-native-google-mobile-ads');
} catch {
  adsModule = null;
}

type AdMobExtra = {
  androidBannerUnitId?: string;
  iosBannerUnitId?: string;
};

function resolveBannerUnitId(): string {
  const extra = (Constants.expoConfig?.extra?.admob as AdMobExtra | undefined) ?? {};
  const configured = Platform.OS === 'ios' ? extra.iosBannerUnitId : extra.androidBannerUnitId;
  // __DEV__'de veya gerçek ID henüz girilmemişken her zaman test ID kullan —
  // yanlışlıkla gerçek/prod reklam isteği atılmasını engeller.
  if (__DEV__ || !configured) return adsModule!.TestIds.BANNER;
  return configured;
}

interface AdBannerProps {
  style?: object;
}

/**
 * Premium olmayan kullanıcılara mağaza kurallarına uygun, uyarlanabilir
 * (adaptive) bir alt banner reklam gösterir. Premium kullanıcıya, bileşen
 * henüz auth durumunu yüklerken, ya da native reklam modülü bu build'e
 * linklenmemişse hiçbir şey render etmez.
 */
export function AdBanner({ style }: AdBannerProps) {
  const { user, isLoading } = useAuth();
  const isPremium = !!user?.is_premium;

  if (isLoading || isPremium || !adsModule) return null;

  const { BannerAd, BannerAdSize } = adsModule;

  return (
    <View style={[styles.wrap, style]}>
      <BannerAd
        unitId={resolveBannerUnitId()}
        // NOT: LARGE_ANCHORED_ADAPTIVE_BANNER sadece react-native-google-mobile-ads
        // 16.1.0+'ta var; paket 16.0.2'ye SABİTLENDİ (bkz. package.json yorumu —
        // 16.1.0+'ın bağladığı play-services-ads sürümleri Kotlin metadata
        // uyumsuzluğuyla Gradle build'ini kırıyordu). ANCHORED_ADAPTIVE_BANNER
        // her iki sürümde de var (yenisinde deprecated ama çalışıyor) — bilerek bu kullanıldı.
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => {
          // Sessizce geç — reklam ağı henüz yapılandırılmamış/doldurulmamış
          // olabilir (gerçek AdMob hesabı açılana kadar beklenen durum).
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center', overflow: 'hidden' },
});
