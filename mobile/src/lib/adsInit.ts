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
//
// 18 Kasım 2026 — Aile Politikası / COPPA uyumu (bkz. src/lib/ageGate.ts +
// src/components/AgeGateScreen.tsx): Google Play'de Lexis'in hedef yaş
// grubu sadece "18 yaş ve üstü" idi ve "küçükleri kısıtla" seçeneği
// işaretliydi -- bu da Türkiye dahil her ülkede 18 yaşından küçük (veya
// Google tarafından küçük olarak işaretlenmiş) hesapların uygulamayı Play
// Store'da aramasını/indirmesini TAMAMEN engelliyordu. Hedef kitleyi 9-12
// yaş dahil tüm yaşlara açmak için önce bu dosyanın çocuklara uygun reklam
// davranışı sunması gerekiyor (Google Play Aile Politikası: çocuklara
// sadece sertifikalı/çocuğa uygun, kişiselleştirilmemiş reklamlar
// gösterilebilir, ATT/IDFA izni gibi takip akışları çocuklara hiç
// gösterilmemeli). `initAds` artık kök layout'taki nötr yaş ekranının
// (AgeGateScreen) cevabına göre bir `isChild` parametresi alıyor:
//  - isChild === true: ATT izni ve UMP onay formu (AdsConsent) HİÇ
//    gösterilmez (çocuklara bu akışlar gösterilmemeli); initialize'dan
//    ÖNCE setRequestConfiguration ile tagForChildDirectedTreatment: true,
//    tagForUnderAgeOfConsent: true ve maxAdContentRating: 'G' ayarlanır
//    (Google'ın resmi "mixed audience" rehberliğiyle birebir aynı desen).
//    Bu ayar global (SDK genelinde) olduğu için banner/interstitial/
//    rewarded her reklam isteğine otomatik uygulanır -- ayrıca
//    adsManager.ts'te interstitial/rewarded istekleri de ek güvence
//    olarak requestNonPersonalizedAdsOnly: true ile açılıyor (bkz. o
//    dosya).
//  - isChild === false: davranış öncekiyle birebir aynı (ATT + UMP onay
//    akışı + kişiselleştirilmiş reklam).
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

type RequestConfiguration = {
  maxAdContentRating?: string;
  tagForChildDirectedTreatment?: boolean;
  tagForUnderAgeOfConsent?: boolean;
};

type MobileAdsInstance = {
  initialize: () => Promise<unknown>;
  setRequestConfiguration: (config: RequestConfiguration) => Promise<unknown>;
};

type MobileAdsFactory = () => MobileAdsInstance;

let mobileAds: MobileAdsFactory | null = null;
let adsConsent: { gatherConsent: () => Promise<unknown> } | null = null;
let maxAdContentRatingG = 'G';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('react-native-google-mobile-ads');
  mobileAds = mod.default;
  adsConsent = mod.AdsConsent ?? null;
  maxAdContentRatingG = mod.MaxAdContentRating?.G ?? 'G';
} catch {
  mobileAds = null;
  adsConsent = null;
}

/**
 * @param isChild Nötr yaş ekranının (AgeGateScreen) cevabına göre: kullanıcı
 * 13 yaşından küçükse true. bkz. dosya başındaki 18 Kasım 2026 notu.
 */
export function initAds(isChild: boolean) {
  if (!mobileAds) return;

  const finishInit = () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const adsManager = require('./adsManager');
    adsManager.setAdsChildFlag(isChild);
    mobileAds!()
      .initialize()
      .then(() => {
        adsManager.preloadAds();
      })
      .catch(() => {});
  };

  const configureRequest = (child: boolean) =>
    mobileAds!()
      .setRequestConfiguration({
        maxAdContentRating: child ? maxAdContentRatingG : undefined,
        tagForChildDirectedTreatment: child,
        tagForUnderAgeOfConsent: child,
      })
      .catch(() => {});

  if (isChild) {
    // Çocuk olarak işaretli kullanıcıya ATT izni / UMP onay formu hiç
    // gösterilmez -- doğrudan çocuğa-yönelik yapılandırmayla initialize.
    configureRequest(true).finally(finishInit);
    return;
  }

  configureRequest(false).finally(() => {
    requestTrackingPermissionsAsync()
      .catch(() => {
        // İzin diyaloğu herhangi bir nedenle başarısız olursa sessizce yut —
        // reklamlar yine de kişiselleştirilmemiş modda initialize edilecek.
      })
      .then(async () => {
        // 13 Ekim 2026: Google UMP onay akışı (AB/EEA ve ABD eyalet
        // düzenlemeleri). AdMob > Gizlilik ve mesajlaşma'da bir mesaj
        // yayınlanmamışsa form gösterilmez, çağrı sessizce biter.
        try {
          await adsConsent?.gatherConsent();
        } catch {
          /* sessiz */
        }
      })
      .finally(finishInit);
  });
}
