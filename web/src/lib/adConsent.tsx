'use client';

// lib/adConsent.tsx — KVKK/GDPR uyumlu reklam (AdSense) onay durumu.
//
// AdSense gibi kişiselleştirilmiş reklam script'leri "kesinlikle gerekli
// olmayan" çerez/izleyici kategorisine girer (KVKK Aydınlatma Metni m.5 +
// GDPR ePrivacy Directive) — kullanıcı açıkça onay vermeden bu script HİÇ
// yüklenmemeli, sadece "gizlenmiş" olması yetmez. Bu modül tek doğruluk
// kaynağı: hem <AdConsentBanner /> (soran banner) hem de <AdBanner />
// (web/src/components/ads/AdBanner.tsx — reklamı gösteren/yükleyen bileşen)
// aynı useAdConsent() hook'unu kullanıyor.
//
// NOT (mobil): react-native-google-mobile-ads paketinin kendi Google UMP
// (User Messaging Platform) SDK entegrasyonu var — mobil tarafta AdMob için
// ayrı bir consent akışı gerekiyor, bu kapsam dışı bırakıldı (bkz. backlog —
// ayrı bir native SDK entegrasyonu ve yeni bir eas build gerektirir).
//
// NOT (29 Ağustos 2026 — Google CMP çakışması, bkz. kalan işler "Orta
// vadeli"): AdSense hesabında Google'ın sertifikalı CMP'si de ayrıca
// etkinleştirilmiş durumda. adsbygoogle.js YALNIZCA bu banner'dan "accepted"
// alındıktan SONRA yükleniyor (ensureAdsenseScript, AdBanner.tsx) — yani
// AB/İngiltere ziyaretçisi için Google'ın kendi CMP mesajı da script
// yüklendiğinde ikinci kez sorabilir (üst üste binme, işlevsel bir hata
// değil). Kalıcı çözüm KOD DEĞİL, AdSense hesap ayarı: Gizlilik ve mesaj
// gösterme > Google'ın sertifikalı CMP'sini kapatmak — çünkü bu banner zaten
// script'in YÜKLENMESİNİ tamamen engelliyor (Google'ın mesaj-sonrası
// yaklaşımından daha güçlü bir KVKK/GDPR duruşu), tek gerçek onay akışı bu
// olmalı. Bu ayar değişikliği kullanıcının açık onayını gerektirir.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type AdConsentValue = 'accepted' | 'rejected' | null; // null = henüz karar verilmedi

const STORAGE_KEY = 'lexis_ad_consent';

interface AdConsentContextType {
  consent: AdConsentValue;
  /** localStorage okunup ilk değer belirlenene kadar false — SSR/hydration
   * sırasında banner'ın ya da reklamın yanlışlıkla "flash" etmesini önler. */
  loaded: boolean;
  accept: () => void;
  reject: () => void;
}

const AdConsentContext = createContext<AdConsentContextType | null>(null);

export function AdConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<AdConsentValue>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'accepted' || saved === 'rejected') setConsent(saved);
    } catch {
      // localStorage erişilemez durumdaysa (gizli sekme, kısıtlı tarayıcı vb.)
      // sessizce null kalır — banner her ziyarette tekrar sorar, güvenli varsayılan.
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((value: 'accepted' | 'rejected') => {
    setConsent(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* yut — en azından bu oturumda state güncel kalır */
    }
  }, []);

  const accept = useCallback(() => persist('accepted'), [persist]);
  const reject = useCallback(() => persist('rejected'), [persist]);

  return (
    <AdConsentContext.Provider value={{ consent, loaded, accept, reject }}>
      {children}
    </AdConsentContext.Provider>
  );
}

export function useAdConsent() {
  const ctx = useContext(AdConsentContext);
  if (!ctx) throw new Error('useAdConsent must be used inside AdConsentProvider');
  return ctx;
}
