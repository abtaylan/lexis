// src/lib/adsInit.ts — AdMob SDK'sını uygulama açılışında bir kere
// initialize eder (bkz. components/ads/AdBanner.tsx). Bu dosya sadece
// native (iOS/Android) tarafında derlenir; web tarafı adsInit.web.ts'e
// düşer (react-native-google-mobile-ads native/codegen bir modül olduğu
// için web bundle'ına hiç girmemeli — bkz. AdBanner.web.tsx'teki açıklama).
import mobileAds from 'react-native-google-mobile-ads';

export function initAds() {
  mobileAds()
    .initialize()
    .catch(() => {});
}
