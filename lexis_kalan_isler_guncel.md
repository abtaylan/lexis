# Lexis — Güncel Kalan İşler Listesi

*(21 Ağustos 2026 güncellemesi — Madde 1d admin panel tamamen kapandı; genel kelime havuzu, i18n/Premium çevirisi, döviz bazlı fiyatlandırma altyapısı ve birkaç teknik borç maddesi bu oturumlarda çözüldü. Bu dosya `lexis_sosyal_medya_hesap_hazirlik.md` ile aynı yerde, repo kökünde tutuluyor.)*

*(21 Ağustos 2026, ikinci güncelleme — `npm audit fix` uygulandı (0 açık); XPBar bileşeni oluşturulup Sidebar/Dashboard'a bağlandı; döviz bazlı Premium'un iyzico tarafının **henüz yapılmadığı** doğrulandı (`.env`'de sadece placeholder var — bkz. aşağıda); tsc taraması sırasında ilgisiz ama gerçek birkaç derleme hatası bulundu (bkz. yeni "Yeni bulunan" bölümü).)*

*(23 Ağustos 2026 güncellemesi — Reklam sistemi (web AdSense + mobil AdMob) ve ödül sistemi (rozetler + liderlik ödülleri) koda geçti, git'e commit'lendi (`d83e835`); rozet gösterim ekranı (web + mobil) ve KVKK/GDPR reklam consent banner'ı (web) tamamlandı; `general_word_pool` ru/ar/ja backfill ve kurumsal logo maddeleri kullanıcı tarafından çözüldü sayılıp listeden çıkarıldı; Vercel Cron + GitHub Actions üzerinden `post_daily_content.py`/`send_schedule_reminders.py` için dış tetikleyici köprüsü kuruldu. Detaylar için aşağıdaki "23 Ağustos 2026 (devam 9)" bölümüne bakın.)*

---

## ✅ Son oturumlarda tamamlananlar

- [x] **Madde 1d — Admin panelinin kapsamlı yönetim platformuna dönüştürülmesi.** Sistem sağlığı, detaylı istatistikler, iyzico ödeme takibi, kullanıcı yönetimi genişletmesi, içerik yönetimi (kelime havuzu), sosyal medya otomasyon durumu, bildirim/e-posta logları, oyun analitiği, admin işlem geçmişi (audit log), mobil uygulama görünürlük iskeleti ve rol bazlı yetkilendirme (RBAC) — hepsi bitti.
- [x] `general_word_pool` tablosu de/fr/es/it için tam (303/303), ar için 287/303, ja için 254/303 dolduruldu.
- [x] `i18n.tsx`'te Japonca (ja) arayüz dili desteği geri eklendi (9 dilin hepsi tam, 256 anahtar).
- [x] Premium/checkout sayfası tamamen `useLocale()`'e bağlandı — artık 9 dilde de gerçek çeviri kullanıyor (önceden hardcoded TR/EN idi).
- [x] `merge-preview.txt` repodan temizlendi.
- [x] `email-validator` bağımlılığı `requirements.txt`'e eklendi (`.test` TLD login hatasının kökeniydi).
- [x] `dictionary_service.py`'de gerçek bir prod bug'ı düzeltildi: Cambridge/free_dictionary'den boş `meaning_native` dönen anlamlar artık sonraki sağlayıcıya düşüyor (önceden yanlışlıkla "başarılı" sayılıyordu — `ru` gibi Cambridge'de karşılığı olmayan diller için kritikti).
- [x] **Döviz bazlı (TRY/USD/EUR) Premium fiyatlandırma altyapısı** kuruldu: backend (`config.py`, `schemas/subscription.py`, `api/routes/subscription.py`), `subscriptions.currency` kolonu (migration canlıya uygulandı), frontend (`types/index.ts`, `api.ts`, Premium sayfasında para birimi seçici). `.env`'de sadece TRY dolu olduğu için şu an davranış değişmedi — USD/EUR aşağıda "bekleyen" listesinde.
- [x] `xp_service.py` — `XP_AMOUNTS["quiz"]` teknik borç maddesi çözüldü: kod taraması "quiz" kaynağının hiçbir yerden çağrılmadığını gösterdi (oyun modları ayrılmadan önceki kalıntıydı), kaldırıldı.
- [x] `seed_schedule.py` / `scheduleTemplates.ts` — `activity_key` alanı eksikliği düzeltildi: artık program maddeleri `learning_resources` tablosuyla dile göre dinamik eşleşiyor (önceden kullanıcı öğrenilen dilini değiştirse bile program linkleri eski dilde sabit kalıyordu).
- [x] **`npm audit fix`** çalıştırıldı — 0 açık kaldı (axios 1.19.0, form-data 4.0.6, brace-expansion 5.0.9/1.1.18, js-yaml 4.3.1, @babel/core 7.29.7). `package.json` değişmedi, hepsi mevcut semver aralığında düzeldi (force gerekmedi). Güncellenmiş `package-lock.json` `web/` içine yazıldı.
- [x] **XPBar ön yüz bileşeni** — `web/src/components/layout/XPBar.tsx` oluşturuldu. Backend'de zaten hazır bekleyen `GET /stats/xp` (`xp_service.get_xp_summary`) ve frontend'de zaten tanımlı `statsApi.getXp()` / `XpSummary` tipini kullanıyor. Sidebar'a (avatar bloğunun üstünde kompakt çubuk) ve Dashboard'a (tam kart: seviye rozeti + ilerleme çubuğu + sonraki seviyeye kalan XP) bağlandı, 9 dilin hepsi için yerel çeviri eklendi (Sidebar'daki `GAME_LABEL` deseniyle aynı yaklaşım, merkezi `i18n.tsx`'e dokunulmadı). `npx tsc --noEmit` ile doğrulandı. **Kalan:** Profile sayfasına da eklenebilir; seviye atlama anında toast/animasyon yok.
- [x] **Reklam sistemi — web (AdSense) + mobil (AdMob).** Web: zaten yazılmış `AdBanner.tsx` `(app)/layout.tsx`'e bağlandı. Mobil: `react-native-google-mobile-ads` sıfırdan entegre edildi (config plugin, SDK init, banner bileşeni) — bir Gradle/Kotlin metadata uyumsuzluğu yüzünden paket `16.0.2`'ye sabitlendi (bkz. aşağıdaki "eas build" notu, **henüz gerçek build ile doğrulanmadı**). Gerçek AdSense/AdMob hesabı hâlâ yok — `NEXT_PUBLIC_ADSENSE_CLIENT_ID` boş, mobil tarafta Google'ın herkese açık TEST ID'leri kullanılıyor.
- [x] **Ödül sistemi (backend).** Rozet kataloğu + `user_badges` (tek seferlik/dönem bazlı iki modlu, partial unique index'lerle idempotent), streak dönüm noktası ödülleri (7/30/100/365 gün), haftalık/aylık liderlik ödülleri (`distribute_leaderboard_rewards.py`), `GET /stats/badges`. `expire_premium` ve `distribute_leaderboard_rewards` için VPS yerine **Claude scheduled task + Supabase MCP SQL** çözümü kuruldu ve haftalık ödül dağıtımı canlıda gerçekten test edildi (1 kullanıcı ödüllendirildi, 2026-W34).
- [x] **Rozet gösterim ekranı — web + mobil.** Web: `components/layout/BadgeShowcase.tsx`, Profil sayfasına bağlandı. Mobil: `components/BadgeShowcase.tsx`, profile ekranına bağlandı. İkisi de `GET /stats/badges`'i kullanıyor, 9 dilde yerel çeviri var (XPBar deseniyle aynı).
- [x] **KVKK/GDPR reklam consent banner'ı — web.** `lib/adConsent.tsx` (localStorage tabanlı onay state'i) + `components/ads/AdConsentBanner.tsx` (Kabul/Reddet banner'ı, `providers.tsx`'e bağlandı) + `AdBanner.tsx` artık onay verilmeden AdSense script'ini **hiç yüklemiyor**. **Mobilde henüz yok** — AdMob için ayrı bir Google UMP SDK entegrasyonu gerekiyor, kapsam dışı bırakıldı.
- [x] **Vercel Cron + GitHub Actions dış tetikleyici köprüsü.** `send_schedule_reminders.py` (SMTP) ve `post_daily_content.py` (Telegram/Slack) gerçek dış ağ erişimi gerektirdiği için Claude scheduled task'larından tetiklenemiyor (bkz. "Production'a geçiş öncesi" bölümü). Bunun yerine: backend'e secret-korumalı `/internal/cron/*` endpoint'leri eklendi (`app/api/routes/cron.py`, yeni `CRON_SECRET` ayarı), `web/vercel.json` + `web/src/app/api/cron/post-daily-content/route.ts` ile Vercel Cron günde bir kez `post_daily_content`'i tetikliyor, `.github/workflows/schedule-reminders.yml` ile GitHub Actions 5 dakikada bir `send_schedule_reminders`'ı tetikliyor (Vercel Hobby planı günde 1 cron'la sınırlı olduğu için 5 dakikalık iş Vercel yerine ücretsiz GitHub Actions'a verildi). **Kullanıcının yapması gerekenler** (kod hazır ama devreye alınmadı): (1) güçlü bir `CRON_SECRET` üret, backend `.env`'e ve Railway env vars'a ekle; (2) aynı değeri Vercel projesinde `CRON_SECRET` env değişkeni olarak ekle; (3) GitHub repo Settings > Secrets > Actions'a `LEXIS_BACKEND_URL` (Railway URL) ve `LEXIS_CRON_SECRET` (aynı değer) ekle; (4) ~~`.github/workflows/schedule-reminders.yml` elle oluşturulması~~ — kullanıcı 23 Ağustos'ta bunu VSCode'da elle oluşturdu, tamam; (5) hepsi hazır olunca `git add/commit/push` (henüz yapılmadı — sıradaki adım).

---

## 🔜 Devam eden / hızlı kapanabilecek maddeler

- [ ] **Döviz bazlı Premium — iyzico tarafı (henüz YAPILMADI).** Kontrol edildi: `backend/.env`'de `IYZICO_MONTHLY_PLAN_REF_USD`/`_EUR` ve yıllık karşılıkları hâlâ `<iyzico_usd_aylik_plan_ref>` gibi düz placeholder metin — gerçek bir plan ref kodu girilmemiş. Üstelik orijinal TRY planları (`IYZICO_MONTHLY_PLAN_REF` / `IYZICO_YEARLY_PLAN_REF`) da boş. iyzico merchant panelinde (Abonelik > Ürün ve Ödeme Planları) TRY + USD + EUR için toplam 6 plan oluşturulup dönen ref kodlarının `.env`'e girilmesi gerekiyor.
- [x] ~~`general_word_pool` ru/ar/ja backfill~~ — kullanıcı onayıyla tamamlandı sayıldı (23 Ağustos).
- [x] ~~Kurumsal logo entegrasyonu~~ — kullanıcı kararı: mevcut logo kullanılıyor, ek seçim/entegrasyon işi yok (23 Ağustos).

---

## Madde 5 — Kurumsal tanıtım web sayfası

- [ ] Tanıtım/landing sayfası — tüm sosyal medya hesaplarına link veren herkese açık sayfa
- [ ] Kurumsal görünüm + `/login` yönlendirmesi
- [ ] Çok dilli tanıtım sayfası
- [ ] *(muhtemelen logo seçimiyle birlikte ele alınacak)*

## ~~Yeni bulunan — `tsc --noEmit` taraması~~ (ÇÖZÜLDÜ, 23 Ağustos)

- [x] ~~Frontend tip hataları~~ — 21 Ağustos'taki tsc taraması güncel değilmiş: kullanıcı `cd web && npx tsc --noEmit --pretty` komutunu gerçek makinesinde çalıştırdı, **hiçbir hata/çıktı dönmedi** (temiz derleme). Yani `Sidebar.tsx`/`game/page.tsx`/`forgot-password`/`reset-password`/`verify-otp`/`words/page.tsx`/`register/page.tsx`/`schedule/page.tsx` maddelerinin hepsi ya zaten çözülmüş ya da hiç gerçek olmamış (21 Ağustos taramasının hatalı/yarım bir anda alındığı, `schedule/page.tsx`'teki link/DAYS/buildTemplates maddesinde 23 Ağustos'ta zaten gözle doğrulanmıştı). `next build`'in tip hatalarından etkilenmesi ihtimali artık yok — madde tamamen kapandı.

## Production'a geçiş öncesi bekleyen maddeler

- [ ] iyzico callback entegrasyonunun canlı ortamda doğrulanması (gerçek `IYZICO_API_KEY`/`IYZICO_SECRET_KEY` + plan referansları girilip sandbox'ta test edilmeli). **23 Ağustos:** `setup_iyzico_plans.py` çalıştırıldığında 401 "Authentication failed" alındı — ya `.env`'deki `IYZICO_SECRET_KEY` düzeltmesi henüz gerçek dosyaya kopyalanmadı, ya da iyzico hesabında Abonelik (Subscription API v2) modülü henüz aktif değil. Kullanıcı ikisini de kontrol edecek/iyzico destekle görüşecek.
- [ ] Production OTP modu: `OTP_MODE=real` + Gmail App Password ile gerçek e-posta gönderimi
- [x] ~~`backend/expire_premium.py` cron kurulumu~~ — Claude scheduled task + Supabase MCP SQL ile çözüldü (günlük, `trig_0184KhHFfYopZSKs8euxn24R`).
- [x] ~~`backend/send_schedule_reminders.py` cron kurulumu~~ — Vercel bunu destekleyemiyor (Hobby planı = günde 1, bu iş 5 dakikada bir gerekiyor), bunun yerine GitHub Actions köprüsü kuruldu (bkz. yukarıdaki "Vercel Cron + GitHub Actions" maddesi) — devreye alınması kullanıcının 3 secret eklemesine + workflow dosyasını elle oluşturmasına bağlı.

## Büyük, henüz başlanmamış işler

- [x] ~~XPBar ön yüz bileşeni~~ — bu oturumda yapıldı, yukarıya taşındı.
- [ ] React Native mobil uygulama
- [ ] Ek oyun modları — `game_mode` enum'ında `typing`/`matching`/`listening`/`sprint` tanımlı ama sadece `wordle` ve `multiple_choice` gerçekten implemente edilmiş
- [ ] `backend/tests/` — otomatik test altyapısı

## En son yapılacaklar — tüm test geliştirmeleri sonlanıp mobil ve web erişim hizmetleri aktif olduğunda

### Madde 3b: Sosyal medya içerik paylaşımı

- [x] Telegram bot + kanal, Slack workspace + webhook kurulumu
- [x] Backend otomasyonu (`post_daily_content.py`, dry-run modu)
- [ ] Dry-run testinin oluşturduğu test `social_posts` kaydının temizlenmesi (istenirse)
- [ ] Gerçek canlı gönderim testi (`SOCIAL_POST_MODE=real`) — açık onay bekleniyor
- [x] ~~VPS'e cron kurulumu~~ — VPS yerine Vercel Cron + backend `/internal/cron/post-daily-content` köprüsü kuruldu (bkz. yukarı), devreye alınması `CRON_SECRET` ayarlanmasına bağlı.

### Diğer platform hesapları (kullanıcı kendi yapacak)

- [x] Hesap açıklaması (bio) metinleri + profil resmi hazırlandı
- [ ] WhatsApp Business, Instagram, X, Facebook hesapları
- [ ] Hesaplar açıldıkça kullanıcı adları/URL'leri paylaşılıp footer'a eklenmesi

---

**Durum özeti (23 Ağustos):** Admin panel (Madde 1d), i18n/Premium çeviri işleri, npm audit, reklam sistemi (web+mobil kod), ödül sistemi (backend+rozet UI web/mobil), KVKK/GDPR reklam consent banner'ı (web) ve Vercel Cron/GitHub Actions cron köprüsü kodu tamamlandı, git'e commit'lendi. **Kullanıcının elinde/bekleyen:** AdSense ve AdMob hesabı henüz açılmadı (adım adım rehberlik sürüyor); iyzico `setup_iyzico_plans.py` 401 hatası veriyor (secret key veya Abonelik modülü aktivasyonu kontrol edilmeli); mobil `eas build`'in AdMob 16.0.2 pin fix'i ile başarılı olduğu henüz doğrulanmadı; Vercel Cron/GitHub Actions köprüsünün devreye alınması `CRON_SECRET` + GitHub secret'larının girilmesine ve workflow dosyasının elle oluşturulmasına bağlı; tsc hatalarının güncel/gerçek listesi kullanıcının `cd web && npx tsc --noEmit --pretty` çıktısını paylaşmasını bekliyor (eski liste kısmen yanlış çıktı). **Sıradaki en mantıklı adımlar:** AdSense/AdMob hesap açılışını bitirmek, iyzico 401'i çözmek, mobil build'i yeniden denemek, cron köprüsü secret'larını girip `git push` yapmak.
