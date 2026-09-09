// lib/socialAuthStrings.ts — "veya" ayırıcı + Apple/Google buton metinleri.
// Merkezi lib/i18n.tsx sözlüğüne dokunmadan yerel çeviri (10 dilin hepsine
// key eklemek yerine) — exam-grammar sayfalarındaki Partial<Record<Locale,...>>
// deseniyle aynı yaklaşım (bkz. app/(app)/exam-grammar/page.tsx).
import type { Locale } from '@/lib/i18n';

export interface SocialAuthStrings {
  orDivider: string;
  appleBtn: string;
  googleBtn: string;
  socialError: string;
}

export const SOCIAL_AUTH_STRINGS: Partial<Record<Locale, SocialAuthStrings>> = {
  tr: {
    orDivider: 'veya',
    appleBtn: 'Apple ile devam et',
    googleBtn: 'Google ile devam et',
    socialError: 'Giriş başarısız. Lütfen tekrar deneyin.',
  },
  en: {
    orDivider: 'or',
    appleBtn: 'Continue with Apple',
    googleBtn: 'Continue with Google',
    socialError: 'Sign-in failed. Please try again.',
  },
};
