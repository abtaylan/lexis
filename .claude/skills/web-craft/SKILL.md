---
name: web-craft
description: Lexis web sitesinde (landing) profesyonel, tutarlı ve erişilebilir bir arayüz standardı — geçişler, tipografi, SEO ve kod kalitesi kuralları.
---

# Role: Anthropic-Aligned Senior Web Architect (Lexis Landing)

Bu dosya, bu depoda (özellikle `landing/`) çalışan herhangi bir Claude Code
oturumu için kalıcı bir proje kuralıdır. Amaç: Lexis web sitesini ziyaret
eden herkesin "bu ürünün arkasında iyi iş yapan bir ekip var" hissini
almasını sağlamak — jenerik/şablon görünümlü değil, özenle kurulmuş, tutarlı
bir arayüz.

Kaynak ilham: Anthropic'in resmi frontend/artifact tasarım rehberleri,
`anthropics/claude-code` erişilebilirlik ve design-to-code pratikleri,
prompt-engineering topluluğundaki UX/SEO şablonları ve `shadcn/ui` tarzı
atomik/erişilebilir bileşen kuralları — bu projenin gerçek stack'ine
(Next.js 16 App Router, Tailwind v4, TypeScript, lucide-react, kendi
`useLocale()` i18n sistemi) uyarlanmış hâli.

## Arayüz & Tipografi
- Jenerik AI renk paletlerinden kaçın; nötr zemin (`--gray-*`, `--bg`) + tek
  bir marka rengi (`--brand-500`) + tek bir vurgu rengi (`--accent-600`)
  dışına çıkma. Yeni renk eklemeden önce `landing/src/app/globals.css`
  içindeki `:root` değişkenlerine bak.
- Başlık fontu `Outfit`, mono ihtiyacı için `JetBrains Mono` zaten
  yükleniyor (`globals.css` üstü) — yeni bir font ailesi ekleme.
- Başlık/gövde kontrastını yüksek tut: başlıklar `font-extrabold
  tracking-tight text-gray-900`, gövde metni `text-gray-500`/`text-gray-600`.
- Satır aralığı: gövde metinlerde `leading-relaxed`, uzun paragraflarda
  (`legal-prose`) `line-height: 1.75`.

## Geçişler (Transitions) & Mikro-etkileşimler
- Tüm hover/tap geçişleri `var(--ease-premium)` (cubic-bezier(0.16,1,0.3,1))
  eğrisini kullanır — `globals.css`'teki `a, button, [class*="transition"]`
  kuralıyla otomatik uygulanır, elle `transition-timing-function` yazmaya
  gerek yok.
- Katlanır bölümlerin (Features, HowItWorks, Showcase, Faq, Cta) ekrana
  girişi `<Reveal>` bileşeniyle (`landing/src/components/Reveal.tsx`,
  IntersectionObserver tabanlı fade+translateY) yapılır. Yeni bir bölüm
  eklerken içeriği (veya grid öğelerini tek tek) `<Reveal delay={i * 60-90}>`
  ile sar. Hero gibi above-the-fold içerik için `.animate-fade-in`/
  `.animate-float` yeterli, Reveal'a gerek yok.
- Her yeni animasyon `prefers-reduced-motion: reduce` tercihine uymalı —
  `Reveal` ve mevcut keyframe animasyonları bunu otomatik hallediyor, yeni
  bir animasyon eklerken bu davranışı bozma.
- Kart/buton hover'larında ölçü/gölge değişimi ince olsun (`hover:-translate-y-0.5`,
  `hover:shadow-md`, ana CTA için `hover:scale-[1.03]` gibi) — büyük/abartılı
  hareket "ucuz" hissettirir.

## Dönüşüm & İçerik
- Hero alanı doğrudan kullanıcı problemine ve değer teklifine odaklansın;
  jenerik "harika özellikler" yerine somut sayı/fayda kullan (bkz. Hero
  istatistikleri: "12 dilde", "6 oyun modu").
- Buton ve formlarda açık, eylem bildiren mikro metinler (microcopy)
  kullan: "Ücretsiz Başla" > "Devam Et"/"Gönder".
- Yeni metin eklerken 12 dilin tamamında (`landing/src/lib/i18n.tsx` →
  `dictionaries`) aynı anahtar setinin eksiksiz kalmasına dikkat et — bir
  dil unutulursa o anahtar sessizce `en` karşılığına düşer.

## SEO
- `landing/src/app/layout.tsx` içindeki JSON-LD bloklarını
  (SoftwareApplication, Organization, WebSite, FAQPage) güncel tut.
  FAQPage metinleri `dictionaries.tr` içindeki `faqQ*/faqA*` ile birebir
  aynı olmalı — SSS metni değişirse ikisi birlikte güncellenmeli.
- Open Graph + Twitter card görselleri (`/og-image.png`) ve `SITE_URL`
  (`landing/src/lib/config.ts`) tek kaynak — yeni bir sayfa eklerken
  `metadata.alternates.canonical` ve gerekiyorsa kendi OG görselini ver.

## Kod Kalitesi & Erişilebilirlik
- Semantik HTML5 (`header`, `nav`, `main`, `section`, `article`, `footer`)
  — proje bunu zaten kullanıyor, yeni bölüm eklerken bu düzeni koru.
- İkon-only linkler/butonlar için görünür metin yoksa mutlaka `aria-label`
  ver (sadece `title` yeterli değil, ekran okuyucu desteği için).
- Açılır menü/akordeon gibi bileşenlerde `aria-expanded`, `aria-haspopup`,
  gerektiğinde `role="listbox"`/`role="option"` kullan; `Escape` tuşuyla
  kapanabilir olsun (bkz. `LanguageSwitcher.tsx`).
- `:focus-visible` stilini (`globals.css`) hiçbir yeni interaktif elemanda
  `outline: none` ile ezme — tam klavye navigasyonu zorunlu.
- Yeni bir bağımlılık eklemeden önce mevcut setle (lucide-react, Tailwind v4
  utility'leri) çözülüp çözülemeyeceğine bak; landing bilerek hafif
  tutuluyor (bkz. `landing/package.json`).
