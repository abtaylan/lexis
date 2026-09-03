# Lexis — Kalan İşler (Güncel Durum)

_Son güncelleme: 31 Ağustos 2026, gece (yaklaşık 01:50) — bu dosya, aynı gün 21:25'te yazılan önceki sürümü günceller. Bu oturumda: (1) production'da tüm OTP e-postalarının gitmediği kritik hata kalıcı olarak çözüldü (Resend entegrasyonu uçtan uca doğrulandı), (2) bunu yaparken tetiklenen bir Vercel production build hatası düzeltildi, (3) kullanıcı isteğiyle web dashboard'daki bildirim/mesaj kartları küçük ikonlara taşındı, (4) App Store Connect'ten bir ret e-postası geldi (henüz incelenmedi). Yeni sohbette buradan devam edilebilir._

---

## 🔴 Yeni sohbette İLK yapılacaklar (öncelik sırası)

1. **Git push bekliyor** — `web/src/app/(app)/dashboard/page.tsx` (iki ayrı değişiklik: önce `pt` çeviri eksikliği fix'i, sonra bildirim/mesaj UI yeniden düzenlemesi) ve yeni dosya `web/src/app/(app)/notifications/page.tsx` cihaza yazıldı ama **commit/push edilmedi**. Kullanıcı terminalinde:
   ```
   git add -A
   git commit -m "Dashboard bildirim/mesaj kartlari ust bara tasindi, pt cevirisi eksikligi duzeltildi"
   git push
   ```
2. Push sonrası Vercel'de `lexis-web` production deploy'unun **başarılı** olduğu doğrulanmalı (bir önceki push, `pt` eksikliği yüzünden `Build Failed` vermişti — o hata bu oturumda giderildi, ama gerçek doğrulama ancak bu push sonrası mümkün).
3. GitHub Actions'taki **"Web Build" job hatası** (kullanıcının bu oturumda ilettiği CI bildirimi) muhtemelen aynı `pt` eksikliğinden kaynaklanıyordu — push sonrası CI'nin de yeşile döndüğü kontrol edilmeli.
4. Deploy başarılı olduktan sonra `app.lexiswords.com` dashboard'unda: (a) büyük "Hatırlatmalar"/"Mesajlar" kartlarının kalktığı, (b) üst barda zil + mesaj ikonlarının okunmamış sayı rozetiyle göründüğü, (c) zile tıklayınca yeni `/notifications` sayfasına gidildiği görsel olarak doğrulanmalı.

---

## ✅ Bu oturumda tamamlananlar

### 1. OTP e-posta sorunu — KALICI OLARAK ÇÖZÜLDÜ ✅
Production'da TÜM OTP e-postaları (kayıt, giriş, şifre sıfırlama) gönderilemiyordu. Kök neden: Railway'den `smtp.gmail.com:587`'ye giden ham SMTP bağlantıları engelli (önce "Network is unreachable", IPv4'e zorlayınca "timed out" — yani port 587'nin kendisi filtreleniyor, bulut platformlarında yaygın bir kısıtlama).

Çözüm — Resend (HTTPS tabanlı e-posta API'si, port 443):
- Resend hesabına bağlanıldı, `mail.lexiswords.com` alt alan adı eklendi
- Hostinger DNS'e DKIM (TXT) + SPF (2× CNAME) + DMARC (TXT, `v=DMARC1; p=none;`) kayıtları eklendi → domain **Verified**
- Sadece "Sending access" izinli, scoped bir API key oluşturuldu
- Railway'e `RESEND_API_KEY` ve `RESEND_FROM_EMAIL` (`Lexis <bildirim@mail.lexiswords.com>`) env değişkenleri eklendi
- `backend/app/core/config.py` ve `backend/app/services/email_service.py` güncellendi: `RESEND_API_KEY` doluysa Resend, boşsa eski SMTP yoluna düşüyor (hiçbir şey kırılmıyor) — commit `822534c`, push edildi, Railway'de deploy edildi
- **Uçtan uca doğrulandı**: `ahmetbehcettaylan@hotmail.com` ile "şifremi unuttum" testi yapıldı, kullanıcı kodu aldığını doğruladı, `notification_log` tablosunda `status: sent, via: resend` kaydı görüldü.

Yan bulgular:
- `ahmetbehcettaylan@gmail.com` adresi `auth.users`'da **hiç kayıtlı değil** — bu adrese kod gelmemesi bug değil, sistemin güvenlik amaçlı ("hesap var mı yok mu belli etme") tasarımı. Kayıt tamamlanmamışsa bu adresle register akışı yeniden denenebilir.
- Outlook'ta gelen mailin spam'e düşmesi: yepyeni bir gönderim alan adının henüz "gönderim itibarı" olmamasından kaynaklanan normal/geçici bir durum. DMARC kaydı eklendi (deliverability'yi iyileştirir); ayrıca gelen maili "spam değil" işaretlemek Outlook'un filtresini eğitir. Birkaç gün/hafta içinde düzelmesi beklenir.

### 2. Vercel production build hatası (2. kez) — düzeltildi ✅
`web/src/app/(app)/dashboard/page.tsx` içindeki `MSG_LABELS` sözlüğünde (mesaj kutusu ikonu/metinleri) yine bir `pt` (Portekizce) çevirisi eksikti (`TS2741`), bu yüzden `npm run build` tip kontrolünde patlıyor, production 1 gün önceki eski commit'te takılı kalıyordu. Düzeltildi; ayrıca `web/src` içindeki **tüm** `Record<Locale, ...>` sözlükleri (17 dosya, bazılarında 2-3 ayrı sözlük) tek tek taranıp başka eksik kalmadığı doğrulandı.

### 3. Web dashboard — bildirim/mesaj UI yeniden düzenlendi (kullanıcı isteği) ✅
- Dashboard'daki büyük "Hatırlatmalar" ve "Mesajlar" kartları kaldırıldı.
- Üst bar ikon satırına (tema butonunun yanına) bir **zil ikonu** eklendi: okunmamış bildirim varsa kırmızı rozette sayı gösteriyor (9+'a kadar), tıklayınca yeni oluşturulan `/notifications` sayfasına gidiyor.
- Mesaj ikonu zaten üst barda vardı (aynı rozet deseniyle), korundu; sadece altındaki büyük önizleme kartı kaldırıldı, `/messages` sayfasına yönlendirme aynen duruyor.
- Yeni dosya: `web/src/app/(app)/notifications/page.tsx` — mobildeki `mobile/src/app/(app)/notifications.tsx` ile birebir aynı desen (tip bazlı ikon: mesaj/arkadaşlık isteği/rozet/seri/genel; "tümünü okundu işaretle"; tıklayınca okundu işaretleme). 10 dilin hepsi için çeviri metinleri eklendi.
- Not: bu özelliğin backend'i (`/notifications` endpoint'leri) ve web API client'ı (`notificationsApi`) zaten önceden hazırmış, sadece kullanıcıya gösteren ayrı bir sayfa yoktu — bu oturumda eklendi.

### (Önceki oturumdan, aynı gün daha erken — özet)
- Mobil: şifre göz ikonu, "zaten kayıtlı" false-positive hatası fix'i, sıralama kendi sekmesine taşındı (6 ikonlu tab bar)
- Web: Vercel build hatası (1. kez, 14 dosyada `pt` eksikliği) + `BadgeShowcase` tip hatası düzeltildi
- SMTP → IPv4 zorlama denemesi (bu, asıl port-engeli sorununu çözmedi, yukarıdaki Resend geçişiyle asıl çözüme ulaşıldı)

---

## 🆕 Bu oturumda gelen, henüz ele alınmamış yeni bildirimler

### 1. App Store Connect reddi — "Changes needed"
Kullanıcıya gelen e-posta:
- Uygulama: Lexis (iOS), Version 1.0
- Gönderim: 31 Ağustos 2026, 00:05 (Pacific Daylight Time)
- Gönderen: Ahmet Behçet Taylan
- Submission ID: `add3b47b-34d2-445b-b449-5c005cafc293`

E-posta genel bir şablon — **asıl ret sebebi metinde yok** ("birden fazla sebep olabilir" deniyor). Yeni sohbette yapılması gereken: App Store Connect → App Review sayfasına girip (Apple hesabıyla giriş gerektiği için ya kullanıcı kendisi bakıp gerçek ret nedenini buraya yapıştırmalı, ya da tarayıcıda oturum açıkken bana bakması için haber verilmeli), gerçek nedeni öğrenip düzeltmek ve yeniden göndermek.

### 2. Android login hatası — "Giriş yapılamadı"
Bu oturumun başında bildirilmişti, sadece genel bir "APK'yı yeniden derle" önerisi verildi. **Doğrulanmadı, çözülmedi.** Yeni sohbette önce şunlar netleştirilmeli: hangi Android cihaz/sürüm, hata tam olarak ne zaman çıkıyor (giriş formunu gönderdikten hemen sonra mı, yoksa OTP adımında mı), backend loglarında (Railway) veya `notification_log`'da bu deneme sırasında bir iz var mı.

### 3. GitHub Actions CI — "Web Build" hatası
Kullanıcının ilettiği bildirimde `Backend Tests` geçmiş ama `Web Build` başarısız olmuş görünüyordu — büyük olasılıkla yukarıdaki madde 2'deki (`pt` eksikliği) aynı kök nedenden. Push sonrası tekrar kontrol edilmeli.

---

## Devam eden ürün kararları (önceki oturumdan taşındı — bu oturumda tekrar dokunulmadı, hâlâ geçerli)

### A. [EN ÖNEMLİ, ürün kararı gerektiriyor] `general_word_pool` sadece İngilizce öğrenenler için dolu
`general_word_pool` tablosunda `source_lang` her satırda `'en'`; `target_lang` sadece 8 dilde (`ar/de/es/fr/it/ja/ru/tr`, her biri 303 satır). Yani havuz "İngilizce kelime + 8 dilde anlamı" şeklinde kurulu. `learning_lang` İngilizce değilse kelime oyunu sorguları (`backend/app/api/routes/games.py`, `pool_source="general"`) her zaman boş döner. Kişisel kelime listesi (`pool_source="own"`, `words` tablosu) bundan etkilenmiyor.

**Karar gerektiren soru**: v1 kapsamı bilinçli olarak "içerik havuzu sadece İngilizce" mi, yoksa eksik mi? İki yön:
- (a) `learning_lang` seçimini şimdilik sadece `en` ile sınırla, veya
- (b) diğer öğrenme dilleri için de gerçek kelime havuzu üret (büyük iş).

### B. `pt` (Portekizce) — hem A maddesinin bir alt kümesi, hem UI dili olarak da desteklenmiyor
`languages` tablosunda aktif ve öğrenme dili olarak seçilebiliyor, ama (i) `general_word_pool`'da içeriği yok (madde A), (ii) arayüz dili olarak `LOCALE_META`'da (web/landing/mobil, 3 ayrı dosya) hiç yok — bu kısıtlama bilinçli (UI çevirisi olmayan dil ana dil seçeneği olamaz, aksi halde sessizce Türkçe'ye düşüyor). Karar: `pt`'yi devre dışı bırak, ya da tam 10. dil yap (kelime çevirisi + UI çevirisi).

### C. Mobil kayıt ekranı — web'de kapatılmış bir bug'ı arka kapıdan yeniden açıyor
`mobile/src/app/(auth)/register.tsx` içindeki ana dil (native_lang) seçici, `LOCALE_META` ile filtrelenmiyor (web ve mobil profil sayfası doğru filtreliyor). Sonuç: mobilde biri ana dil olarak "Português" seçip kaydolabiliyor; mobil kendini bundan koruyor (UI dili `native_lang`'dan bağımsız), ama **aynı hesapla web'e girince** `resolveLocale('pt')` sessizce `'tr'`ye düşüyor (`web/src/lib/i18n.tsx`). Önerilen düzeltme küçük ve düşük riskli: `register.tsx`'te native dil seçicisini `LOCALE_META` ile filtrele (learning dil seçicisi filtresiz kalabilir, kasıtlı).

### D. `learning_resources` tablosu — 5/10 dilde hiç kayıt yok
Sadece `ar, de, en, es, fr`'de 5'er kayıt var. `it, ja, ru, tr, pt` boş. SQL ile otomatik doldurulamaz, küratörlü/gerçek kaynak linkleri gerekiyor (insan kararı).

### E. `badges` tablosu — sadece TR/EN
`badge_service.py`'deki `get_user_badges()` sadece `name_tr`/`name_en` join ediyor — diğer 7 UI dilindeki kullanıcılar rozetleri kendi dillerinde göremiyor olabilir. **İlk kontrol edilecek şey**: `mobile/src/i18n/dashboardStrings.ts`'teki `BADGE_LABELS` sözlüğünün 9 dili kapsayıp kapsamadığı ve ekranlarda DB yerine bu sözlüğün mü kullanıldığı (bu oturumda da doğrulanamadı).

---

## Sizin yapmanız / karar vermeniz gerekenler

1. Yukarıdaki "İLK yapılacaklar" bölümündeki git push.
2. App Store ret e-postasındaki gerçek sebebi App Store Connect'ten görüp paylaşmanız (ya da bana bakmam için erişim/ekran görüntüsü).
3. Android login hatası için: hangi cihaz, hata ne zaman çıkıyor — birkaç ek detay.
4. Madde A + B kararı: `general_word_pool` kapsamı ve `pt`'nin durumu.
5. Madde C fix onayı (önerilen: evet, düşük riskli).
6. `learning_resources` için 5 dilde küratörlü kaynak linkleri.
7. `badges` i18n kapsamının netleştirilmesi.
8. 12 gerçek Android test kullanıcısının Play Store'da opt-in olup olmadığının teyidi.
9. İki logo alternatifinden (A/B) hangisini istediğinize karar verilmesi.
10. AdMob "Hesap Türü" (Bireysel → İşletme) geçişi ve Arif Emre'nin vergi bilgilerinin girilmesi (Chrome'da "Google AdMob" ve "Geliştirici hesabı" sekmeleri açık kalmıştı, tamamlanmadı).

---

## ⏳ Bloke / dış etkene bağlı (aksiyon şu an mümkün değil)

- **Google Play Console** — kimlik doğrulama incelemesi hâlâ bekleniyor. Sonuçlanınca e-posta gelecek; `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`'ı Railway'e girme işlemini güvenlik kuralı gereği kullanıcı kendisi yapmalı.
- **App Store incelemesi** — "Changes needed" ile döndü (yukarıda madde 1), aksiyon bekliyor, bloke değil artık — öncelikli hale geldi.
- **12 gerçek Android testeri** — Play Store'da opt-in bekleniyor.

---

## 📋 Orta/uzun vadeli backlog (bu oturumda tekrar kontrol edilmedi)

- iyzico 401 hatası çözümü
- iyzico üye iş yeri başvurusunun sonucu
- Döviz bazlı Premium (USD/EUR) — kod hazır, iyzico'da plan oluşturma üye iş yeri onayına bağlı
- Troy logosu / marka izni — BKM/Troy'dan resmi izin istenmesi gerekiyor
- Ek oyun modları
- Backend otomatik testler
- Web'de mobildeki gibi bir OS/tarayıcı push bildirimi izni akışı yok (mobilde `notification-permission.tsx` var, web'de karşılığı yok) — şu ana kadar istenmedi, gerekirse ayrı bir iş kalemi olarak değerlendirilebilir.

---

## Yeni sohbette öncelik sırası önerisi

1. Git push + Vercel/CI doğrulama (hemen, en üstteki liste)
2. App Store ret sebebini öğren ve düzelt
3. Android login hatası tanısı
4. `general_word_pool` kapsam kararı (madde A) — en büyük ürün kararı
5. Mobil `register.tsx` filtre bug'ı fix (madde C) — küçük, hızlı
6. `pt` kararı (madde B) — madde A'nın kararına bağlı
7. `badges` i18n kapsamının netleştirilmesi (madde E)
8. `learning_resources` için küratörlü linkler (madde D)
9. AdMob hesap türü / Arif Emre vergi bilgisi, logo A/B kararı, 12 Android testeri teyidi
10. Orta/uzun vadeli backlog'un (iyzico, Troy logosu, döviz Premium, ek oyun modları, otomatik testler) güncel durumunun teyidi

---

## Referans: bu oturumda değişen/eklenen dosyalar

- `backend/app/core/config.py` — `RESEND_API_KEY`, `RESEND_FROM_EMAIL` eklendi (commit `822534c`)
- `backend/app/services/email_service.py` — Resend-first / SMTP-fallback mantığı (commit `822534c`)
- `web/src/app/(app)/dashboard/page.tsx` — `pt` fix + bildirim/mesaj UI yeniden düzenleme (**push edilmedi**)
- `web/src/app/(app)/notifications/page.tsx` — **YENİ dosya** (**push edilmedi**)
- Railway env vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` eklendi, deploy edildi
- Resend: `mail.lexiswords.com` domain eklendi ve doğrulandı, "Lexis Backend (Railway)" API key (Sending access) oluşturuldu
- Hostinger DNS (`lexiswords.com`): `resend._domainkey.mail` (TXT/DKIM), `rsend.mail` + `send.mail` (CNAME/SPF), `_dmarc.mail` (TXT/DMARC) kayıtları eklendi

## Referans: önceki oturumdan ilgili dosya/tablo yolları (madde A-E için)

**Veritabanı (Supabase, project_id `mrxeuxscyztpiuagsumh`):**
- `general_word_pool` (source_lang, target_lang, word, meaning, example, definition, difficulty_level, is_active)
- `languages` (code, name_native, name_en, flag_emoji, is_active) — 10 aktif satır
- `learning_resources`, `badges`, `words`, `notification_log`, `otp_codes`

**Web (`web/`):** `src/lib/i18n.tsx` (`LOCALE_META`, `resolveLocale`), `src/app/(auth)/register/page.tsx`, `src/app/(app)/profile/page.tsx`

**Mobil (`mobile/`):** `src/i18n/locales.ts`, `src/i18n/index.tsx`, `src/app/(auth)/register.tsx` (filtre eksik), `src/app/(app)/profile.tsx` (filtre doğru), `src/components/DashboardHeader.tsx` (zil+mesaj ikonu, web'e bu oturumda taşınan tasarımın orijinali)

**Backend (`backend/`):** `app/api/routes/games.py`, `app/api/routes/words.py`, `app/services/learning_languages.py`, `app/services/badge_service.py`, `backend/seed_general_word_pool.py`
