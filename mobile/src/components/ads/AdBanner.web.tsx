// src/components/ads/AdBanner.web.tsx — AdBanner.tsx'in web (Expo Router web
// export / react-native-web) karşılığı.
//
// react-native-google-mobile-ads native bir modüldür (kod üretimi/codegen
// içerir) ve web bundle'ında import edilemez ("Importing native-only module"
// hatası — bkz. `npx expo export --platform web` çıktısı). Metro/Expo,
// dosya adında `.web.tsx` uzantısı gördüğünde web derlemesinde bu dosyayı,
// diğer platformlarda ise AdBanner.tsx'i kullanır (aynı kalıp projede
// `use-color-scheme.web.ts` için de uygulanmış).
//
// Web tarafında AdMob banner reklamı zaten gösterilemez (native SDK), bu
// yüzden burada hiçbir şey render edilmiyor — premium olmayan kullanıcı için
// de, web export'un amacı (ekran kaydı) için de davranış aynı: boşluk yok,
// hata yok.
export function AdBanner(_props: { style?: object }) {
  return null;
}
