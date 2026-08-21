// Uygulamanın (web/) barındırıldığı adres. Production'a alınırken .env.local'de
// NEXT_PUBLIC_APP_URL gerçek alan adına ayarlanmalı (ör. https://app.lexis... ).
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const LOGIN_URL = `${APP_URL}/login`;
export const REGISTER_URL = `${APP_URL}/register`;

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'lexisappinfo@gmail.com';

export interface SocialLink {
  key: 'youtube' | 'instagram' | 'x' | 'telegram' | 'slack' | 'linkedin';
  label: string;
  href: string | null; // null => hesap henüz açılmadı, "yakında" olarak gösterilir
}

// Tüm sosyal medya hesapları hazır (21 Ağustos 2026) — env değişkeni tanımlıysa
// onu, tanımlı değilse burada sabitlenen gerçek adresi kullanır.
export const SOCIAL_LINKS: SocialLink[] = [
  { key: 'telegram', label: 'Telegram', href: process.env.NEXT_PUBLIC_TELEGRAM_URL || 'https://t.me/lexis_words' },
  { key: 'slack', label: 'Slack', href: process.env.NEXT_PUBLIC_SLACK_URL || 'https://lexis-dsx6779.slack.com/archives/D0BR7D4LC4E' },
  { key: 'youtube', label: 'YouTube', href: process.env.NEXT_PUBLIC_YOUTUBE_URL || 'https://www.youtube.com/channel/UC_csIJCN7WDj-yrLab1iNHw' },
  { key: 'instagram', label: 'Instagram', href: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/lexisappinfo/' },
  { key: 'x', label: 'X', href: process.env.NEXT_PUBLIC_X_URL || 'https://x.com/lexis_words' },
  { key: 'linkedin', label: 'LinkedIn', href: process.env.NEXT_PUBLIC_LINKEDIN_URL || 'https://www.linkedin.com/in/lexis-words-7a605b430/' },
];
