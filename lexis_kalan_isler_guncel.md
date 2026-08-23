# Lexis — Güncel Kalan İşler Listesi
_21-23 Ağustos 2026 notlarının birleştirilmiş hali (bu dosya artık tek kaynak — repo kökündeki eski `lexis_kalan_isler_guncel.md`'nin (21 Ağustos, admin panel/i18n/npm audit odaklı) yerine geçti, o dosyadaki tüm maddeler buraya taşındı)._

---

## 0. Öncelikli / Bloke Eden İşler

- ~~**Mobil giriş hatası:**~~ ✅ **Tamamlandı.**
- ~~**`eas build --platform android --profile preview`:**~~ ✅ **Tamamlandı, deploy başarılı.**
- ~~🐞 **Bug: "User" (Profil) sekmesine tıklayınca profil ekranı açılmıyor.**~~ ✅ **Kullanıcı kapattı (23 Ağustos):** "Profil sekmesi mobilde açılıyor, böyle bir problem yok" — tekrar üretilemiyor, gündemden çıkarıldı.
- ~~🐞 **Program (Schedule) ekranında "hazır şablon programlar" yok.**~~ ✅ **Tamamlandı.**
- ~~**Karanlık/Aydınlık Tema (Web + Mobil):**~~ ✅ **Tamamen tamamlandı (23 Ağustos'ta admin paneli de dahil oldu).** Web'in 35 genel dosyasına + **tüm admin paneline (12 dosya, ~400 `dark:` class'ı + Recharts grafiklerinin JS-taraflı renk teması)** koyu tema desteği eklendi. Daha önce "sadece Recharts hardcoded renkleri kaldı" sanılıyordu — gerçekte admin panelinin tamamında hiç `dark:` class'ı yoktu, kapsam beklenenden büyük çıktı ama tamamen kapatıldı.

---

## 1. Mobil Uygulama — Kalan Fazlar

- ~~**Faz 2 — Eksik oyun modlarının mobile taşınması:**~~ ✅ **Tamamlandı.**
- ~~**Faz 3 — Web'de olup mobilde olmayan sayfaların taşınması:**~~ ✅ **TAMAMEN TAMAMLANDI.**
- **Mobil ödeme mimarisi — KARAR VERİLDİ (23 Ağustos):** "Apple/Google IAP'a geç, iyzico webde kalsın." Web'de iyzico (mevcut checkout akışı) aynen kalıyor; mobilde mağaza kuralları gereği native Apple/Google IAP kullanılıyor. **Uygulandı:**
  - `expo-iap` (OpenIAP-spec, RevenueCat gibi üçüncü parti hesap gerektirmeyen bağımsız kütüphane) mobile eklendi, `mobile/src/app/(app)/premium.tsx` tamamen bu akışa göre yeniden yazıldı (satın alma + geri yükleme + mağazadan yönet).
  - Backend: `app/services/apple_appstore.py` (App Store Server API v2, ES256-JWT) ve `app/services/google_play.py` (Google Play Developer API, service account) — ikisi de **fail-closed**: gerçek kimlik bilgileri (`.env`'de boş) girilmeden `NotConfiguredError`/HTTP 501 döner, **asla sessizce premium vermez**.
  - Yeni endpoint: `POST /subscription/verify-purchase` — Apple/Google'a sorup gerçekten doğrulanan satın almayı `subscriptions` tablosuna yazar, `profiles.is_premium`/`premium_until` günceller.
  - **Canlı DB migration uygulandı:** `subscriptions` tablosuna `store` (iyzico/ios/android), `iap_product_id`, `iap_transaction_id` (unique), `iap_purchase_token` kolonları eklendi (41 kullanıcı, mevcut 3 abonelik satırı `store='iyzico'`e otomatik dolduruldu).
  - **Bloke eden (kullanıcı aksiyonu / dış bağımlılık):** Gerçek çalışması için (a) Apple Developer Program aktivasyonu (26 Ağustos) sonrası App Store Connect'te `APPLE_ISSUER_ID`/`APPLE_KEY_ID`/`APPLE_PRIVATE_KEY_P8` alınıp `.env`'e girilmeli, (b) Google Play Console'da bir service account oluşturulup `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` girilmeli, (c) **`app.lexis.mobile.premium.monthly`/`.yearly`** ürün ID'leri BİREBİR bu isimlerle App Store Connect + Play Console'da oluşturulmalı (kod bu ID'leri sabit bekliyor).

---

## 2. Ödeme Entegrasyonu — iyzico

- ~~Abonelik API mi, Checkout Form mu~~ ✅ Abonelik API (Subscription API v2) ile kodlandı.
- ~~**Karar bekliyor:** Mobilde Apple/Google IAP mi, iyzico mi~~ ✅ **Karar verildi, bkz. Bölüm 1** — iyzico sadece web'de kalıyor.
- **Sandbox atlanıp direkt canlı ortama geçildi (23 Ağustos, kullanıcı kararı: "sandbox problemli direk canlı ortam mantığı ile ilerle").** Bu sırada gerçek bir prod bug'ı bulundu ve düzeltildi: `backend/.env`'deki `IYZICO_SECRET_KEY` son karakteri (`X`) eksikti — muhtemelen geçmişteki "sandbox problemli" deneyiminin asıl sebebi buydu (imza uyuşmazlığı → 401), sandbox'ın kendisiyle ilgili değildi.
- **Kullanıcı aksiyonu gerekiyor (ben uygulayamadım — `.env` dosyasına uzaktan yazma güvenlik nedeniyle engelli):**
  1. Gönderilen düzeltilmiş `.env` dosyasını kendi `backend/.env`'inin üzerine kopyala (ya da `IYZICO_SECRET_KEY` değerinin sonuna eksik `X` harfini elle ekle).
  2. Aynı düzeltmeyi Railway'in environment variables panelinde de yap (Railway'e buradan erişimim yok).
  3. Kendi makinende `cd backend && python setup_iyzico_plans.py` çalıştır (cloud ortamımın iyzico'nun API'sine ağ erişimi yok) — bu, "Lexis Premium" ürününü ve TRY/USD/EUR × aylık/yıllık toplam 6 fiyat planını canlı iyzico hesabında oluşturup dönen ref kodlarını `.env`'e otomatik yazacak (`IYZICO_MONTHLY_PLAN_REF` vb. şu an hâlâ boş).
- Webhook/callback endpoint'i — mevcut kod tabanında zaten var (subscription.py), canlı ortamda test edilmedi (kullanıcı kararı: "ödeme testleri yapmadan devam edelim" — gerçek para hareketi içeren bir test bilerek yapılmadı).
- `admin/payments` sayfası gerçek veriyle bağlı (Madde 1d kapsamında daha önce tamamlanmıştı).

---

## 3. Reklam Sistemi (Premium Olmayan Kullanıcılar İçin)

**Karar (23 Ağustos): "gerçek ağa ekle ve mobil işlemlerine başla."** Web tarafı tamamen, mobil tarafı da (gerçek hesap açılmayı beklemeden) koda döküldü:

- ✅ **Web:** `AdBanner.tsx` (Google AdSense) zaten kod olarak tamdı ama hiçbir sayfaya yerleştirilmemişti — artık `(app)/layout.tsx`'e eklendi, tüm oturum-içi sayfaların altında tek noktadan gösteriliyor (`!user.is_premium` koşulu component'in kendi içinde zaten vardı). `NEXT_PUBLIC_ADSENSE_CLIENT_ID` `.env.local`'de placeholder olarak duruyor (boşken component hiçbir şey render etmiyor, güvenli).
- ✅ **Mobil:** `react-native-google-mobile-ads` eklendi (gerçek paket API'si `npm pack` ile indirilip doğrulandı — expo-iap'te izlenen yöntemin aynısı). Yeni `mobile/src/components/ads/AdBanner.tsx` — uyarlanabilir (adaptive) alt banner, Dashboard ekranının altına yerleştirildi, `!user.is_premium` koşuluyla. SDK, kök `_layout.tsx`'te uygulama açılışında initialize ediliyor. `app.json`'a AdMob config plugin'i eklendi.
- **Şu an TEST reklamları gösteriyor (Google'ın herkese açık, güvenli örnek App ID/birim ID'leri) — gerçek hesap açılana kadar bilinçli olarak böyle.** Gerçek AdSense/AdMob hesabı açılınca: `web/.env.local`'deki `NEXT_PUBLIC_ADSENSE_CLIENT_ID` + web'deki reklam birimi `slot` ID'si, ve `mobile/app.json`'daki `extra.admob.androidBannerUnitId`/`iosBannerUnitId` + plugin'deki `androidAppId`/`iosAppId` gerçek değerlerle değiştirilmeli.
- **Kullanıcı aksiyonu gerekiyor — hesap açma rehberi ayrıca (sohbette) verildi:** Kullanıcının ne AdSense ne AdMob hesabı var ("Hiçbiri yok, nasıl açacağımı anlat" cevabı) — adım adım nasıl açılacağı ayrı bir mesajda anlatıldı.
- KVKK/GDPR consent ekranı hâlâ yapılmadı — gerçek hesaplar açılıp trafik gelmeye başlamadan önce ele alınmalı (kapsam dışı bırakıldı, ayrı bir iş maddesi olarak not düşülüyor).

---

## 4. Ödül Sistemi — Haftalık/Aylık XP Liderliği + Rozetler

**Karar (23 Ağustos): "ödülleri sen belirle, sana bırakıyorum."** Tasarım ve backend uygulaması tamamlandı:

- ✅ **Rozet (badge) altyapısı** — yeni `badges` (katalog) + `user_badges` (kazanılan rozetler) tabloları canlı DB'ye migration ile eklendi, 10 başlangıç rozeti tohumlandı (streak_7/30/100/365, weekly_top1/top3/top10, monthly_top1/top3/top10). `GET /stats/badges` endpoint'i eklendi (henüz mobil/web'de gösterildiği bir ekran YOK — sadece backend + API hazır, sıradaki doğal adım bu).
- ✅ **Seri (streak) kilometre taşı ödülleri** — `streak.py`'ye eklendi, gerçek zamanlı çalışıyor (kullanıcı 7/30/100/365. gününe ulaştığı anda): bonus XP (30/150/500/2000) + rozet + uygulama içi bildirim.
- ✅ **Haftalık/aylık liderlik tablosu ödülleri** — yeni `backend/distribute_leaderboard_rewards.py` script'i (mevcut `expire_premium.py`/`send_schedule_reminders.py` ile AYNI desen — VPS cron'uyla periyodik çalıştırılmak üzere tasarlandı, in-process scheduler yok): haftalık/aylık 1. → rozet + bonus XP (150/500) + birkaç gün ücretsiz Premium (2/7 gün); 2-3. → rozet + bonus XP; 4-10. → rozet + bonus XP. İdempotent (aynı dönem için iki kez ödül verilmez, DB unique index garantili).
- **Kullanıcı aksiyonu gerekiyor:** Script'i gerçekten periyodik çalıştırmak için VPS'te (ya da uygun bir ortamda) cron kurulmalı — önerilen satırlar script'in docstring'inde (haftalık: her Pazartesi 04:10, aylık: her ayın 1'i 04:10). Şu an `expire_premium.py`/`send_schedule_reminders.py` de aynı şekilde bekliyor (bkz. Bölüm 6).
- **Sıradaki doğal adım (bu oturumda yapılmadı, kapsam bilinçli olarak backend'le sınırlı tutuldu):** Mobil/web'de rozetleri gösteren bir ekran/kart (örn. Profil sayfasına "Rozetlerim" bölümü) — API zaten hazır.

---

## 5. Sosyal Medya İçerik Stratejisi

*(değişiklik yok — önceki durum geçerli)*

- `backend/post_daily_content.py` şu an `SOCIAL_POST_MODE=fixed` — `real` yapılmalı.
- Telegram bot token'ı ve Slack webhook URL'i girilmeli.
- VPS'e cron kurulumu — production'a alma.
- Diğer platformlar (WhatsApp Business, Instagram, X, Facebook, YouTube) — kullanıcı kendi açacak.

---

## 6. Altyapı / Deploy — Küçük Takip Maddeleri

- ~~**Railway GitHub bağlantısı bozuk**~~ ✅ **Tamamlandı.**
- ~~**Vercel `lexis-web` projesi güncellenmiyordu**~~ ✅ **Tamamlandı.**
- ~~**Vercel Web Analytics / Speed Insights**~~ ✅ **Tamamlandı (23 Ağustos)** — `@vercel/analytics` + `@vercel/speed-insights` root layout'a eklendi.
- **Custom domain:** `lexiswords.com` **26 Ağustos'ta satın alınacak.** Sonrasında DNS + Vercel/Railway domain ayarları yapılmalı.
- **Bekleyen cron kurulumları (hepsi aynı VPS'te, aynı desende):** `expire_premium.py`, `send_schedule_reminders.py`, `post_daily_content.py`, ve yeni eklenen `distribute_leaderboard_rewards.py` — dördü de bağımsız Python script'i, henüz hiçbiri gerçek bir cron'a bağlanmadı.
- **Frontend tip hataları (`tsc --noEmit` taraması, 21 Ağustos'tan beri bekliyor, henüz dokunulmadı):** `Sidebar.tsx`/`game/page.tsx`/`forgot-password`/`reset-password`/`verify-otp` sayfalarındaki yerel sözlüklerde `ja` eksik; `words/page.tsx`'te `'words.form.wordPh'` anahtarı tipte yok; `register/page.tsx`'te `guestLang` tanımsız + `learning_lang`/`learning_langs` tip uyuşmazlığı; `schedule/page.tsx`'te çok sayıda tanımsız isim (muhtemelen yarım kalmış bir refactor kalıntısı). **`next build` muhtemelen hâlâ bu yüzden başarısız oluyor** — ayrı bir düzeltme oturumu gerekiyor.
- **`general_word_pool` ru/ar/ja backfill** — MyMemory kota durumu son kontrolden beri tekrar bakılmadı.
- **Kurumsal logo entegrasyonu** — öneri (18.13.05) verildi, karar/entegrasyon hâlâ bekliyor.

---

## Büyük, henüz başlanmamış işler

- [ ] `backend/tests/` — otomatik test altyapısı
- [ ] Ek oyun modları — hepsi zaten implemente edildi (bkz. Bölüm 1), bu madde kapandı.
- [ ] Mobil/web'de rozet gösterim ekranı (bkz. Bölüm 4)
- [ ] KVKK/GDPR reklam consent ekranı (bkz. Bölüm 3)

---

## Özet — Karar Bekleyen Noktalar (23 Ağustos itibarıyla)

1. ~~Mobil ödeme mimarisi~~ ✅ Karar verildi ve uygulandı (Bölüm 1).
2. ~~Ödül sistemi önceliklendirmesi~~ ✅ Karar verildi ve uygulandı (Bölüm 4) — tasarım tamamen bana bırakılmıştı.
3. **Sosyal medya kaynak dağılımı:** Hâlâ açık — tüm platformlara paralel mi, yoksa Telegram/Slack otomasyonu bitince sırayla mı?
4. **Yeni:** AdSense/AdMob hesapları ne zaman açılacak? Açılınca placeholder ID'lerin gerçekleriyle değiştirilmesi gerekiyor (Bölüm 3).
5. **Yeni:** iyzico'nun üç manuel adımı (`.env` düzeltmesi, Railway env, `setup_iyzico_plans.py`) ne zaman uygulanacak? (Bölüm 2)
6. **Yeni:** Ödül/hatırlatma/premium-süre-dolumu script'leri (4 tanesi) için VPS cron kurulumu ne zaman yapılacak? (Bölüm 6)

---

## Değişiklik Günlüğü

*(21-22 Ağustos girdileri korunuyor, sadece en sonda 23 Ağustos eklendi)*

- **22 Ağustos 2026:** Railway-GitHub bağlantısı kalıcı olarak onarıldı ✅. Mobil giriş hatası düzeltmesi uygulandı ✅. Custom domain (`lexiswords.com`) 26 Ağustos'ta satın alınacak olarak planlandı. Yeni öncelik eklendi: web + mobil karanlık/aydınlık tema.
- **22 Ağustos 2026 (devam):** Karanlık/aydınlık tema (genel) tamamlandı ✅ — web'in 35 dosyasına 1230 `dark:` class'ı eklendi.
- **22 Ağustos 2026 (devam 2):** Dashboard tema butonu eklendi ✅. Faz 2 başladı — Eşleştirme (Matching) modu mobile taşındı ✅, tab bar ikon-only yapıldı.
- **22 Ağustos 2026 (devam 3):** Vercel `lexis-web` GitHub bağlantısı kalıcı kuruldu ✅. Faz 2 tamamlandı — Yazma/Dinleme/Sprint modları da taşındı ✅.
- **22 Ağustos 2026 (devam 4):** `lucide-react-native` React 19 uyumu için `^1.33.0`'a yükseltildi ✅. Kullanıcı `eas build` testinde Profil sekmesi/şablon program eksikliklerini bildirdi. Faz 3 başladı — Quiz ekranı taşındı ✅.
- **22 Ağustos 2026 (devam 5):** Flashcards ekranı taşındı ✅.
- **22 Ağustos 2026 (devam 6):** Hazır şablon programlar eklendi ✅.
- **22 Ağustos 2026 (devam 7):** İstatistik ekranı `react-native-gifted-charts` ile taşındı ✅.
- **22 Ağustos 2026 (devam 8 — FAZ 3 TAMAMEN BİTTİ ✅):** Arkadaşlar, Mesajlar, Herkese Açık Profil, Premium ekranları taşındı. Mobil-web mobil özellik paritesi tamamlandı.
- **23 Ağustos 2026 (devam 9):** Kullanıcının konsolide karar mesajı + 3 netleştirme sorusuna verdiği cevaplar üzerine büyük, çok alanlı bir oturum:
  - **Admin panel koyu tema tamamen kapatıldı** — beklenenden büyük bir kapsam çıktı (12 dosya, tüm panelin `dark:` desteği yoktu), Recharts grafik renkleri de (stats + game-analytics) JS temalı hale getirildi.
  - **Vercel Web Analytics + Speed Insights** eklendi ✅.
  - **iyzico canlı ortama geçirildi**, gerçek kimlik bilgileri `.env`'e işlendi, bu sırada gerçek bir prod bug'ı (eksik karakterli secret key) bulunup düzeltildi (SendUserFile ile teslim edildi — `.env`'e uzaktan yazma güvenlik nedeniyle engelli, kullanıcının elle uygulaması gerekiyor). `setup_iyzico_plans.py` kullanıcının kendi makinesinde çalıştırılmalı (cloud ortamının iyzico'ya ağ erişimi yok).
  - **Mobil ödeme: Apple/Google IAP mimarisi uçtan uca kuruldu** — `expo-iap` istemci tarafı, `apple_appstore.py`/`google_play.py` fail-closed doğrulama servisleri, `/subscription/verify-purchase` endpoint'i, canlı DB migration (`subscriptions.store`/`iap_*` kolonları). Gerçek Apple/Google kimlik bilgileri girilene kadar (Apple Developer Program 26 Ağustos'ta aktive olacak) satın alma "yapılandırılmadı" hatası dönüyor, asla sessizce premium vermiyor.
  - **Reklam sistemi gerçek ağa bağlandı** — web'de zaten kodu tam olan `AdBanner` (AdSense) artık gerçekten `(app)/layout.tsx`'e yerleştirildi; mobilde sıfırdan `react-native-google-mobile-ads` entegrasyonu (Dashboard'da banner, SDK init, config plugin) eklendi. İkisi de şu an Google'ın test ID'leriyle çalışıyor, gerçek AdSense/AdMob hesapları açılınca placeholder'lar değiştirilmeli — hesap açma rehberi kullanıcıya ayrıca anlatıldı.
  - **Ödül sistemi baştan tasarlanıp kodlandı** — rozet kataloğu + kazanım tablosu (canlı migration), seri (streak) kilometre taşı ödülleri (gerçek zamanlı, streak.py içinde), haftalık/aylık liderlik tablosu ödül dağıtım script'i (`distribute_leaderboard_rewards.py`, mevcut cron script deseniyle tutarlı), `GET /stats/badges` endpoint'i. Rozetleri gösteren bir ön yüz ekranı bilinçli olarak bu oturumun kapsamı dışında bırakıldı.
  - Bilinen "Profil sekmesi açılmıyor" bug'ı kullanıcı tarafından kapatıldı (tekrar üretilemiyor).
  - Tüm değişen/yeni dosyalar (web + mobil + backend, toplam 17 dosya) sözdizimi/import doğrulamasından geçirilip kullanıcının cihazına yazıldı.
