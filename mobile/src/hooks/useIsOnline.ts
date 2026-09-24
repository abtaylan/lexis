// src/hooks/useIsOnline.ts — Offline mod / onbellekleme (24 Eylul 2026,
// V2 oncelik #11). expo-network zaten SDK'yla eslesen surumde (57.0.2)
// eklendi -- Expo'nun kendi managed-workflow modulu, MMKV/NetInfo gibi
// ayrica linklenmesi gereken bir community native paket DEGIL, yeni bir
// prebuild/native build GEREKTIRMIYOR. Bu dosya sadece expo-network'un
// hazir useNetworkState() hook'unu tek bir boolean'a indirgeyen ince bir
// sarmalayici.
//
// isConnected/isInternetReachable ilk render'da (olcum henuz gelmeden)
// undefined olabiliyor -- bu durumda "cevrimdisi" banner'ini yanlislikla
// bir an icin gostermemek icin iyimser sekilde "cevrimici" varsayiyoruz.
import { useNetworkState } from 'expo-network';

export function useIsOnline(): boolean {
  const state = useNetworkState();
  if (state.isInternetReachable === undefined && state.isConnected === undefined) {
    return true;
  }
  return state.isInternetReachable !== false && state.isConnected !== false;
}
