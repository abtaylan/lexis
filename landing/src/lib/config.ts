// Uygulamanın (web/) barındırıldığı adres. Vercel env var tanımlıysa onu, değilse
// gerçek production adresini kullanır (21 Ağustos 2026'da lexis-web olarak deploy edildi).
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lexis-web.vercel.app';

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

// ─────────────────────────────────────────────────────────────────────────
// İşletme / yasal bilgiler (KVKK, Mesafeli Sözleşmeler Yönetmeliği ve iyzico
// üye iş yeri başvurusu için zorunlu). 29 Ağustos 2026 oturumunda kullanıcı
// onayıyla, C:\...\PROJELER\iyzico klasöründeki e-Vergi Levhası'ndan alındı
// (aynı şahıs işletmesinin hem uzlaş.io hem Lexis'i kapsadığı doğrulandı).
// NOT: Levhadaki TC Kimlik No kasıtlı olarak BURAYA YAZILMADI — yalnızca
// işletmenin Vergi Kimlik No'su (iyzico/e-ticaret bildirimlerinde kullanılan
// alan) kullanıldı. Telefon numarası kullanıcı tarafından ayrıca sağlandı.
// ─────────────────────────────────────────────────────────────────────────
export const COMPANY_INFO = {
  // Vergi levhasında "Ticaret Ünvanı" alanı boş — şahıs mükellefinde ad-soyad unvan yerine geçer.
  legalName: 'Arif Emre Taylan',
  ownerName: 'Arif Emre Taylan', // İşletme sahibi / vergi mükellefi
  taxOffice: 'Karamürsel Vergi Dairesi',
  taxNumber: '8320646446', // Vergi Kimlik No (TC Kimlik No değil)
  mersisNo: '', // Şahıs işletmeleri için MERSİS zorunlu değildir, tüzel kişiliğe geçilirse doldurulur.
  address: '4 Temmuz Mah. 111. Cad. No: 28 İç Kapı No: 7, Karamürsel / Kocaeli',
  phone: '+90 505 240 03 85',
  kepAddress: '', // Opsiyonel — Kayıtlı Elektronik Posta adresiniz varsa buraya girin.
  email: CONTACT_EMAIL,
};

export const LEGAL_URLS = {
  privacy: '/gizlilik-politikasi',
  kvkk: '/kvkk',
  termsOfUse: '/kullanim-sartlari',
  distanceSales: '/mesafeli-satis-sozlesmesi',
  deliveryRefund: '/teslimat-iade-sartlari',
  about: '/hakkimizda',
};
