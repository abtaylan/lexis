// src/lib/adsInit.ts — AdMob SDK'sını uygulama açılışında bir kere
// initialize eder (bkz. components/ads/AdBanner.tsx). Bu dosya sadece
// native (iOS/Android) tarafında derlenir; web tarafı adsInit.web.ts'e
// düşer (react-native-google-mobile-ads native/codegen bir modül olduğu
// için web bundle'ına hiç girmemeli — bkz. AdBanner.web.tsx'teki açıklama).
//
// 18 Eylül 2026 — CRASH FIX: Canlıdaki "uygulama açılışında hiç girmeden
// aninda kapanıyor, hata da görünmüyor" olayının kök nedeni bulundu.
// Önceki AppErrorBoundary (bkz. o dosyadaki not) bu türden JS hatalarını
// yakalayıp kurtarma ekranı gösteriyor ama KULLANICILAR HİÇBİR HATA EKRANI
// GÖRMÜYORDU — bu, hatanın JS tarafında değil, React'in error boundary
// mekanizmasının erişemediği bir native ObjC exception olduğunu gösteriyordu
// (tam olarak önceki .ips analizindeki "objc_exception_throw <- -[NSException
// raise] <- abort()" zinciriyle uyumlu).
//
// iOS'ta, uygulama Info.plist'te NSUserTrackingUsageDescription anahtarı
// OLMADAN reklam SDK'sının (App Tracking Transparency/IDFA'ya dokunan)
// gizlilik-hassas verilere erişmeye çalışması, iOS'un kendisi tarafından
// şu (aynı EXC_CRASH/SIGABRT + NSException imzasına sahip) çökmeye yol
// açıyor: "This app has crashed because it attempted to access
// privacy-sensitive data without a usage description." react-native-
// google-mobile-ads'in initialize() çağrısı, ATT durumu hiç sorulmadan
// çağrılırsa SDK'nın kendi içinde bu erişimi tetikleyebiliyor. app.json'a
// NSUserTrackingUsageDescription eklendi (ios.infoPlist) AMA bu tek başına
// yeterli değil — Google'ın kendi dokümantasyonunun önerdiği gibi burada
// da initialize()'dan ÖNCE requestTrackingPermissionsAsync() ile izin
// akışını düzgünce tamamlıyoruz (kullanıcı ister izin versin ister
// reddetsin, initialize() her durumda çağrılır — reddedilirse SDK
// otomatik olarak kişiselleştirilmemiş reklamlara düşer).
//
// ACİL DÜZELTME (21 Eylül 2026, aynı "açılıp kapanma" olayı GERÇEK CİHAZDA
// farklı bir hatayla tekrar yakalandı): kullanıcının gönderdiği ekran
// görüntüsü şunu gösterdi:
//   "Invariant Violation: TurboModuleRegistry.getEnforcing(...):
//   'RNGoogleMobileAdsModule' could not be found. Verify that a module by
//   this name is registered in the native binary."
// Bu, 18 Eylül'de teşhis edilen ATT/gizlilik çökmesinden TAMAMEN FARKLI bir
// hata -- SDK'nın native modülü telefondaki yüklü build'e HİÇ linklenmemiş
// (11 Eylül'deki expo-audio ve 21 Eylül'deki Google Sign-In krizleriyle
// BİREBİR AYNI hata sınıfı, bkz. GoogleSignInButton.tsx'teki ayni tarihli
// not). Kök sebep aynı: asagidaki
// `import mobileAds from 'react-native-google-mobile-ads'` STATİK importu.
// Bu dosya _layout.tsx tarafından KOŞULSUZ, HER uygulama açılışında (auth
// durumundan bağımsız, login ekranına bile gerek kalmadan) import ediliyor
// -- yani native modül linklenmemiş bir build'de bu satır, RootLayout'un
// kendi modülü degerlendirilirken, herhangi bir React render'ı hiç
// başlamadan patlıyordu. AppErrorBoundary bunu YAKALAYAMAZ (bkz. o
// dosyadaki kapsam notu -- sadece render agacindaki hatalari yakalar,
// import-time hatalarını değil).
//
// Çözüm expo-audio/GoogleSignInButton ile BİREBİR AYNI desen: statik
// import yerine module-scope'ta try/catch içinde require(). Native modül
// yoksa initAds() sessizce hiçbir şey yapmaz (reklamlar o build'de
// gösterilmez), uygulamanın geri kalanı normal çalışmaya devam eder.
// Native modül linklenmiş bir build'de (app.json plugin kaydı zaten
// doğru) davranış değişmiyor.
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

type MobileAdsFactory = () => { initialize: () => Promise<unknown> };

let mobileAds: MobileAdsFactory | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  mobileAds = require('react-native-google-mobile-ads').default;
} catch {
  mobileAds = null;
}

export function initAds() {
  if (!mobileAds) return;
  requestTrackingPermissionsAsync()
    .catch(() => {
      // İzin diyaloğu herhangi bir nedenle başarısız olursa (ör. bazı
      // cihaz/OS kombinasyonlarında) sessizce yut — reklamlar yine de
      // kişiselleştirilmemiş modda initialize edilecek.
    })
    .finally(() => {
      mobileAds!()
        .initialize()
        .catch(() => {});
    });
}
