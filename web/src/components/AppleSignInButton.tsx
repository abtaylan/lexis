'use client';

// components/AppleSignInButton.tsx — Web tarafı "Apple ile Giriş".
// mobile/src/components/AppleSignInButton.tsx'in web eşdeğeri: orada native
// expo-apple-authentication kullanılıyordu, burada Apple JS SDK'nın
// usePopup:true modu ile aynı id_token elde edilip AYNI backend ucuna
// (POST /auth/apple) gönderiliyor — backend'de hiçbir değişiklik gerekmedi.
// Services ID (app.lexis.web) Apple Developer Console'da ayrı bir kimlik
// olarak kayıtlı (native Bundle ID app.lexis.mobile'dan farklı), Supabase'in
// Apple sağlayıcısındaki "Client IDs" listesine de eklendi.
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { completeSocialSignIn, socialSignInRedirectPath } from '@/lib/socialAuth';
import { useAuth } from '@/store/auth';

const SERVICES_ID = 'app.lexis.web';

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => void;
      };
    };
  }
}

interface AppleSignInButtonProps {
  label: string;
  onError: () => void;
}

export function AppleSignInButton({ label, onError }: AppleSignInButtonProps) {
  const router = useRouter();
  const { login: loginToStore } = useAuth();
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready || typeof window === 'undefined' || !window.AppleID) return;
    window.AppleID.auth.init({
      clientId: SERVICES_ID,
      scope: 'name email',
      redirectURI: `${window.location.origin}/auth/apple/callback`,
      usePopup: true,
    });
  }, [ready]);

  // Reklam/izleyici engelleyiciler (uBlock, AdGuard, Brave vb.) appleid.cdn-apple.com'u
  // sıkça engelliyor — bu durumda next/script'in onLoad'ı hiç tetiklenmez ve buton
  // sonsuza dek "pasif" görünür kalırdı. 6 saniyede hâlâ yüklenmediyse kullanıcıya
  // bunun neden çalışmadığını açıkça göster (bkz. GoogleSignInButton.tsx — aynı desen).
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setUnavailable(true), 6000);
    return () => clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    const handleSuccess = async (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        authorization?: { id_token?: string };
        user?: { name?: { firstName?: string; lastName?: string } };
      } | undefined;
      const idToken = detail?.authorization?.id_token;
      if (!idToken) return;
      const fullName = detail?.user?.name
        ? [detail.user.name.firstName, detail.user.name.lastName].filter(Boolean).join(' ')
        : undefined;
      setLoading(true);
      try {
        const res = await authApi.appleSignIn({ id_token: idToken, full_name: fullName || undefined });
        const user = await completeSocialSignIn(res, loginToStore);
        router.push(socialSignInRedirectPath(user));
      } catch {
        onError();
      } finally {
        setLoading(false);
      }
    };
    const handleFailure = (event: Event) => {
      const detail = (event as CustomEvent).detail as { error?: string } | undefined;
      // Kullanıcı popup'ı kendi kapattıysa hata gösterme — Apple'ın kendi
      // davranışı bu, kullanıcı akışı iptal etmek istemiş demektir.
      if (detail?.error === 'popup_closed_by_user') return;
      onError();
    };
    document.addEventListener('AppleIDSignInOnSuccess', handleSuccess);
    document.addEventListener('AppleIDSignInOnFailure', handleFailure);
    return () => {
      document.removeEventListener('AppleIDSignInOnSuccess', handleSuccess);
      document.removeEventListener('AppleIDSignInOnFailure', handleFailure);
    };
  }, [onError, router, loginToStore]);

  return (
    <>
      <Script
        src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onError={() => setUnavailable(true)}
      />
      <button
        type="button"
        disabled={!ready || loading}
        onClick={() => window.AppleID?.auth.signIn()}
        className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <AppleLogo />
        {label}
      </button>
      {unavailable && !ready && (
        <p className="text-[11px] text-slate-400 text-center mt-1">
          Apple ile giriş yüklenemedi — tarayıcı eklentisi (reklam/izleyici engelleyici) engelliyor olabilir.
        </p>
      )}
    </>
  );
}

function AppleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.485 2.163-1.11 2.95-.767.958-2.017 1.755-3.222 1.66-.14-1.11.485-2.293 1.155-3.03.79-.887 2.09-1.564 3.177-1.58zm3.41 15.47c-.29.665-.63 1.29-1.02 1.87-.51.75-1.14 1.71-1.98 1.72-.79.01-1-.51-1.99-.51s-1.23.5-1.99.52c-.83.01-1.47-.87-1.99-1.61-1.16-1.68-2.04-4.76-.85-6.86.58-1.03 1.62-1.68 2.75-1.7.8-.02 1.55.54 2.02.54.47 0 1.38-.66 2.32-.56.4.02 1.5.16 2.21 1.21-.06.04-1.32.77-1.31 2.3.02 1.83 1.6 2.44 1.62 2.45-.01.05-.25.87-.83 1.72z" />
    </svg>
  );
}
