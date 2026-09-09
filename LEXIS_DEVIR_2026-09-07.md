# Lexis — Devir Notu
**Tarih:** 7 Eylül 2026
**Repo:** `C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis`
**Son commit (push edildi, origin/main ile senkron):** `5a24481`

> **Yeni sohbette DOĞRUDAN BAŞLA: kullanıcıya soru sorma.** Aşağıdaki §1'de V2
> önceliği #1 olan "Sınav Hazırlık Alanı" (YDS/YÖKDİL/IELTS/TOEFL) üzerinde
> çalışmaya başla. Tasarım kararlarında boşluk varsa (§1.1'de işaretli) makul
> bir karar ver ve ilerle — kullanıcının stated preference'ı "execute
> autonomously without confirmation at each step". Geri kalan bölümler bağlam
> ve tekrar iş/hata yapmamak içindir.

---

## 0. Bu oturumda tamamlananlar (tekrar yapılmasın)

| Konu | Durum |
|---|---|
| Günlük "günün kelimesi" maili + sabah 09:00 push'un hiç gelmemesi | ✅ Kök neden bulundu: `daily-word-email.yml` ve `push-reminders.yml` **hiç çalışmamış** (0 run) — secret'lar/YAML doğruydu ama GitHub Actions'ın tam saat başı (06:00/17:00 UTC) yoğunluk gecikmesi/atlaması şüpheleniliyor (GitHub'ın kendi dokümantasyonu bunu doğruluyor). Cron'lar 5 dk kaydırıldı (`5 6 * * *` / `5 17 * * *`). **Yarın sabah 09:05 TR'de `cron_job_runs` tablosundan veya GitHub Actions run geçmişinden gerçekten çalışıp çalışmadığı kontrol edilmeli** — hâlâ 0 run ise başka bir teşhis adımına geçilecek (bkz. §2). |
| V2 yol haritası kaydı | ✅ `lexis_kalan_isler_guncel.md` dosyasının sonuna "V2 Yol Haritası" bölümü eklendi (aşağıda §1'de tam haliyle tekrar var, oradan da okunabilir). |
| Bug: oyunlarda doğru bilinen kelimeler kelime hazinesine eklenmiyordu | ✅ `backend/app/api/routes/games.py` içine `_sync_word_progress()` eklendi; `submit_attempt` ve `guess_letter` artık her denemeden sonra `words` tablosunu güncelliyor — "own" havuzunda her deneme spaced-repetition durumunu senkronize ediyor, "general" havuzunda sadece DOĞRU bilinen kelimeler otomatik hazineye ekleniyor. İstatistikler `words` tablosundan okunduğu için otomatik düzeldi. |
| Bug: flashcard'larda hazine boşken "Harika iş!" yazması | ✅ Mobil (`flashcards.tsx`) ve web (`flashcards/page.tsx`) düzeltildi — artık dürüst bir "henüz kelimen yok" ekranı + kelime ekle butonu var. 10 dilin tamamında yeni `noWordsYetTitle`/`noWordsYetSubtitle` string'leri eklendi (`mobile/src/i18n/translations.json`, `web/src/lib/i18n.tsx`). |
| Bug: tanım-kelime eşleştirme açıklaması "İngilizce tanım" diyordu | ✅ `general_word_pool.definition`'ın 10 dilin TAMAMI için dolu olduğu doğrulandı (her `source_lang` için 2727/2727 satır) — `dirDefinitionToWordDesc` metni dil-nötr hale getirildi ("Tanımı gör, doğru kelimeyi seç...", `mobile/src/i18n/gameStrings.ts` + `web/src/app/(app)/game/page.tsx`, 10 dil). Backend'deki aynı varsayımla yazılmış kod yorumları/hata mesajı da güncellendi. |
| Bug: ana ekranda XP/seviye göstergesi güncellenmiyordu | ✅ `mobile/src/components/DashboardHeader.tsx` — `['xp']` react-query sorgusu hiçbir yerde tazelenmiyordu (sadece ilk mount). Kendi `useFocusEffect`'i eklendi (dashboard.tsx/flashcards.tsx'teki yerleşik desenle aynı) — artık sekmeye her dönüşte XP + özet istatistikler yeniden çekiliyor. |
| Git push | ✅ Yapıldı — repo `origin/main` ile senkron. |
| Mobil OTA yayını | ✅ `eas update --branch production --platform ios` VE `--platform android` ayrı ayrı çalıştırıldı, ikisi de başarıyla yayınlandı (runtime version 1.0.0, production kanalı). Uygulaması zaten yüklü kullanıcılar bir sonraki açılışta otomatik alır — store'a yeni build gerekmedi. **NOT:** `--platform` tek değer alıyor (`android`/`ios`/`all`), comma-separated desteklemiyor; `all` verilirse web export'u da dener ve `react-native-google-mobile-ads` paketi web'de patlar (`AdBanner.tsx` üzerinden `dashboard.tsx`'e import ediliyor) — bilinen sorun, web hiç kullanılmıyor, her zaman `ios` ve `android` ayrı ayrı çalıştır. |

---

## 1. ŞİMDİ YAPILACAK — V2 Yol Haritası (öncelik sırası, kullanıcı onaylı)

Bu bölüm `lexis_kalan_isler_guncel.md`'deki "V2 Yol Haritası" başlığıyla birebir aynı — referans için burada da tam haliyle duruyor.

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
- **Önemli tespit (bu oturumdan önce doğrulandı):** Bu sistem şu an MEVCUT DEĞİL. Backend'de websocket/realtime altyapısı yok (`challenge_service.py` sadece asenkron/turn-based). Sıfırdan inşa edilmesi gerekiyor.
- Önerilen yaklaşım: Supabase Realtime channels (zaten Supabase kullanıldığı için en düşük maliyetli entegrasyon yolu).

### 1.3. Referans / Davet Programı — ÖNCELİK #3

- Arkadaşını davet et → ikinize de X gün premium.
- Mevcut sosyal altyapı (follow/friends sistemi, `backend/app/api/routes/social.py`) üzerine kolayca oturur.

### 1.4. Yeni Diller — ÖNCELİK #4

- Kesinleşen: Korece (ko), Çince (zh) — Duolingo 2025 Türkiye Dil Raporu'na göre Türkiye'de en hızlı büyüyen diller.
- Ek öneriler (veri destekli): Hollandaca (nl) — Türk diasporası 3. sırada (~500K); Azerice (az), Farsça (fa) — düşük maliyetli/stratejik ek seçenekler.
- Teknik olarak: `languages` tablosuna satır eklemek + `general_word_pool`'a o dil çiftleri için seed (mevcut seed script deseni, `backend/seed_general_word_pool.py`) + mobil/web i18n dosyalarına yeni dil bloğu eklemek gerekiyor (10 dilin tamamında tekrarlanan `translations.json` / `i18n.tsx` / `gameStrings.ts` deseni — bu oturumda bu dosyalara çokça dokunuldu, format aşina).

### 1.5. Kurumsal / Dershane (B2B) Paketi — ÖNCELİK #5

- YDS/YÖKDİL öğrenci kitlesi göz önüne alınırsa dershanelere toplu lisans satışı yeni bir B2B gelir kanalı olabilir.
- Hedef segment kategorileri ve 5 adımlı outreach yaklaşımı önceki oturumda hazırlandı (dershaneler, üniversite hazırlık okulları, kurumsal dil eğitimi veren şirketler) — detay `lexis_kalan_isler_guncel.md`'de yok, sohbet geçmişinde kaldı; kullanıcı isterse somut isim bazlı hedef listesi/pilot outreach e-postası tekrar hazırlanabilir.

### Şimdilik ertelenenler (v2 kapsamı dışında)
- Telaffuz / dinleme pratiği
- Ana ekran widget'ı (mobil)

---

## 2. Açık / takip edilmemiş konular (önceki oturumlardan, hâlâ kontrol edilmedi)

Bunlar V2'den önce acil değil ama unutulmamalı — kullanıcı sorarsa veya sırası gelirse hatırlat:

1. **AB Trader Status (DSA uyum beyanı)** — App Store Connect → Business bölümü ve Play Console'daki eşdeğer beyan. 4 Eylül'de "hiç kontrol edilmedi" olarak not düşülmüştü, bu oturumda da tekrar kontrol edilmedi. Doldurulmamışsa AB'de dağıtım engellenebilir. **Karar kullanıcının** (Individual/trader durumu hukuki bir belirleme) — Claude sadece nereye gidileceğini gösterebilir.
2. **App Store / Play Store inceleme durumu** — 4 Eylül'de "Waiting for Review" / "İncelemede" idi, bu oturumda güncel durum kontrol edilmedi. Kullanıcının "Android onayı tamamlanınca..." ifadesinden (6 Eylül) anlaşılan: 6 Eylül itibarıyla Android onayı henüz tamamlanmamıştı. Yeni sohbette fırsat olursa (ör. kullanıcı sorarsa) Play Console / App Store Connect'ten güncel durum kontrol edilebilir.

---

## 3. Ortam / çalışma şekli — bu oturumda doğrulanan kurallar

- **`device_bash` bu oturumda MEVCUT ve çalışıyor** (4 Eylül notundaki "device_bash yok" artık geçerli değil — o zamandan beri kullanıcı bağlantısı değişmiş olmalı). Kullanıcının Windows makinesi, bağlı klasör `$HOME/mnt/lexis` = `C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis`.
- İki iş akışı: (a) `device_stage_files` → Read/Edit (cloud sandbox'ta `/mnt/user-data/uploads/lexis/...`) → `SendUserFile` → `device_commit_files` — **düzenledikten sonra MUTLAKA SendUserFile+device_commit_files ile geri gönderilmeli, yoksa cihazdaki dosya değişmez** (bu oturumda bir kez unutuldu, `git status` boş çıkınca fark edildi). (b) Doğrudan `device_bash` içinde `python3 - <<'EOF' ... EOF` veya `sed`/heredoc ile dosya yazmak — özellikle `.github/workflows/*.yml` için ZORUNLU (`device_commit_files` bu yolu "protected" diye reddediyor).
- **`git add -A` KESİNLİKLE kullanılmasın.** Repo genelinde CRLF/LF satır sonu farkından kaynaklanan yaygın "modified" gürültüsü var (gerçek içerik değişikliği değil). Her zaman değiştirilen dosyaların TAM YOLUNU tek tek `git add` et.
- Not: bu oturumda bilerek düzenlenen dosyalarda bile commit diff'i beklenenden büyük çıkabiliyor (satır sonu normalizasyonu) — bu normal, endişelenme, `git add` ile scope zaten doğru dosyalara sınırlı olduğu sürece sorun yok.
- **`.git/index.lock` hatası çıkarsa:** `mcp__remote-devices__device_request_delete_permission` ile klasöre silme izni iste, sonra `rm -f .git/index.lock`.
- **`git push` bu ortamdan YAPILAMIYOR** — repodaki kayıtlı GitHub remote URL'sinde eski/geçersiz bir Personal Access Token var, push artık tarayıcı tabanlı kimlik doğrulama istiyor. Commit'leri hazırla, sonra kullanıcıya `git push` komutunu ver, kendisi PowerShell'de çalıştırsın. **Bu token değerini bir daha asla yazma/echo etme.**
- **Mobil (JS/TS) değişiklikleri store build'ine otomatik yansımaz.** Proje EAS Update (OTA) için kurulu (`expo-updates`, `eas.json`'da "production" kanalı, `app.json`'da `runtimeVersion.policy: "appVersion"` = mevcut sürüm "1.0.0"). Native kod/config değişmeyen (yani her zamanki JS/TS bugfix/feature) her değişiklik grubu sonunda kullanıcıya şu komutu ver (ayrı ayrı, `all`/comma-separated DEĞİL — §0'daki nota bak):
  ```
  eas update --branch production --platform android --message "..."
  eas update --branch production --platform ios --message "..."
  ```
  Native modül eklenmiş/native config değişmişse (örn. yeni bir native paket) OTA yetmez, yeni bir `eas build` + store submission gerekir.
- Backend (`backend/`) → GitHub push sonrası Railway otomatik deploy ediyor. Web (`web/`) → push sonrası Vercel otomatik deploy ediyor. İkisi de kullanıcının kendi `git push`'una bağlı.
- Supabase MCP araçlarıyla (`mcp__Supabase__*`) canlı DB'ye doğrudan erişim var — `project_id: mrxeuxscyztpiuagsumh`. Şema/veri değişiklikleri git push'tan BAĞIMSIZ, anında canlıya uygulanıyor (`apply_migration`, `execute_sql`).
- Chrome browser automation (`mcp__claude-in-chrome__*`) kullanıcının gerçek, giriş yapılmış Chrome oturumuna bağlanıyor — GitHub Actions run geçmişi gibi web arayüzünden kontrol gereken şeyler için kullanılabilir (bu oturumda mail/push teşhisinde kullanıldı).

---

## 4. Mimari referans notları

- **`general_word_pool`** (27.270 satır, 10 dilin birbiriyle tüm 90 sıralı kombinasyonu × 303 kelime): `source_lang`=öğrenilen dil, `target_lang`=çeviri/ana dil, `word`/`example`/`definition` source_lang'da, `meaning` target_lang'da. `definition` alanı artık 10 dilin TAMAMI için dolu (bu oturumda doğrulandı).
- **`daily_word_content`** (55 satır, sadece en/tr + ar/tr): `target_lang`=öğrenilen dil, `native_lang`=ana dil — **`general_word_pool` ile isimlendirme yönü TERS** (`general_word_pool.source_lang` ≈ `daily_word_content.target_lang`). Yeni kod yazarken bu karışıklığa dikkat.
- **`words`** (kullanıcının kişisel kelime hazinesi): `user_id, word, meaning(=native dil), meaning_native, meaning_target, example, source_lang(=öğrenilen dil), target_lang(=ana dil), status(learning/learned), repetition_count, ease_factor, interval_days, next_review_at`. Spaced repetition: `backend/app/services/spaced_repetition.py::calculate_next_review(word_dict, success)`.
- **`games.py`** (`backend/app/api/routes/games.py`): `pool_source` ("own"/"general") × `mode` (multiple_choice/wordle/typing/matching/listening/sprint) × `direction` (word_to_meaning/meaning_to_word/definition_to_word) matrisini yönetir. XP kuralı "İlk Doğru Deneme" (4 Eylül) — bir kelime için sunucunun gördüğü ilk deneme değilse XP verilmez (`_prior_attempt_count`). 7 Eylül'de eklenen `_sync_word_progress()` — her attempt sonrası `words` tablosunu günceller/oluşturur, YENİ bir sınav/oyun alanı eklenirken bu fonksiyon örnek alınabilir.
- **`xp_service.py`**: `XP_AMOUNTS` sabiti + `award_xp(user_id, source_type, source_id)` — yeni bir XP kaynağı eklerken (örn. sınav sorusu) buraya yeni bir `source_type` eklenir.
- **i18n dosyaları** (her biri 10 dili aynı sırada tutar: tr, en, ar, ru, de, fr, es, it, ja, pt): `mobile/src/i18n/translations.json` (genel), `mobile/src/i18n/gameStrings.ts` (oyun ekranı), `web/src/lib/i18n.tsx` (genel), `web/src/app/(app)/game/page.tsx` (oyun ekranı — web'de kendi inline kopyası var, ortak dosyadan gelmiyor). Yeni bir sınav hazırlık alanı için muhtemelen yeni bir `examStrings.ts`/benzer dosya gerekecek, aynı 10-dil deseniyle.
- **Mobil route yapısı**: `mobile/src/app/(app)/*.tsx` = expo-router sayfaları (dashboard, game, quiz, flashcards, words, stats, ...). Yeni "Sınav Hazırlık" alanı muhtemelen yeni bir route grubu olarak eklenecek (örn. `(app)/exam-prep.tsx` veya alt route'larla `(app)/exam/`).

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
| Demo hesap | `mobiltest@test.com` / `Lexis2026Test!` (OTP hep 123456) |

---

## 6. Yeni sohbette başlangıç — tam olarak şunu yap

1. Bu dosyayı ve `lexis_kalan_isler_guncel.md` dosyasını oku (ikincisi V2 dışında da eski context taşıyor, gerekirse göz at).
2. Kullanıcıya HİÇBİR ŞEY SORMA — doğrudan §1.1'deki Sınav Hazırlık Alanı (YDS/YÖKDİL/IELTS/TOEFL) üzerinde çalışmaya başla.
3. Önce backend şeması + `games.py`'deki mevcut desenlerle tutarlı bir uçtan uca MVP tasarımı yap (bkz. §1.1'deki açık sorular — kararları sen ver, kullanıcı stated preference'ı gereği onay bekleme).
4. Tek bir sınav türüyle (örn. YDS) başlayıp uçtan uca çalışan bir akış kur, sonra diğer 3 sınava ve tam deneme moduna genişlet.
5. Her anlamlı değişiklik grubunda: commit hazırla (device_bash ile, `git add` ile dosya dosya), kullanıcıya `git push` komutunu ver; mobil değişiklik varsa OTA komutlarını da ver (§3'teki format).
