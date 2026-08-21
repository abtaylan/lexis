// Uygulamanın (web/) barındırıldığı adres. Production'a alınırken .env.local'de
// NEXT_PUBLIC_APP_URL gerçek alan adına ayarlanmalı (ör. https://app.lexis... ).
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const LOGIN_URL = `${APP_URL}/login`;
export const REGISTER_URL = `${APP_URL}/register`;

// İletişim e-postası — gerçek adres netleşince burada güncellenmeli.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@lexis.app';

export interface SocialLink {
  key: 'youtube' | 'instagram' | 'x' | 'telegram' | 'slack';
  label: string;
  href: string | null; // null => hesap henüz açılmadı, "yakında" olarak gösterilir
}

// Telegram ve Slack zaten kurulu (bkz. kalan işler listesi, Madde 3b); diğerleri
// "sosyal medya hesapları" fazında açılınca href'leri doldurulmalı.
export const SOCIAL_LINKS: SocialLink[] = [
  { key: 'telegram', label: 'Telegram', href: process.env.NEXT_PUBLIC_TELEGRAM_URL || null },
  { key: 'slack', label: 'Slack', href: process.env.NEXT_PUBLIC_SLACK_URL || null },
  { key: 'youtube', label: 'YouTube', href: null },
  { key: 'instagram', label: 'Instagram', href: null },
  { key: 'x', label: 'X', href: null },
];
