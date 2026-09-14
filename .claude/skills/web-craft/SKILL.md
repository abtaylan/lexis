---
name: web-craft
description: Lexis web sitesinde (landing) profesyonel, karakterli ve erişilebilir bir arayüz standardı — marka rengi/tipografi sistemi, scroll hikayeleştirme, SEO ve kod kalitesi kuralları.
---

# Role: Senior Web Architect — Lexis Landing (Dark Navy + Ribbon yönü)

Bu dosya, bu depoda (özellikle `landing/`) çalışan herhangi bir Claude Code
oturumu için kalıcı bir proje kuralıdır. Amaç: Lexis web sitesini ziyaret
eden herkesin "bu ürünün arkasında iyi iş yapan bir ekip var" hissini
almasını sağlamak. 14 Eylül 2026'da 3 farklı görsel yönelim (Editorial Navy /
Dark Navy + Ribbon / Warm Paper Minimal) mockup olarak sunuldu, kullanıcı
**Dark Navy + Ribbon**'ı seçti ve üstüne "çok daha fazla animasyon/geçiş,
Awwwards tarzı" istedi — aşağıdaki sistem bunun uygulanmış hâli.

## Marka renk sistemi
- `--brand-*` ve `--accent-*` token'ları (`globals.css`) artık markanın
  gerçek logo renklerine işaret ediyor: `--brand-500: #4C6FFF` (logodaki
  şeridin mavi ucu), `--accent-600: #7B5CFA` (mor ucu). Bunlar jenerik
  "AI mavi-moru" DEĞİL — logodan alınmış gerçek marka rengi, bilerek aynı
  ton ailesinde. Yeni bir renk eklemeden önce bu token'ları kullan.
- `--navy-900: #0B1330` / `--navy-800` / `--navy-700` — logonun lacivert
  zemin rengi, koyu bölümler (Hero, Cta) için ayrı token (gray-900 ile
  karıştırma, o metin rengi için kullanılıyor).
- Kural: gradyan (mavi->mor) dekoratif bir "marka imzası" olarak SADECE
  `RibbonMotif` bileşeni üzerinden kullanılır (Hero, Cta) — sayfanın geri
  kalanında büyük gradyan zemin/buton YOK; bu tam olarak kaçınılan "jenerik
  AI landing page" klişesi.

## Tipografi
- Başlık fontu `Space Grotesk` (`.display` class'ı), gövde fontu
  `IBM Plex Sans` (varsayılan `html{font-family}`). Outfit/JetBrains Mono
  14 Eylül'de bilerek terk edildi (jenerik/aşırı yaygın font ailesi).
  Yeni bir başlık eklerken `className="display"` ekle.
- Başlık/gövde kontrastını yüksek tut: koyu bölümlerde başlık `text-white`,
  gövde `text-white/70`; açık bölümlerde başlık `text-gray-900`, gövde
  `text-gray-500`.

## Scroll hikayeleştirme & animasyon sistemi
Bu site artık "çok animasyonlu/geçişli" bir yön izliyor (kullanıcı isteği,
14 Eylül) — GSAP gibi bir kütüphane KURULU DEĞİL (device_bash'ten npm
install güvenilir şekilde tamamlanamadı), bütün efektler native
IntersectionObserver + CSS ile yazıldı. Yeni bir bölüm eklerken bu
bileşenleri kullan, sıfırdan animasyon yazma:
- **`Reveal`** (`src/components/Reveal.tsx`): scroll'da fade+translate ile
  ortaya çıkar. `variant` prop'u ile yön değiştir (`up` varsayılan, `left`,
  `right`, `scale`, `blur`) — aynı bölümde hepsini aynı variant'ta
  kullanma, çeşitlilik "hareketli" hissi verir.
- **`RibbonMotif`** (`src/components/RibbonMotif.tsx`): logodaki gradyan
  şeridin büyütülmüş SVG hâli, `.ribbon-drift` ile çok yavaş sürüklenir.
  Sadece koyu (navy) bölümlerde arka plan dekoru olarak kullan. Statik bir
  `rotate-*` class'ıyla döndürmek istersen bileşeni bir DIV İÇİNE SAR — SVG
  kendi üzerinde zaten `ribbon-drift` animasyonu çalıştırdığı için doğrudan
  SVG'ye eklenen transform class'ı animasyon tarafından ezilir.
- **`MagneticButton`** (`src/components/MagneticButton.tsx`): birincil
  CTA'larda kullan; imleç yaklaşınca hafifçe kayar. Sadece gerçek fare +
  `prefers-reduced-motion` kapalıyken çalışır, dokunmatikte sessizce normal
  buton kalır.
- **Sabitlenen panel + crossfade** (Features.tsx, Showcase.tsx masaüstü
  düzeni): `src/lib/useScrollActive.ts` hook'unu kullan
  (`const { active, setRef } = useScrollActive()`) — sağ/sol sütundaki her
  bloğa `ref={setRef(i)} data-index={i}` ver, sabitlenen panelde
  `.crossfade-item ${active === i ? 'is-active' : ''}` ile göster. Bu hook
  eski tekrarlanan `useState`+`useRef`+`IntersectionObserver`
  (`rootMargin: '-45% 0 -45% 0'`) mantığının ortak hâli — yeni bir
  "scrollytelling" bölümü eklerken bunu tekrar yazma, hook'u import et.
  Features'ta panel artık `.feature-card` (Hero/Cta ile aynı lacivert kart +
  RibbonMotif + alttaki 6 parçalı ilerleme çubuğu); Showcase'te panel gerçek
  ekran görüntülerini `next/image fill` ile aynı şekilde crossfade'liyor.
- **Görsel wipe reveal**: `.img-reveal` class'ı, ebeveyn `.reveal.is-visible`
  olduğunda `clip-path` ile açılır (bkz. globals.css'teki descendant
  kural) — `Reveal` içine `<div className="img-reveal">` koymak yeterli,
  ayrıca JS gerekmez. Sadece mobil/statik kart düzenlerinde kullanılıyor
  (Showcase'in masaüstü sabit panelinde `.crossfade-item` kullanılıyor).
- **Akordiyon yükseklik geçişi** (Faq.tsx): abrupt `{isOpen && <div>}` mount
  YAPMA — `.faq-collapse`/`.faq-collapse-inner` (globals.css,
  `grid-template-rows: 0fr -> 1fr` + fade) ile yumuşak açılır/kapanır. Yeni
  bir akordiyon eklerken bu iki class'ı kopyala, JS tarafında sadece
  `is-open` class'ını toggle'la.
- **Header'ın koyu/açık geçişi** (Header.tsx): `#top` (Hero) elementini
  `IntersectionObserver` ile izleyip Hero üstündeyken şeffaf/beyaz metin,
  Hero'yu geçince opak/koyu metne döner. Hero'nun id'sini değiştirirsen bu
  gözlemciyi de güncelle.
- **HER YENİ ANİMASYON** `prefers-reduced-motion: reduce`'a uymalı —
  `globals.css`'in en altındaki media query bloğuna yeni class'ları ekle,
  asla atlama.

## Dönüşüm & İçerik
- Hero alanı doğrudan kullanıcı problemine ve değer teklifine odaklansın;
  jenerik "harika özellikler" yerine somut sayı/fayda kullan (bkz. Hero
  istatistikleri: "12 dilde", "6 oyun modu").
- Yeni metin eklerken 12 dilin tamamında (`landing/src/lib/i18n.tsx` →
  `dictionaries`) aynı anahtar setinin eksiksiz kalmasına dikkat et — bir
  dil unutulursa o anahtar sessizce `en` karşılığına düşer. Başlığı
  parçalara bölüp (kelime kelime) animasyonlu göstermek İSTEME — 12 dilin
  farklı uzunluk/yazım kurallarında kırılır; tüm başlığı TEK blok olarak
  (`.mask-reveal`) hareketlendir.

## SEO
- `landing/src/app/layout.tsx` içindeki JSON-LD bloklarını
  (SoftwareApplication, Organization, WebSite, FAQPage) güncel tut.
  FAQPage metinleri `dictionaries.tr` içindeki `faqQ*/faqA*` ile birebir
  aynı olmalı.
- Open Graph + Twitter card görselleri (`/og-image.png`) ve `SITE_URL`
  (`landing/src/lib/config.ts`) tek kaynak.

## Kod Kalitesi & Erişilebilirlik
- Semantik HTML5 (`header`, `nav`, `main`, `section`, `article`, `footer`)
  korunuyor.
- İkon-only linkler/butonlar için görünür metin yoksa mutlaka `aria-label`
  ver.
- Açılır menü/akordeon gibi bileşenlerde `aria-expanded`, `aria-haspopup`,
  gerektiğinde `role="listbox"`/`role="option"` kullan; `Escape` ile
  kapanabilir olsun.
- `:focus-visible` stilini hiçbir yeni interaktif elemanda `outline: none`
  ile ezme.
- `node_modules` bu ortamda (device_bash) güvenilir şekilde kurulamıyor —
  büyük bir animasyon kütüphanesi (GSAP, Framer Motion vb.) eklemeden önce
  kullanıcıya sor / kullanıcının kendi `npm install` çalıştırması gerektiğini
  söyle; mevcut native IntersectionObserver+CSS sistemiyle çözülüp
  çözülemeyeceğine önce bak.
