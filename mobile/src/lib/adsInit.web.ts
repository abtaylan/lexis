// src/lib/adsInit.web.ts — adsInit.ts'in web karşılığı. Web'de AdMob native
// SDK'sı yok ve react-native-google-mobile-ads paketi web bundle'ına dahil
// edilemez (bkz. AdBanner.web.tsx), o yüzden burada yapılacak bir şey yok.
// İmza, native taraftaki initAds(isChild) ile aynı tutuldu (bkz. adsInit.ts'teki
// 18 Kasım 2026 notu) — _layout.tsx her iki platformda da aynı çağrıyı yapıyor.
export function initAds(_isChild: boolean) {}
