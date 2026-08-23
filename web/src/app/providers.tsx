'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/store/auth';
import { LocaleProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/store/theme';
import { AdConsentProvider } from '@/lib/adConsent';
import { AdConsentBanner } from '@/components/ads/AdConsentBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LocaleProvider>
            <AdConsentProvider>
              {children}
              {/* KVKK/GDPR reklam onay banner'ı — sayfa ağacının en üstünde,
                  her rotada (login dahil) görünür kalması bilerek burada. */}
              <AdConsentBanner />
            </AdConsentProvider>
          </LocaleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
