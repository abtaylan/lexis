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
import mobileAds from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

export function initAds() {
  requestTrackingPermissionsAsync()
    .catch(() => {
      // İzin diyaloğu herhangi bir nedenle başarısız olursa (ör. bazı
      // cihaz/OS kombinasyonlarında) sessizce yut — reklamlar yine de
      // kişiselleştirilmemiş modda initialize edilecek.
    })
    .finally(() => {
      mobileAds()
        .initialize()
        .catch(() => {});
    });
}
