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
// üye iş yeri başvurusu için zorunlu).
//
// 4 Eylül 2026 KARARI: Lexis artık Arif Emre Taylan'ın şahıs işletmesi
// üzerinden değil, Behçet'in kendi adına başvurduğu GVK mükerrer 20/B
// "mobil uygulama geliştiriciliği" kazanç istisnası üzerinden yürütülüyor
// (bkz. Küçükköy Vergi Dairesi Müdürlüğü'ne sunulan dilekçe, işlem no
// 1dmtmujj741x4u — sonuç bekleniyor). Bu yüzden aşağıdaki bilgiler Arif
// Emre'den Behçet'in kendi bilgilerine çevrildi:
//   - legalName/ownerName: Ahmet Behçet Taylan
//   - address: App Store Connect'teki (Business > Agreements > Legal Entity)
//     kayıtlı adresle aynı — Google Play Console'daki "Yasal ad ve adres" da
//     bununla uyumlu, sadece Apple'daki kayıt bina no + ilçe dahil daha tam.
//   - phone: Google Play Console'daki doğrulanmış iletişim numarasıyla aynı.
//   - taxNumber: HENÜZ BOŞ — dilekçe onaylanıp Behçet'in kendi vergi/istisna
//     kaydı netleşmeden geçerli bir numara yok. Dilekçe sonuçlanınca
//     doldurulmalı (bkz. LEXIS_DEVIR notları).
// ─────────────────────────────────────────────────────────────────────────
export const COMPANY_INFO = {
  // Şahıs mükellefinde ad-soyad unvan yerine geçer (Ticaret Ünvanı yok).
  legalName: 'Ahmet Behçet Taylan',
  ownerName: 'Ahmet Behçet Taylan', // İşletme sahibi / vergi mükellefi
  taxOffice: 'Küçükköy Vergi Dairesi Müdürlüğü',
  taxNumber: '', // TBD — GVK mükerrer 20/B istisna dilekçesi onaylanınca doldurulacak
  mersisNo: '', // Şahıs işletmeleri için MERSİS zorunlu değildir, tüzel kişiliğe geçilirse doldurulur.
  address: 'Mimar Sinan Mahallesi Itır Sokak No 13, Sultanbeyli / İstanbul - 34000',
  phone: '+90 545 490 18 79',
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
  // Google Play "Veri güvenliği" beyanının zorunlu kıldığı hesap silme
  // talimatları sayfası (bkz. app-content/data-privacy-security).
  deleteAccount: '/hesap-silme',
};
