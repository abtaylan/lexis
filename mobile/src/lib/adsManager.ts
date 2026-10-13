// src/lib/adsManager.ts — geçiş (interstitial) ve ödüllü (rewarded) reklamlar.
// Banner için bkz. components/ads/AdBanner.tsx. Native modül linklenmemiş bir
// build'de (bkz. adsInit.ts'teki açıklama) require() try/catch içinde — modül
// yoksa tüm fonksiyonlar sessizce no-op döner, uygulama çökmez.
import { Platform } from 'react-native';
import Constants from 'expo-constants';

type AdsModule = typeof import('react-native-google-mobile-ads');

let ads: AdsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ads = require('react-native-google-mobile-ads');
} catch {
  ads = null;
}

type AdMobExtra = {
  androidInterstitialUnitId?: string;
  iosInterstitialUnitId?: string;
  androidRewardedUnitId?: string;
  iosRewardedUnitId?: string;
};

function unitId(kind: 'interstitial' | 'rewarded'): string | null {
  if (!ads) return null;
  const extra = (Constants.expoConfig?.extra?.admob as AdMobExtra | undefined) ?? {};
  const ios = Platform.OS === 'ios';
  const configured =
    kind === 'interstitial'
      ? ios ? extra.iosInterstitialUnitId : extra.androidInterstitialUnitId
      : ios ? extra.iosRewardedUnitId : extra.androidRewardedUnitId;
  // __DEV__'de veya ID yokken test ID — gerçek hesapla kendi reklamına tıklama riski yok.
  if (__DEV__ || !configured) {
    return kind === 'interstitial' ? ads.TestIds.INTERSTITIAL : ads.TestIds.REWARDED;
  }
  return configured;
}

// ── Geçiş reklamı ──
// Sıklık sınırı: her N tamamlanan turda bir ve iki reklam arası en az 3 dk.
// (Aşırı reklam kullanıcıyı kaçırır, mağaza puanını düşürür.)
const INTERSTITIAL_EVERY = 3;
const INTERSTITIAL_MIN_GAP_MS = 3 * 60 * 1000;

let interstitial: ReturnType<AdsModule['InterstitialAd']['createForAdRequest']> | null = null;
let interstitialLoaded = false;
let completedRounds = 0;
let lastInterstitialAt = 0;

function loadInterstitial() {
  if (!ads) return;
  const id = unitId('interstitial');
  if (!id) return;
  try {
    interstitialLoaded = false;
    interstitial = ads.InterstitialAd.createForAdRequest(id);
    interstitial.addAdEventListener(ads.AdEventType.LOADED, () => {
      interstitialLoaded = true;
    });
    interstitial.addAdEventListener(ads.AdEventType.CLOSED, () => {
      lastInterstitialAt = Date.now();
      loadInterstitial();
    });
    interstitial.addAdEventListener(ads.AdEventType.ERROR, () => {
      interstitialLoaded = false;
    });
    interstitial.load();
  } catch {
    interstitial = null;
  }
}

export function preloadAds() {
  loadInterstitial();
  loadRewarded();
}

/** Bir oyun/quiz turu bittiğinde çağır. Premium ise hiçbir şey yapmaz. */
export function onRoundCompleted(isPremium: boolean) {
  if (!ads || isPremium) return;
  completedRounds += 1;
  if (completedRounds % INTERSTITIAL_EVERY !== 0) return;
  if (Date.now() - lastInterstitialAt < INTERSTITIAL_MIN_GAP_MS) return;
  if (!interstitial || !interstitialLoaded) {
    if (!interstitial) loadInterstitial();
    return;
  }
  try {
    interstitial.show();
  } catch {
    /* sessiz */
  }
}

// ── Ödüllü reklam ──
let rewarded: ReturnType<AdsModule['RewardedAd']['createForAdRequest']> | null = null;
let rewardedLoaded = false;

function loadRewarded() {
  if (!ads) return;
  const id = unitId('rewarded');
  if (!id) return;
  try {
    rewardedLoaded = false;
    rewarded = ads.RewardedAd.createForAdRequest(id);
    rewarded.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
      rewardedLoaded = true;
    });
    rewarded.addAdEventListener(ads.AdEventType.ERROR, () => {
      rewardedLoaded = false;
    });
    rewarded.load();
  } catch {
    rewarded = null;
  }
}

export function isRewardedAvailable(): boolean {
  return !!ads && rewardedLoaded;
}

/** Ödüllü reklamı gösterir; kullanıcı ödülü kazandıysa true döner. */
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ads || !rewarded || !rewardedLoaded) {
      loadRewarded();
      resolve(false);
      return;
    }
    const ad = rewarded;
    let earned = false;
    const unsubEarned = ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubClosed = ad.addAdEventListener(ads.AdEventType.CLOSED, () => {
      unsubEarned();
      unsubClosed();
      loadRewarded();
      resolve(earned);
    });
    try {
      rewardedLoaded = false;
      ad.show();
    } catch {
      unsubEarned();
      unsubClosed();
      loadRewarded();
      resolve(false);
    }
  });
}
