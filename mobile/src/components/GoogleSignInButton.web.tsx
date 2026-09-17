// src/components/GoogleSignInButton.web.tsx — GoogleSignInButton.tsx'in web
// (Expo Router web export / react-native-web) karşılığı.
//
// @react-native-google-signin/google-signin tamamen native bir modül
// (TurboModule/codegen spec dosyaları içeriyor) ve web bundle'ında import
// edilemez — react-native-google-mobile-ads ile aynı sınıf hata
// ("Importing native-only module...") verir. Web tarafında zaten bu native
// giriş akışı hiç kullanılmıyor (bkz. GoogleSignInButton.tsx'teki not: web
// aynı backend ucunu ayrı bir akışla kullanıyor), o yüzden burada hiçbir
// şey render edilmiyor — bu, native tarafta zaten `readyToConfigure` ya da
// `configured` false olduğunda butonun gizlendiği durumla aynı davranış.
interface Props {
  onError: (message: string) => void;
  onStart?: () => void;
  onFinish?: () => void;
}

export function GoogleSignInButton(_props: Props) {
  return null;
}
