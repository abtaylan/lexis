'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/store/auth';
import { useLocale } from '@/lib/i18n';
import { Spinner } from '@/components/ui';
import { AdBanner } from '@/components/ads/AdBanner';
import { BackHomeBar } from '@/components/layout/BackHomeBar';

// Kullanıcı geri bildirimi (24 Eylül 2026): Dashboard zaten ana ekran
// olduğu için Geri/Ana Menü'ye hiç gerek yok; Görev Haritası da kendi tam
// ekran/canvas düzenini kullanıyor, alt kısımda bir gezinme çubuğu oraya
// yakışmıyor. Her iki rota da (ve varsa alt sayfaları) BackHomeBar'dan
// muaf.
const BACK_HOME_BAR_EXCLUDED_PREFIXES = ['/dashboard', '/quests'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const showBackHomeBar = !BACK_HOME_BAR_EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      {/*
        KULLANICI RAPORU (15 Eylül 2026, mobil ekran videosu): "mobil cihazda,
        web olarak giriş yapınca, sitede kayma oluyor" — kök neden burada
        bulundu. `ml-60` md: öneki OLMADAN uygulanıyordu; Sidebar mobilde
        (md altında) fixed + off-canvas (bkz. Sidebar.tsx: `-translate-x-full`,
        sadece `md:translate-x-0`'da kalıcı görünür) ve layout akışında YER
        KAPLAMIYOR, ama <main> her genişlikte 240px'lik sol boşluğu ayırmaya
        devam ediyordu — dar bir mobil ekranda içeriğin büyük kısmı sağa itilip
        ekran dışına taşıyordu (video tam olarak bunu gösteriyor). Aynı şekilde
        Sidebar.tsx'teki mobil üst çubuk `md:hidden fixed top-0 h-14` — sabit
        konumlu olduğu için altındaki içerik `pt-14` ile aşağı itilmezse ilk
        56px'lik kısım çubuğun arkasında kalır. İkisi de sadece md altında
        (mobilde) devreye giriyor; md ve üstünde (masaüstü) davranış aynı kaldı.
      */}
      <main className="flex-1 md:ml-60 min-h-screen overflow-y-auto pt-14 md:pt-0">
        {children}
        {showBackHomeBar && <BackHomeBar />}
        {/*
          Tüm (app) sayfalarının altında tek noktadan reklam gösterimi.
          AdBanner kendi içinde zaten !isPremium ve NEXT_PUBLIC_ADSENSE_CLIENT_ID
          dolu mu kontrolü yapıyor (bkz. components/ads/AdBanner.tsx) — client ID
          boşken hiçbir şey render etmiyor, o yüzden burada ayrıca kontrol gerekmiyor.
          "slot" AdSense panelinde Reklamlar > Reklam birimi oluştur'dan alınan
          gerçek birim ID'sidir. "Lexis Web - Alt Banner (Genel)" adıyla
          29 Ağustos 2026'da oluşturuldu (ca-pub-7117270113356521 / slot
          1199541727, esnek/duyarlı boyut).
        */}
        <div className="px-6 pb-6">
          <AdBanner slot="1199541727" format="auto" className="mt-6" />
        </div>
      </main>
    </div>
  );
}
