# Lexis — Kurumsal Tanıtım Sayfası

`web/` uygulamasından bağımsız, tek sayfalık kurumsal/tanıtım sitesi (Next.js). 9 dilde arayüz destekler (bkz. `src/lib/i18n.tsx`), gerçek uygulamaya (`web/`) giriş/kayıt yönlendirmesi yapar.

## Geliştirme

```bash
npm install
npm run dev
```

`http://localhost:3000` adresinde açılır (`web/` ile aynı anda çalıştırılacaksa `npm run dev -- -p 3001` gibi farklı bir port kullanın).

## Ortam değişkenleri (`.env.local`)

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Giriş/Kayıt butonlarının yönlendirdiği `web/` uygulamasının adresi | `http://localhost:3000` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Footer'daki iletişim e-postası | `info@lexis.app` (yer tutucu — gerçek adres netleşince güncellenmeli) |
| `NEXT_PUBLIC_TELEGRAM_URL` | Telegram kanal/bot linki | boş (ikon "yakında" görünür) |
| `NEXT_PUBLIC_SLACK_URL` | Slack workspace davet linki | boş (ikon "yakında" görünür) |
| `NEXT_PUBLIC_LINKEDIN_URL` | LinkedIn şirket sayfası linki | boş (ikon "yakında" görünür) |

Production'a alınırken `NEXT_PUBLIC_APP_URL` gerçek uygulama alan adına ayarlanmalı, aksi halde Giriş/Kayıt butonları `localhost:3000`'e yönlenir.

**Not (21 Ağustos 2026):** Bu proje Vercel'e deploy edildi ama yukarıdaki ortam değişkenleri kullanıcı kararıyla henüz Vercel'e girilmedi — iletişim e-postası/sosyal linkler netleşip canlıya alım tamamlanınca hepsi birlikte Vercel proje ayarlarına eklenecek.

## Sosyal medya linkleri

`src/lib/config.ts` içindeki `SOCIAL_LINKS` dizisi (14 Eylül 2026 itibarıyla güncel): Telegram, Slack, YouTube, Instagram, X, LinkedIn, Facebook, TikTok, WhatsApp Kanalı, Threads, Pinterest — tüm hesaplar açık ve `href` dolu. İlgili ortam değişkeni tanımlıysa onu, değilse buradaki sabit adresi kullanır. **Slack linki bir davet linki ve 14 Ekim 2026'da sona eriyor** — o tarihte Slack admin panelinden yeni bir davet linki alınıp hem burada hem `backend/app/services/email_service.py::_SOCIAL_LINKS` içinde güncellenmesi gerekiyor.

## Ekran görüntüleri

`public/screenshots/` altındaki `dashboard.png` / `words.png` / `game.png` artık gerçek uygulama ekran görüntüleri (21 Ağustos 2026'da alındı). **Bilinen sınırlama:** arayüz dili değiştirilse bile bu görseller hep aynı (Türkçe içerikli) kalıyor — her dil için ayrı ekran görüntüsü alınması kalan işler listesinde not edildi, henüz yapılmadı.
