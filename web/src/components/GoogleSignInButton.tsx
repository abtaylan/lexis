'use client';

// components/GoogleSignInButton.tsx — Web tarafı "Google ile Giriş". Mobil
// tarafta şu an native Google Sign-In YOK (ayrı, daha büyük bir iş — native
// modül + EAS rebuild gerektiriyor); bu component sadece web'i kapsıyor.
// Google Identity Services (GIS) ile id_token alınır, backend'in YENİ
// /auth/google ucuna gönderilir (bkz. backend/app/api/routes/auth.py
// google_sign_in — apple_sign_in ile birebir aynı desen, Supabase'in
// sign_in_with_id_token'ı kullanıyor). Google'ın kendi renderButton'ı
// kullanılıyor (custom buton + One Tap FedCM kısıtlamalarından kaçınmak için
// Google'ın önerdiği, en güvenilir yöntem).
//
// KULLANICI GERİ BİLDİRİMİ (14 Eylül eleştiri videosu): login/register
// sayfasında "beyaz kutu" glitch'i görülüyordu — kök neden: Google'ın script'i
// (accounts.google.com/gsi/client) yüklenene kadar (veya bir reklam/izleyici
// engelleyici tamamen bloklarsa SÜRESİZ) `renderButton` hiç çağrılmıyor ve
// konteyner tamamen BOŞ/BEYAZ kalıyordu. Çözüm: her zaman görünen, Google'ın
// marka kılavuzuna uygun (beyaz zemin + renkli "G" logosu + gri kenarlık)
// SABİT bir görsel buton katmanı + üstüne bindirilmiş, Google'ın gerçek
// (ve tamamen tıklanabilir) renderButton çıktısını opacity:0 ile görünmez
// şekilde yerleştiren bir katman. Böylece kullanıcı HİÇBİR ZAMAN boş bir kutu
// görmez; script yüklenince tıklama gerçek Google butonuna gider.
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { completeSocialSignIn, socialSignInRedirectPath } from '@/lib/socialAuth';
import { useAuth } from '@/store/auth';
import { SOCIAL_AUTH_STRINGS } from '@/lib/socialAuthStrings';
import type { Locale } from '@/lib/i18n';

const GOOGLE_CLIENT_ID = '856605079231-jt6reif19ti3nla7c451krr0848r1li9.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  locale: Locale;
  onError: () => void;
}

// Google'ın resmi çok renkli "G" logosu (marka kılavuzunda sign-in butonları
// için önerilen simge) — sabit görsel katmanda kullanılıyor.
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.173 0 7.548 0 9s.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
    </svg>
  );
}

export function GoogleSignInButton({ locale, onError }: GoogleSignInButtonProps) {
  const router = useRouter();
  const { login: loginToStore } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const st = SOCIAL_AUTH_STRINGS[locale] ?? SOCIAL_AUTH_STRINGS.tr!;

  // Reklam/izleyici engelleyiciler (uBlock, AdGuard, Brave vb.) accounts.google.com'u
  // sıkça engelliyor — bu durumda next/script'in onLoad'ı hiç tetiklenmez ve buton
  // konteyneri sonsuza dek boş kalırdı, kullanıcı hiçbir şey görmezdi. 6 saniyede
  // hâlâ yüklenmediyse kullanıcıya bunun neden çalışmadığını açıkça göster.
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setUnavailable(true), 6000);
    return () => clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (!ready || typeof window === 'undefined' || !window.google || !containerRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
        try {
          const res = await authApi.googleSignIn({ id_token: response.credential });
          const user = await completeSocialSignIn(res, loginToStore);
          router.push(socialSignInRedirectPath(user));
        } catch {
          onError();
        }
      },
    });

    const width = containerRef.current.offsetWidth || 320;
    window.google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'continue_with',
      logo_alignment: 'left',
      width,
    });
  }, [ready, onError, router, loginToStore]);

  return (
    <>
      <Script
        src={`https://accounts.google.com/gsi/client?hl=${locale}`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onError={() => setUnavailable(true)}
      />
      <div className="relative w-full h-11">
        {/* Sabit görsel katman: Google'ın resmi buton stiline uygun (beyaz zemin,
            ince gri kenarlık, renkli "G" logosu) — script yüklenmeden önce de,
            hatta hiç yüklenemezse de HER ZAMAN düzgün görünür. Gerçek buton
            hazır olduğunda (ready) pointer-events kapatılır ki tıklama üstteki
            gerçek Google katmanına gitsin; engellenmiş durumda (unavailable)
            kendisi tıklanabilir kalıp onError ile kullanıcıyı bilgilendirir. */}
        <div
          onClick={unavailable && !ready ? onError : undefined}
          className={`absolute inset-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white text-slate-700 text-sm font-medium flex items-center justify-center gap-3 shadow-sm transition-opacity ${
            ready ? 'pointer-events-none' : unavailable ? 'cursor-pointer hover:bg-slate-50' : ''
          }`}
        >
          <GoogleLogo />
          <span>{st.googleBtn}</span>
        </div>

        {/* Google'ın gerçek renderButton çıktısı: görsel katmanın tam üstüne
            oturur ama opacity-0 ile görünmez — script yüklenip iframe hazır
            olduğunda gerçek OAuth tıklamasını bu katman yönetir. */}
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-11 overflow-hidden opacity-0 flex items-center justify-center [&>div]:w-full [&_iframe]:!w-full [&_iframe]:!h-full"
        />
      </div>
      {unavailable && !ready && (
        <p className="text-[11px] text-slate-400 text-center -mt-1">
          Google ile giriş yüklenemedi — tarayıcı eklentisi (reklam/izleyici engelleyici) engelliyor olabilir.
        </p>
      )}
    </>
  );
}
