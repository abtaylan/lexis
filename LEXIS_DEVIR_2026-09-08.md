# Lexis — Devir Notu
**Tarih:** 8 Eylül 2026
**Repo:** `C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis`
**Son commit (push edildi, origin/main ile senkron):** `ee016b5`

> **Yeni sohbette DOĞRUDAN BAŞLA: kullanıcıya soru sorma.** Bu oturumda V2 yol
> haritasına (Sınav Hazırlık Alanı vb.) hiç dokunulmadı — tamamen altyapı/ops
> işleri yapıldı (cron, Apple ile Giriş, FCM). §1'deki V2 önceliği hâlâ #1:
> "Sınav Hazırlık Alanı" (YDS/YÖKDİL/IELTS/TOEFL). Yeni sohbet doğrudan oradan
> başlamalı. Tasarım kararlarında boşluk varsa (§1.1'de işaretli) makul bir
> karar ver ve ilerle — kullanıcının stated preference'ı "execute
> autonomously without confirmation at each step".

---

## 0. Bu oturumda tamamlananlar (8 Eylül 2026, tekrar yapılmasın)

| Konu | Durum |
|---|---|
| Railway native cron — sabah/akşam push bildirimleri | ✅ `lexis-cron-schedule-reminders` deseni tekrarlanarak iki yeni Railway servisi kuruldu: **lexis-cron-push-morning** (`0 6 * * *` UTC, Root Dir `backend`, Start Command `python send_push_reminder.py morning`) ve **lexis-cron-push-evening** (`0 17 * * *` UTC, `python send_push_reminder.py evening`). İkisine de aynı 8'lik env var Raw Editor bloğu (`${{lexis.VAR}}` referanslarıyla: SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL, SMTP_USER, SMTP_PASSWORD) eklendi, deploy edildi. İkisi de "Deployment successful" / Ready ile doğrulandı. |
| GitHub Actions `push-reminders.yml` kaldırıldı | ✅ Railway cron'lar devreye girdiği için gereksiz kaldı, `git rm` ile silindi ve commit'lendi (`ee016b5`). **NOT:** `schedule-reminders.yml` GitHub Actions workflow'u da aynı şekilde `lexis-cron-schedule-reminders` Railway servisiyle artık yedekli/gereksiz ama bu oturumda kullanıcı sadece push-reminders.yml'i kaldırmayı istedi — schedule-reminders.yml hâlâ repo'da duruyor, sırası gelirse (kullanıcı isterse) o da kaldırılabilir. `daily-word-email.yml` GH Action'ı henüz Railway'e taşınmadı, olduğu gibi duruyor. |
| Sign in with Apple — uçtan uca aktif | ✅ Apple Developer Console: App ID `app.lexis.mobile` için "Sign In with Apple" capability açıldı, kaydedildi (provisioning profile invalidation beklenen davranış, EAS Build otomatik hallediyor). Supabase: Authentication → Providers → Apple, "Enable Sign in with Apple" açık, Client IDs = `app.lexis.mobile,host.exp.Exponent`, Secret Key boş bırakıldı (native-flow ID token doğrulaması Apple JWKS üzerinden, secret gerekmiyor). Kod tarafı zaten önceki oturumda tamamlanmış ve push+eas update edilmişti. |
| FCM (Android push) — uçtan uca tamamlandı | ✅ Firebase projesi `lexis-291d9` altında Android app (`app.lexis.mobile`, nickname "Lexis Android") kaydedildi. `google-services.json` indirilip `mobile/`'e kondu, `mobile/app.json`'a `android.googleServicesFile: "./google-services.json"` eklendi — bu ikisi commit'lendi (`e3448e4`). Firebase Admin SDK service account private key oluşturuldu (Project Settings → Service Accounts → Generate new private key). **`eas credentials` CLI'ı tamamen interaktif/TTY tabanlı olduğu için bu ortamdan (device_bash, ~45sn'lik stateless shell) çalıştırılamadı** — bunun yerine key **Expo web panelinden** yüklendi: `expo.dev/accounts/ahmetbehcettaylan/projects/lexis/credentials/android/app.lexis.mobile` → Service credentials → "FCM V1 service account key" → "Add a service account key" → dosya yükle → Save. EAS tarafında doğrulandı: Project ID `lexis-291d9`, Private key ID `af9e224ea5...`, Client `firebase-adminsdk-fbsvc@lexis-291d9.iam.gserviceaccount.com`. İndirilen key dosyası kullanıcının Downloads klasöründe `_to_delete/` alt klasörüne taşındı (hassas credential, silme izni istemek yerine taşıma yolu kullanıldı) — **kullanıcı o klasörü elle silebilir**. |
| Android tablette "hâlâ OTP istiyor" bug'ı | ✅ Backend'de sorun bulunamadı (`otp_codes`/`notification_log`'da son 36 saatte hiç yeni satır yoktu — `has_ever_verified()` skip-OTP mantığı doğru çalışıyordu). Kök neden: tabletteki eski OTA JS bundle'ı, "ilk login'den sonra OTP atla" mantığının güncel halini almamıştı. Kullanıcı uygulamayı tamamen kapatıp (arka plandan temizleyip) yeniden açınca düzeldi — kod değişikliği gerekmedi. |
| Git commit + push | ✅ İki commit hazırlandı (bu ortamdan push edilemiyor, bkz. §3), kullanıcı kendi PowerShell'inde `git push` çalıştırdı — `ff5c8ce..ee016b5 main -> main` başarıyla gönderildi. |

**Bu oturumda YAPILMADI, sırada bekliyor:** Apple ile Giriş + FCM'in ikisini birden kapsayan native `eas build` turu (native config değişti: `google-services.json`, Apple capability — sadece OTA/`eas update` yetmez). Komutlar aşağıda §0.1'de.

### 0.1. Sırada — eas build komutları (kullanıcı kendi PowerShell'inde çalıştıracak)

Native config değişti (google-services.json + Apple Sign-In capability) — OTA update yetmez, yeni native build + store submission gerekiyor. `eas.json`'da `production` profili `autoIncrement: true` olduğu için versiyon otomatik artıyor. Platformlar ayrı ayrı çalıştırılmalı (`all` DEĞİL — web export'u da tetikliyor ve `react-native-google-mobile-ads` web'de patlıyor, bkz. önceki devir notu §0).

```powershell
eas build --platform android --profile production --auto
```
```powershell
eas build --platform ios --profile production --auto
```

`--auto` build başarılı olunca otomatik `eas submit` de yapar (Play Store / App Store Connect'e gönderir). Ayrı ayrı yapmak istenirse:

```powershell
eas build --platform android --profile production
eas build --platform ios --profile production
```
sonra build bitince:
```powershell
eas submit --platform android --latest
eas submit --platform ios --latest
```

Build birkaç dakika sürer, terminalde ilerleme görünür; bitince Expo dashboard'daki Builds sekmesinden de takip edilebilir (`expo.dev/accounts/ahmetbehcettaylan/projects/lexis/builds`).

---

## 1. ŞİMDİ YAPILACAK — V2 Yol Haritası (öncelik sırası, kullanıcı onaylı, DEĞİŞMEDİ)

Bu bölüm önceki devir notuyla (7 Eylül) birebir aynı — bu oturumda hiç dokunulmadı.

### 1.1. YDS / YÖKDİL / IELTS / TOEFL Sınav Hazırlık Alanı — ÖNCELİK #1, buradan başla

Kullanıcının isteği (kendi sözleriyle): *"uygulama içinde YDS/YÖKDİL/IELTS/TOEFL alanı olsun, burada bu sınavlar için örnek sorular, doğru cevap analizi, örnek denemeler, yani sınava hazırlayacak ve destek olacak bir alan olsun, hatta buradaki sorulardan kişi kendi kelime havuzuna kelime ekleyebilsin."*

Kapsam (netleşen):
- Uygulama içinde ayrı bir "Sınav Hazırlık" alanı: YDS, YÖKDİL, IELTS, TOEFL için örnek sorular.
- Her soru için doğru cevap analizi (neden doğru/yanlış açıklaması).
- Bu 4 sınavın her biri için **tam süreli (timed) deneme sınavı** modu.
- Kullanıcı, sınav sorularındaki kelimeleri doğrudan kendi kelime hazinesine ekleyebilmeli.

**⚠️ Henüz karar verilmemiş / tasarım boşlukları (yeni sohbette soru sorulmadan makul kararla ilerlenmeli):**
1. Soru/deneme içeriği nereden gelecek? (AI ile üretilip DB'ye seed edilecek mi — `general_word_pool` ve `daily_word_content` için yapıldığı gibi — yoksa telif riski olan gerçek geçmiş sınav sorularından mı kaçınılacak? **Telif nedeniyle gerçek YDS/YÖKDİL/IELTS/TOEFL sorularının birebir kopyalanması RİSKLİDİR — orijinal, sınav formatına uygun yeni sorular üretilmesi önerilir.**)
2. IELTS/TOEFL çok dilli sistemle nasıl ilişkilenecek — bu sınavlar sadece İngilizce öğrenenler için mi (learning_lang=en), yoksa YDS/YÖKDİL gibi Türkçe konuşanlara özel sınavlar başka dillere de mi genellenecek? (Muhtemel cevap: YDS/YÖKDİL native_lang=tr + learning_lang=en'e özel; IELTS/TOEFL de learning_lang=en'e özel — yani şimdilik sadece en öğrenen ve tr konuşan kullanıcı kitlesine hitap edecek, diğer dil çiftlerinde bu alan gizlenebilir/boş olabilir.)
3. Şema: muhtemelen yeni tablolar gerekecek — örn. `exam_questions` (exam_type, question_text, options, correct_option, explanation, source_word_ids[]), `exam_sessions` (user_id, exam_type, started_at, ended_at, score, is_timed), `exam_attempts`. `games.py`/`xp_service.py`'deki mevcut desenlerle tutarlı tasarlanmalı.
4. XP/puanlama bu yeni alanda nasıl işleyecek — mevcut `xp_service.XP_AMOUNTS` içine yeni kaynak tipleri eklenebilir (örn. `exam_question`, `exam_mock_complete`).
5. "Sorulardan kelime ekle" — bu muhtemelen mevcut `words` tablosuna doğrudan insert (bkz. `_sync_word_progress` deseni, games.py içinde 7 Eylül'de eklendi) ile çözülebilir.

Önerilen ilk adım: backend şeması + birkaç örnek soru/deneme ile MVP bir uçtan uca akış (bir sınav türü, örn. YDS, için) kurup kullanıcıya göstermek, sonra diğer 3 sınava ve deneme moduna genişletmek.

### 1.2. Gerçek Zamanlı Düello — ÖNCELİK #2

- Anlık eşleşmeli, canlı kelime düellosu (Kahoot tarzı) — viral/sosyal büyümeyi destekler.
- **Önemli tespit:** Bu sistem şu an MEVCUT DEĞİL. Backend'de websocket/realtime altyapısı yok (`challenge_service.py` sadece asenkron/turn-based). Sıfırdan inşa edilmesi gerekiyor.
- Önerilen yaklaşım: Supabase Realtime channels (zaten Supabase kullanıldığı için en düşük maliyetli entegrasyon yolu).
- Oyun veya Düello grubu oluşturup, bu gruba adminlik yapıp, arkadaş davet etme, veya dışarıdan katılım sağlama yapılacak. Yani istersen özel grup olarak, istersen uluslar arası grup kurarak orada grup içi yarışlara katılınalacak, Lig kurulacak ve ligleri ilk 3 te bitirneler üst lige çıkacak, son 3 alt lige düşecek, Bu liglerde zorlu challenge lar olacak, görevler olacak, bu liglerin seviyesi en baştan belli olacak, üst liglere çıkarken ödüller verilecek. Bu fikri daha da genişletip profesyonel hale getirelim, ileride bu uygulamayı tercih eden eğitim kurumları vb. kurumlara özel ligler kurulabilir. Bu bölüm çok önemli. bu ligler içinde candy crush gibi görevleri yaptıkça ilerleme adımlarını user'lar görmeli ve izlemeli, bu motive edici olacaktır. Bu yapı aynı zamanda duolingo daki benzerliği sağlar. yani görev haritası olayı olmalı, burada tasarımlar, geçiş görselleri grafikleri oyun mantığında olmalı.

### 1.3. Referans / Davet Programı — ÖNCELİK #3

- Arkadaşını davet et → ikinize de X gün premium.
- Mevcut sosyal altyapı (follow/friends sistemi, `backend/app/api/routes/social.py`) üzerine kolayca oturur.

### 1.4. Yeni Diller — ÖNCELİK #4

- Kesinleşen: Korece (ko), Çince (zh) — Duolingo 2025 Türkiye Dil Raporu'na göre Türkiye'de en hızlı büyüyen diller.
- Ek öneriler (veri destekli): Hollandaca (nl) — Türk diasporası 3. sırada (~500K); Azerice (az), Farsça (fa) — düşük maliyetli/stratejik ek seçenekler.
- Teknik olarak: `languages` tablosuna satır eklemek + `general_word_pool`'a o dil çiftleri için seed (mevcut seed script deseni, `backend/seed_general_word_pool.py`) + mobil/web i18n dosyalarına yeni dil bloğu eklemek gerekiyor (10 dilin tamamında tekrarlanan `translations.json` / `i18n.tsx` / `gameStrings.ts` deseni).

### 1.5. Kurumsal / Dershane (B2B) Paketi — ÖNCELİK #5

- YDS/YÖKDİL öğrenci kitlesi göz önüne alınırsa dershanelere toplu lisans satışı yeni bir B2B gelir kanalı olabilir.
- Hedef segment kategorileri ve 5 adımlı outreach yaklaşımı önceki oturumda hazırlandı (dershaneler, üniversite hazırlık okulları, kurumsal dil eğitimi veren şirketler) — kullanıcı isterse somut isim bazlı hedef listesi/pilot outreach e-postası tekrar hazırlanabilir.

### Şimdilik ertelenenler (v2 kapsamı dışında)
- Telaffuz / dinleme pratiği
- Ana ekran widget'ı (mobil)

---

## 2. Açık / takip edilmemiş konular (önceki oturumlardan, hâlâ kontrol edilmedi)

1. **AB Trader Status (DSA uyum beyanı)** — App Store Connect → Business bölümü ve Play Console'daki eşdeğer beyan. Hâlâ kontrol edilmedi. Doldurulmamışsa AB'de dağıtım engellenebilir. **Karar kullanıcının** (Individual/trader durumu hukuki bir belirleme).
2. **App Store / Play Store inceleme durumu** — bu oturumda kontrol edilmedi. Yeni native build (§0.1) submit edildikten sonra tekrar incelemeye girecek, o noktada kontrol edilmeli.
3. **`schedule-reminders.yml` GitHub Actions workflow'u** — `lexis-cron-schedule-reminders` Railway servisiyle yedekli hale geldi ama bu oturumda kaldırılmadı (kullanıcı sadece push-reminders.yml'i istedi). Sırası gelirse kaldırılabilir.
4. **`daily-word-email.yml` GitHub Actions workflow'u** — henüz Railway native cron'a taşınmadı, hâlâ GitHub Actions üzerinde çalışıyor. İstenirse aynı Railway cron deseniyle (`lexis-cron-daily-word-email` vb.) taşınabilir.

---

## 3. Ortam / çalışma şekli — bu oturumda doğrulanan/eklenen kurallar

- **`device_bash` çalışıyor**, bağlı klasörler: `$HOME/mnt/lexis` = `C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis`, `$HOME/mnt/Downloads` = `C:\Users\ytt\Downloads`.
- **`git add -A` KESİNLİKLE kullanılmasın.** Repo genelinde CRLF/LF satır sonu farkından kaynaklanan yaygın "modified" gürültüsü var (~55 dosya, gerçek içerik değişikliği değil). Her zaman değiştirilen dosyaların TAM YOLUNU tek tek `git add` et, commit öncesi `git diff <dosya>` ile scope'u doğrula.
- **`git push` bu ortamdan YAPILAMIYOR** — commit'leri hazırla (device_bash ile, dosya dosya `git add`), sonra kullanıcıya `git push` komutunu ver, kendisi PowerShell'de çalıştırsın (tarayıcı tabanlı auth istiyor, bu oturumda başarıyla çalıştı: `info: please complete authentication in your browser...`).
- **`eas credentials` CLI'ı interaktif/TTY tabanlı, device_bash'ten (stateless, ~45sn) çalıştırılamıyor.** FCM V1 / Google Service Account key gibi credential yüklemeleri için **Expo web paneli** kullan: `expo.dev/accounts/<hesap>/projects/<proje>/credentials/android/<bundle-id>` → Service credentials. Hesap seviyesindeki "Google Service Account Keys" (Account → Android & iOS credentials) EAS Submit/Play Store içindir, FCM V1 push için DEĞİL — proje-özel credentials sayfasındaki "FCM V1 service account key" bölümü kullanılmalı.
- **Chrome'da native dosya seçme diyaloğu ile karşılaşınca:** `mcp__claude-in-chrome__computer` ile "Upload file" butonuna tıklamak native OS dialogu açar, görülemez/tıklanamaz. Bunun yerine: (1) dosya kullanıcının bilgisayarındaysa `device_stage_files` ile cloud sandbox'a al (`/mnt/user-data/uploads/...` altına düşer), (2) `read_page`/`find` ile gizli `<input type="file">` elementinin ref'ini bul, (3) `mcp__claude-in-chrome__file_upload` ile o ref'e cloud sandbox'taki dosya yolunu ver. `file_upload` tool'u doğrudan Windows dosya yollarını (`C:\...`) KABUL ETMİYOR — mutlaka önce `device_stage_files` ile bu oturumun kendi dosya alanına staged edilmeli.
- **Railway native Cron Schedule servisi kurulumu** (kanıtlanmış tekrarlanabilir desen): "+ Add" → "GitHub Repository" → repo seç → Settings → Source → "Add Root Directory" → `backend` → Settings → Deploy → "Custom Start Command" → komut gir → "Cron Schedule" → "Add Schedule" → "Customize" → `M H * * *` formatında UTC cron gir → servis adını değiştirmek için başlığa çift tıkla → "Deploy" → Variables sekmesi → "Raw Editor" → `${{lexis.VAR_NAME}}` referans bloğunu yapıştır → "Update Variables" → tekrar "Deploy" → Deployments sekmesinden "Deployment successful" doğrula.
- Hassas dosya silme gerektiğinde (`device_bash` varsayılan olarak `rm` yapamıyor): silme izni istemek yerine `mv` ile aynı bağlı klasör altında bir `_to_delete/` alt klasörüne taşımak daha az sürtünmeli — kullanıcıya nerede olduğunu söyle, kendisi silsin.
- Mobil (JS/TS) değişiklikleri store build'ine otomatik yansımaz — native config/paket değişmediyse:
  ```
  eas update --branch production --platform android --message "..."
  eas update --branch production --platform ios --message "..."
  ```
  (ayrı ayrı, `all`/comma-separated DEĞİL). Native değişiklik varsa (bu oturumdaki gibi) §0.1'deki `eas build` gerekir.
- Backend (`backend/`) → GitHub push sonrası Railway otomatik deploy ediyor. Web (`web/`) → push sonrası Vercel otomatik deploy ediyor.
- Supabase MCP araçlarıyla (`mcp__Supabase__*`) canlı DB'ye doğrudan erişim var — `project_id: mrxeuxscyztpiuagsumh`.
- Chrome browser automation (`mcp__claude-in-chrome__*`) kullanıcının gerçek, giriş yapılmış Chrome oturumuna bağlanıyor — Railway, Apple Developer Console, Supabase Dashboard, Firebase Console, Expo dashboard gibi web panellerinde bu oturumda aktif olarak kullanıldı.

---

## 4. Mimari referans notları (değişmedi, önceki devir notundan taşındı)

- **`general_word_pool`** (27.270 satır, 10 dilin birbiriyle tüm 90 sıralı kombinasyonu × 303 kelime): `source_lang`=öğrenilen dil, `target_lang`=çeviri/ana dil, `word`/`example`/`definition` source_lang'da, `meaning` target_lang'da.
- **`daily_word_content`** (55 satır, sadece en/tr + ar/tr): `target_lang`=öğrenilen dil, `native_lang`=ana dil — **`general_word_pool` ile isimlendirme yönü TERS**.
- **`words`** (kullanıcının kişisel kelime hazinesi): `user_id, word, meaning(=native dil), meaning_native, meaning_target, example, source_lang(=öğrenilen dil), target_lang(=ana dil), status(learning/learned), repetition_count, ease_factor, interval_days, next_review_at`. Spaced repetition: `backend/app/services/spaced_repetition.py::calculate_next_review(word_dict, success)`.
- **`games.py`** (`backend/app/api/routes/games.py`): `pool_source` ("own"/"general") × `mode` × `direction` matrisini yönetir. XP kuralı "İlk Doğru Deneme". `_sync_word_progress()` — her attempt sonrası `words` tablosunu günceller, yeni bir sınav/oyun alanı eklenirken örnek alınabilir.
- **`xp_service.py`**: `XP_AMOUNTS` sabiti + `award_xp(user_id, source_type, source_id)`.
- **i18n dosyaları** (10 dil: tr, en, ar, ru, de, fr, es, it, ja, pt): `mobile/src/i18n/translations.json`, `mobile/src/i18n/gameStrings.ts`, `web/src/lib/i18n.tsx`, `web/src/app/(app)/game/page.tsx`. Yeni sınav alanı için muhtemelen yeni `examStrings.ts` benzeri dosya gerekecek.
- **Mobil route yapısı**: `mobile/src/app/(app)/*.tsx` = expo-router sayfaları. Yeni "Sınav Hazırlık" alanı muhtemelen yeni bir route grubu olarak eklenecek.
- **`otp_service.py::has_ever_verified(email, purpose)`** — `otp_codes` tablosunda o email+purpose için verified=True satır varsa True döner; `auth.py::login()` bunu kullanarak ikinci login'den itibaren OTP'yi tamamen atlar (token doğrudan döner, hiç `otp_codes`/`notification_log` satırı oluşmaz). Bu davranış NORMAL — client tarafında eski bir OTA bundle bu mantığı bilmiyorsa yanlışlıkla hep OTP ekranına düşebilir (bu oturumdaki bug buydu).

---

## 5. Kimlikler / sabitler

| | |
|---|---|
| Bundle ID | `app.lexis.mobile` |
| EAS project ID | `06c954fe-baae-4671-a38f-8d053d954fad` |
| ASC App ID | `6806612758` |
| Apple Team | P54655N2D7 (Individual) |
| Play developer | 9216436788787157740 · app 4976178569042711201 |
| Backend | `https://lexis-production-6a53.up.railway.app` |
| Supabase project_id | `mrxeuxscyztpiuagsumh` |
| Firebase project | `lexis-291d9` (Spark/free plan) |
| Firebase Admin SDK service account | `firebase-adminsdk-fbsvc@lexis-291d9.iam.gserviceaccount.com` |
| Railway project | `determined-recreation` / `production` (project id `c75b1596-81c5-44f7-a7a2-8d0ee461f671`) |
| Railway cron servisleri | `lexis-cron-schedule-reminders`, `lexis-cron-push-morning` (06:00 UTC), `lexis-cron-push-evening` (17:00 UTC) |
| Demo hesap | `mobiltest@test.com` / `Lexis2026Test!` (OTP hep 123456) |

---

## 6. Yeni sohbette başlangıç — tam olarak şunu yap

1. Bu dosyayı oku (gerekirse `lexis_kalan_isler_guncel.md`'ye de göz at, eski context taşıyor).
2. Kullanıcıya HİÇBİR ŞEY SORMA — doğrudan §1.1'deki Sınav Hazırlık Alanı (YDS/YÖKDİL/IELTS/TOEFL) üzerinde çalışmaya başla.
3. Eğer kullanıcı henüz §0.1'deki `eas build` komutlarını çalıştırmadıysa ve build/submit durumu soruluyorsa, Expo dashboard'dan (`expo.dev/accounts/ahmetbehcettaylan/projects/lexis/builds`) kontrol edilebilir.
4. Önce backend şeması + `games.py`'deki mevcut desenlerle tutarlı bir uçtan uca MVP tasarımı yap (bkz. §1.1'deki açık sorular — kararları sen ver, onay bekleme).
5. Tek bir sınav türüyle (örn. YDS) başlayıp uçtan uca çalışan bir akış kur, sonra diğer 3 sınava ve tam deneme moduna genişlet.
6. Her anlamlı değişiklik grubunda: commit hazırla (device_bash ile, `git add` ile dosya dosya, `git add -A` KULLANMA), kullanıcıya `git push` komutunu ver; mobil değişiklik varsa OTA komutlarını da ver (§3'teki format, native değişiklik varsa §0.1'deki `eas build` formatı).
