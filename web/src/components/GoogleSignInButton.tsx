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
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { completeSocialSignIn, socialSignInRedirectPath } from '@/lib/socialAuth';
import { useAuth } from '@/store/auth';
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

export function GoogleSignInButton({ locale, onError }: GoogleSignInButtonProps) {
  const router = useRouter();
  const { login: loginToStore } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

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
      shape: 'pixel',
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
      <div ref={containerRef} className="w-full flex justify-center [&>div]:w-full [&_iframe]:!w-full" />
      {unavailable && !ready && (
        <p className="text-[11px] text-slate-400 text-center -mt-1">
          Google ile giriş yüklenemedi — tarayıcı eklentisi (reklam/izleyici engelleyici) engelliyor olabilir.
        </p>
      )}
    </>
  );
}
