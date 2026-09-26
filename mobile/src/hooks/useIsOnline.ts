// src/hooks/useIsOnline.ts — Offline mod / onbellekleme (24 Eylul 2026,
// V2 oncelik #11). expo-network Expo'nun kendi managed-workflow modulu,
// MMKV/NetInfo gibi ayrica linklenmesi gereken bir community native paket
// DEGIL diye dusunulmustu -- ama bu dosya sadece expo-network'un hazir
// useNetworkState() hook'unu tek bir boolean'a indirgeyen ince bir
// sarmalayici.
//
// CRASH FIX (26 Eylul 2026): Flashcards ekranina girildiginde hem iOS'ta
// (native hata ekrani) hem Android'de (sessiz kapanma, hic hata gostermeden)
// uygulama coktugu bildirildi. Kok neden: 18/21 Eylul'deki adsInit.ts ve
// GoogleSignInButton.tsx crash'leriyle BIREBIR AYNI hata sinifi --
// `import { useNetworkState } from 'expo-network'` STATIK importu. expo-network
// paketinin JS tarafi modul degerlendirilirken (herhangi bir hook hic
// cagrilmadan) UST SEVIYEDE `requireNativeModule('ExpoNetwork')` cagiriyor.
// Bu paket sadece bu dosyada kullaniliyor, o da sadece flashcards.tsx
// tarafindan import ediliyor -- yani telefondaki YUKLU build'e expo-network'un
// native modulu henuz linklenmemisse (native rebuild yapilmadan sadece OTA/
// EAS Update ile eski bir build'e gonderilmisse), flashcards.tsx mount olur
// olmaz, herhangi bir render/try-catch'e girmeden TUM UYGULAMA cokuyordu.
// AppErrorBoundary bunu YAKALAYAMAZ (sadece render agacindaki hatalari
// yakalar, import-time/module-scope hatalarini degil).
//
// Cozum adsInit.ts/GoogleSignInButton.tsx ile BIREBIR AYNI desen: STATIK
// import yerine module-scope'ta try/catch icinde require(). Native modul
// yoksa (henuz linklenmemis bir build) useIsOnline() sessizce iyimser
// "cevrimici" (true) doner -- offline banner'i hic gorunmez ama uygulama
// coker, mevcut build'ler icin bir davranis kaybi yok (zaten optimistic
// default'tu). Native modul linklenmis bir build'de hicbir davranis
// degismiyor.
//
// isConnected/isInternetReachable ilk render'da (olcum henuz gelmeden)
// undefined olabiliyor -- bu durumda "cevrimdisi" banner'ini yanlislikla
// bir an icin gostermemek icin iyimser sekilde "cevrimici" varsayiyoruz.
type NetworkState = { isConnected?: boolean; isInternetReachable?: boolean };
type UseNetworkStateHook = () => NetworkState;

let useNetworkState: UseNetworkStateHook | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useNetworkState = require('expo-network').useNetworkState;
} catch {
  useNetworkState = null;
}

export function useIsOnline(): boolean {
  // useNetworkState bir modul-scope sabiti (build boyunca degismez), bu
  // yuzden bu kosullu cagri React'in hook kurallarini render'lar arasinda
  // ihlal etmiyor -- ayni build icinde her zaman ayni dala giriyor
  // (adsInit.ts/GoogleSignInButton.tsx'teki `if (!mobileAds) return;`
  // deseniyle ayni guvenlik mantigi).
  if (!useNetworkState) {
    return true;
  }
  const state = useNetworkState();
  if (state.isInternetReachable === undefined && state.isConnected === undefined) {
    return true;
  }
  return state.isInternetReachable !== false && state.isConnected !== false;
}
