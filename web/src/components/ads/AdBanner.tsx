'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/store/auth';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '';

let scriptInjected = false;

function ensureAdsenseScript() {
  if (scriptInjected || typeof document === 'undefined' || !ADSENSE_CLIENT_ID) return;
  const existing = document.querySelector('script[data-lexis-adsense]');
  if (existing) {
    scriptInjected = true;
    return;
  }
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  script.crossOrigin = 'anonymous';
  script.setAttribute('data-lexis-adsense', 'true');
  document.head.appendChild(script);
  scriptInjected = true;
}

interface AdBannerProps {
  /** AdSense reklam birimi slot ID'si — panelden oluşturulur */
  slot: string;
  format?: 'auto' | 'horizontal' | 'rectangle';
  className?: string;
}

/**
 * Premium olmayan kullanıcılara reklam gösterir.
 * ADSENSE_CLIENT_ID tanımlı değilse veya kullanıcı premium ise hiçbir şey render etmez.
 */
export function AdBanner({ slot, format = 'auto', className = '' }: AdBannerProps) {
  const { user, isLoading } = useAuth();
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  const isPremium = !!user?.is_premium;

  useEffect(() => {
    if (isLoading || isPremium || !ADSENSE_CLIENT_ID) return;
    ensureAdsenseScript();
    if (pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // AdSense script henüz yüklenmemişse sessizce geç
    }
  }, [isLoading, isPremium]);

  if (isLoading || isPremium || !ADSENSE_CLIENT_ID) return null;

  return (
    <div className={`w-full flex justify-center overflow-hidden ${className}`}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
