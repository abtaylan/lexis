# Lexis — Sosyal Medya Hesap Hazırlık Paketi

Bu doküman, WhatsApp, Instagram, X ve Facebook hesaplarını açarken kullanman için hazırlanmıştır. Slack ve Telegram zaten kurulu olduğu için bu ikisi kapsanmadı.

## Profil resmi

Ekteki `lexis_profile_icon.png` (1024x1024), `lexis_profile_icon_512.png` (512x512) ve `lexis_profile_icon_320.png` (320x320) dosyalarını platforma göre kullan:

- Instagram / X: 1024 veya 512 boyutunu yükle, ikisi de otomatik kırpıp yeniden boyutlandırıyor.
- Facebook Sayfa profil resmi: 512 boyutu öneriliyor.
- WhatsApp Business profil resmi: 512 boyutu öneriliyor (WhatsApp kendi içinde daireye kırpıyor, ikon tasarımı bu kırpımı hesaba katacak şekilde ortalanmış).

Görsel, backend'deki "günün kelimesi" kartlarıyla aynı marka renklerini kullanıyor (mor #534AB7 → mavi #378ADD gradyan), böylece tüm platformlarda ve Telegram/Slack içeriklerinde tutarlı bir görsel kimlik oluşuyor.

## Bio / açıklama metinleri

Karakter sınırları platformların güncel (2026) limitlerine göre kontrol edildi.

### Instagram (bio limiti: 150 karakter)

**TR** (132 karakter):
```
📖 Kelimeyi bir kere değil, tam zamanında tekrar et. Aralıklı tekrar + quiz ile İngilizce (ve 7 dil daha) öğren. Az çalış, çok öğren.
```

**EN** (127 karakter):
```
📖 Learn words at the perfect moment, not just once. Spaced repetition + quizzes. Study less, learn more. 8 languages supported.
```

Not: Instagram bio'sunda tıklanabilir tek bir link alanı var ("link in bio"). Kurumsal web sayfası hazır olana kadar buraya Telegram kanalı (`https://t.me/lexis_words`) linklenebilir; web sayfası yayına girince oraya güncellenmeli.

### X / Twitter (bio limiti: 160 karakter)

**TR** (152 karakter):
```
📖 Aralıklı tekrar algoritmasıyla kelime öğren. Doğru kelimeyi, doğru anda tekrar et. Quiz'lerle pekiştir. Az çalış, çok öğren. 8 dilde. 🇹🇷🇬🇧🇸🇦🇷🇺🇩🇪🇫🇷🇪🇸🇮🇹
```

**EN** (144 karakter):
```
📖 Learn vocabulary with spaced repetition. Review the right word at the right time, reinforce with quizzes. Study less, learn more. 8 languages.
```

### Facebook Sayfa — kısa açıklama / "Hakkında" (limit: 255 karakter)

**TR** (245 karakter):
```
Lexis, aralıklı tekrar (spaced repetition) algoritmasıyla kelime öğrenmeyi kolaylaştıran bir uygulama. Kişisel çalışma programı oluştur, quiz'lerle pekiştir, ilerlemeni takip et. İngilizce dahil 8 dilde arayüz desteği sunar. Az çalış, çok öğren.
```

**EN** (206 karakter):
```
Lexis makes vocabulary learning effortless with spaced repetition. Build your own study schedule, reinforce with quizzes, and track your progress. Interface available in 8 languages. Study less, learn more.
```

Facebook Sayfa oluştururken kategori olarak **"Eğitim"** veya **"Mobil Uygulama"** seçilebilir. Uzun "Hikayemiz" (Our Story) alanına da bu açıklamanın genişletilmiş bir versiyonu (misyon + hedef kitle) eklenebilir — kurumsal web sayfası yayına girdiğinde oradaki "Hakkımızda" metniyle birebir örtüşmesi önerilir.

### WhatsApp Business — "Hakkında" (limit: 139 karakter)

**TR** (113 karakter):
```
📖 Lexis — Aralıklı tekrarla kelime öğren. Günün kelimesi ve quiz'ler burada da paylaşılıyor. Az çalış, çok öğren.
```

**EN** (117 karakter):
```
📖 Lexis — Learn vocabulary with spaced repetition. Word of the day & quizzes shared here too. Study less, learn more.
```

WhatsApp Business profilinde ayrıca **İşletme kategorisi**: "Eğitim" (Education), **Adres/Konum**: boş bırakılabilir (dijital ürün), **Çalışma saatleri**: "Her zaman açık" seçilebilir çünkü otomatik bir uygulama.

## Ortak marka dili notları

Tüm metinler mevcut ürün içindeki sloganla (`web/src/lib/i18n.tsx` → `brandSubtitle`) tutarlı tutuldu: *"Aralıklı tekrar algoritmasıyla yalnızca doğru anda tekrar et. Daha az çalış, daha çok öğren."* Bu, tüm platformlarda ve ileride kurulacak kurumsal web sayfasında tekrar eden bir çekirdek mesaj olarak kullanılabilir.

Öneri: Her hesabı açtıktan sonra bana platform adını ve (varsa) kullanıcı adını/URL'sini paylaş, ben de dashboard/schedule sayfalarındaki "bizi takip edin" alanına veya ileride kurulacak kurumsal web sayfasının footer'ına bu linkleri ekleyebilirim.
