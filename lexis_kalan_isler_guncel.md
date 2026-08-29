# Lexis — Güncel Kalan İşler Listesi (23 Ağustos 2026 — kapsamlı, yeniden düzenlenmiş)

*Bu dosya bu tarihte baştan düzenlendi: önceki sürümdeki dağınık/eksik "kalan işler" listesi yerine, projenin GERÇEK güncel durumunu (tamamlanan her şey dahil) tek yerde toplayan bir versiyon. Eski tarihli ara güncellemeler (21 Ağustos vb.) kaldırıldı, hepsi aşağıya konsolide edildi.*

---

## ✅ Tamamlanan — kod ve altyapı tarafı

**Admin panel & platform**
- [x] Madde 1d — Admin paneli kapsamlı yönetim platformuna dönüştürüldü: sistem sağlığı, detaylı istatistikler, iyzico ödeme takibi, kullanıcı yönetimi, içerik yönetimi (kelime havuzu), sosyal medya otomasyon durumu, bildirim/e-posta logları, oyun analitiği, audit log, mobil görünürlük iskeleti, RBAC.
- [x] Admin panelinde Recharts grafiklerinin koyu tema renk uyumu.
- [x] Vercel Web Analytics / Speed Insights etkinleştirildi.

**Çok dillilik / içerik**
- [x] `i18n.tsx` — 9 dilin hepsi tam (Japonca dahil, 256 anahtar).
- [x] Premium/checkout sayfası tamamen `useLocale()`'e bağlı, 9 dilde gerçek çeviri.
- [x] `general_word_pool` — de/fr/es/it (303/303), ar (287/303), ja (254/303); ru/ar/ja'daki backfill kullanıcı kararıyla tamamlandı sayıldı.
- [x] `dictionary_service.py` prod bug fix (boş `meaning_native` artık bir sonraki sağlayıcıya düşüyor).

**Ödeme altyapısı**
- [x] iyzico canlı ortam credentials wiring (kod tarafı: API key/secret okuma, callback route vb. hazır) — **ancak gerçek anahtarlarla test şu an 401 veriyor, bkz. aşağıda "kritik" bölüm.**
- [x] Mobil ödeme mimarisi — Apple/Google IAP: backend `apple_appstore.py` + `google_play.py` (doğrulama servisleri, kimlik bilgileri boşken "yapılandırılmadı" hatası dönüyor, asla sessizce premium vermiyor) + mobilde `expo-iap` entegre. **Gerçek Apple/Google kimlik bilgileri henüz girilmedi** (bkz. aşağıda).
- [x] Döviz bazlı (TRY/USD/EUR) Premium fiyatlandırma **altyapısı** (backend config/schema/route, `subscriptions.currency` migration, frontend para birimi seçici). Kod hazır ama iyzico'da USD/EUR planları henüz oluşturulmadı — TRY dışında hâlâ görünmüyor.

**Oyunlaştırma**
- [x] XPBar bileşeni (web) — Sidebar + Dashboard.
- [x] Ödül sistemi (backend) — rozet kataloğu + `user_badges` (tek seferlik/dönemsel idempotent), streak dönüm noktası ödülleri (7/30/100/365 gün), haftalık/aylık liderlik ödülleri (`distribute_leaderboard_rewards.py`), `GET /stats/badges`. Haftalık ödül dağıtımı canlıda gerçekten test edildi.
- [x] Rozet gösterim ekranı — web (Profil sayfası) + mobil (profile ekranı), 9 dilde çeviri.
- [x] `xp_service.py` / `seed_schedule.py` teknik borç maddeleri (quiz XP kalıntısı, `activity_key` dile göre dinamik eşleme).

**Reklam sistemi**
- [x] Web AdSense: `AdBanner.tsx` `(app)/layout.tsx`'e bağlandı.
- [x] Mobil AdMob: `react-native-google-mobile-ads` sıfırdan entegre (config plugin, SDK init, banner) — Gradle/Kotlin metadata uyumsuzluğu yüzünden paket `16.0.2`'ye sabitlendi. **Gerçek build ile doğrulanmadı, kullanıcı yeniden denemeli.**
- [x] KVKK/GDPR reklam consent banner'ı (web) — kullanıcı onay vermeden AdSense script'i hiç yüklenmiyor. (Mobilde AdMob UMP entegrasyonu ayrı iş, kapsam dışı.)
- [x] AdSense hesap onboarding'i tamamlandı — site sahipliği doğrulandı (meta etiket, `ca-pub-7117270113356521`), inceleme istendi, Google'ın sertifikalı CMP'si (3 seçenekli) etkinleştirildi. **Şu an Google'ın incelemesinde, sonuç bekleniyor.**

**Cron / otomasyon**
- [x] `expire_premium.py` — Claude scheduled task + Supabase MCP SQL ile günlük otomatikleştirildi (VPS gerekmedi).
- [x] `distribute_leaderboard_rewards.py` — aynı yöntemle haftalık otomatikleştirildi.
- [x] Vercel Cron + GitHub Actions köprüsü (kod) — `send_schedule_reminders.py` (5 dk'da bir, GitHub Actions) ve `post_daily_content.py` (günde 1, Vercel Cron) için backend'e secret-korumalı `/internal/cron/*` endpoint'leri + `vercel.json` + proxy route + workflow dosyası. **Devreye alınması `CRON_SECRET`'ın 3 yere girilmesine bağlı, bkz. aşağıda.**

**Teknik borç / kalite**
- [x] `npm audit fix` — 0 açık.
- [x] `merge-preview.txt` temizlendi, `email-validator` eklendi.
- [x] `tsc --noEmit` — kullanıcı gerçek makinesinde çalıştırdı, **hiç hata yok**, temiz derleme (21 Ağustos'taki eski hata listesi geçersizmiş).
- [x] Kurumsal logo — kullanıcı kararı: mevcut logo kullanılacak, ek seçim/entegrasyon işi yok.

---

## 🔴 Canlıya geçiş için kritik — hesap/satın alma/onay bekleyen maddeler

Bunların hemen hepsi **senin** yapman gereken (hesap açma, ödeme, kimlik bilgisi girme) işlemler — ben adımları anlatabilirim, gerçek işlemi sen yapman gerekiyor.

- [ ] **Domain satın alma.** Henüz alınmadı — site şu an `lexis-web.vercel.app` üzerinde. İstersen registrar/isim önerisinde yardımcı olurum, satın alma işlemini (ödeme gerektirdiği için) senin yapman gerekiyor.
- [ ] **Apple Developer Program üyeliği.** Süreç başlatılmış, config.py'deki nota göre **26 Ağustos'ta aktive edilecek** — henüz aktif değil. Aktif olunca `APPLE_ISSUER_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY_P8` girilmesi gerekiyor.
- [ ] **Google Play Console hesabı/uygulama kaydı.** `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` hâlâ boş — mobil IAP'nin Android tarafı için ayrı bir kurulum gerekiyor, henüz başlanmadı.
- [ ] **AdMob hesabı.** Hiç açılmadı — mobilde hâlâ Google'ın herkese açık test reklam ID'leri kullanılıyor. AdSense süreci bittiğinde aynı adım adım yöntemle devam edebiliriz.
- [ ] **iyzico 401 hatası.** `setup_iyzico_plans.py` "Authentication failed" veriyor — `.env`'deki düzeltilmiş `IYZICO_SECRET_KEY`'in gerçek dosyaya geçtiğini kontrol et, olmuyorsa iyzico'da Abonelik (Subscription API v2) modülünün aktif olup olmadığını destekten sor.
- [ ] **Vercel Cron / GitHub Actions secret'larını devreye alma.** `CRON_SECRET` üretip backend `.env` + Railway env vars + Vercel env vars + GitHub Actions secrets'a (4 yer) girilmesi ve `git push` yapılması gerekiyor.
- [ ] **Mobil `eas build`'i yeniden dene.** AdMob 16.0.2 sabitlemesinin Gradle/Kotlin hatasını gerçekten çözdüğü henüz doğrulanmadı.

---

## 🌐 Domain alınınca canlıya geçiş — VPS gerekmiyor, checklist

**Sorunun cevabı: Evet, doğru — VPS'e hiç gerek yok.** Şu anki mimari zaten tamamen VPS'siz: **Vercel** (web frontend, otomatik SSL + CDN), **Railway** (backend API), **Supabase** (veritabanı) — üçü de kendi altyapılarını yönetiyor. Domain satın alınca yapılacaklar sadece DNS + birkaç env değişkeni:

- [ ] Vercel: Project Settings → Domains'ten yeni domaini ekle; registrar'da Vercel'in verdiği A/CNAME kayıtlarını gir. SSL otomatik.
- [ ] (İsteğe bağlı) Railway: backend için `api.domaininiz.com` gibi bir subdomain'i Railway'e custom domain olarak bağlayabilirsin (CNAME) — istemezsen mevcut `*.up.railway.app` adresiyle de devam edilebilir, zorunlu değil.
- [ ] Backend `.env`: `FRONTEND_URL`, `BACKEND_PUBLIC_URL`, `ALLOWED_ORIGINS` gerçek domaine güncellenmeli.
- [ ] iyzico panelinde ödeme callback URL'i gerçek domaine göre güncellenmeli.
- [ ] AdSense'te site URL'i güncellenmesi/yeni domainin site olarak eklenip yeniden doğrulanması gerekebilir.
- [ ] Vercel env vars (`NEXT_PUBLIC_API_URL` vb.) gerçek backend adresine göre kontrol edilmeli.
- [ ] Mobil `app.json`/API base URL'i gerekiyorsa güncellenmeli.

---

## 🟡 Orta vadeli

- [ ] Döviz bazlı Premium — iyzico panelinde TRY+USD+EUR için toplam 6 plan (aylık/yıllık) oluşturup ref kodlarının `.env`'e girilmesi.
- [ ] Google'ın CMP'si ile kendi KVKK banner'ımızın üst üste binmesi — işlevsel sorun değil, ileride sadeleştirilebilir (coğrafi tespitle ya da tek akışa indirerek).
- [ ] Kurumsal tanıtım/landing sayfası (Madde 5) — herkese açık, sosyal medya linkli, çok dilli tanıtım sayfası. Hiç başlanmadı.
- [ ] Production OTP modu: `OTP_MODE=real` + Gmail App Password ile gerçek e-posta gönderimi (şu an `fixed` modda, kod her zaman 123456).

---

## 🔵 Büyük / uzun vadeli

- [ ] Ek oyun modları — `game_mode` enum'ında `typing`/`matching`/`listening`/`sprint` tanımlı ama sadece `wordle` ve `multiple_choice` gerçekten implemente edilmiş.
- [ ] `backend/tests/` — otomatik test altyapısı hiç yok.
- [ ] React Native mobil uygulama — çekirdek ekranlar + IAP + AdMob + rozetler tamam; kalan iş büyük ölçüde yukarıdaki hesap/build maddelerine (Apple/Google/AdMob) bağlı, ayrıca kapsamlı elle test edilmedi.

---

## Sosyal medya (Madde 3b)

- [x] Telegram bot + kanal, Slack workspace + webhook kurulumu.
- [x] Backend otomasyonu (`post_daily_content.py`, dry-run modu) + Vercel Cron köprüsü (yukarıda).
- [ ] Dry-run testinin oluşturduğu test `social_posts` kaydının temizlenmesi (istersen).
- [ ] Gerçek canlı gönderim testi (`SOCIAL_POST_MODE=real`) — açık onayın bekleniyor.
- [x] Hesap açıklaması (bio) metinleri + profil resmi hazırlandı.
- [ ] WhatsApp Business, Instagram, X, Facebook hesapları — kendi açman gereken hesaplar.
- [ ] Hesaplar açıldıkça kullanıcı adları/URL'leri paylaşılıp footer'a eklenmesi.

---

**Durum özeti (23 Ağustos 2026):** Kod tarafında büyük iş bitti — admin panel, i18n, ödeme mimarisi (IAP dahil), reklam sistemi, ödül sistemi, rozet UI, KVKK banner, cron köprüsü, tsc temizliği hepsi tamamlandı ve git'e commit'lendi. Kalan işlerin büyük çoğunluğu artık **kod değil, hesap açma/onay/satın alma** işleri: domain, Apple Developer, Google Play Console, AdMob, iyzico 401 çözümü, ve zaten hazır olan cron/secret'ların devreye alınması. Mimari VPS'siz (Vercel + Railway + Supabase) — domain gelince sadece DNS + birkaç env değişkeni ile canlıya geçilecek.
