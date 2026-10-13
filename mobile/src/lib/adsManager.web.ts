// adsManager.ts'in web karşılığı — web'de AdMob native SDK'sı yok, hepsi no-op.
export function preloadAds() {}
export function onRoundCompleted(_isPremium: boolean) {}
export function isRewardedAvailable() { return false; }
export function showRewardedAd(): Promise<boolean> { return Promise.resolve(false); }
