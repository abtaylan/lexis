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

Production'a alınırken `NEXT_PUBLIC_APP_URL` gerçek uygulama alan adına ayarlanmalı, aksi halde Giriş/Kayıt butonları `localhost:3000`'e yönlenir.

## Sosyal medya linkleri

`src/lib/config.ts` içindeki `SOCIAL_LINKS` dizisi: YouTube, Instagram, X hesapları henüz açılmadığı için (kalan işler listesi, "sosyal medya hesapları" fazı) şu an `href: null` — ikonlar sayfada görünür ama tıklanamaz ("yakında" tooltip'i ile). Hesaplar açıldıkça ilgili ortam değişkenini ekleyip `href`'i doldurun.

## Ekran görüntüleri

`public/screenshots/` altındaki `dashboard.png` / `words.png` / `game.png` şu an yer tutucu görsellerdir. Gerçek uygulama ekran görüntüleriyle değiştirilmesi gerekiyor (bkz. kalan işler listesi).
