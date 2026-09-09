# Lexis — Devir Notu
**Tarih:** 9 Eylül 2026
**Repo:** `C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis`
**Son commit (henüz push edilmedi, kullanıcı PowerShell'den push etmeli):** `a2ad1f5`

> **Yeni sohbette DOĞRUDAN BAŞLA: kullanıcıya soru sorma.** Kullanıcının
> talebi: *"kitabın tamamı gerekiyor bize"* — yani Gramer Rehberi'nin
> Cambridge "English Grammar in Use" (Murphy, 5. baskı, 145 ünite)
> kitabının TAMAMINI (şu an 52/~145 ünite karşılığı konu var, bkz. §0.4)
> kapsayacak şekilde genişletilmesi. §0.2'deki bölüm-bölüm plandan devam et.
> Tasarım/kapsam boşluklarında makul karar ver, onay bekleme — kullanıcının
> stated preference'ı "execute autonomously without confirmation at each
> step".

---

## 0. Bu oturumda tamamlananlar (9 Eylül 2026, tekrar yapılmasın)

| Konu | Durum |
|---|---|
| Apple/Google giriş "buton görünmüyor/pasif" şikayeti | ✅ Kullanıcı sayfayı yenileyince kendiliğinden düzeldi — muhtemelen eski cache'li sayfa görüntüleniyordu, kod tarafında ek işlem gerekmedi. |
| İki bekleyen commit push edildi | ✅ `7a8fe76` (Apple/Google reklam engelleyici toleransı) + `e1829f8` (İçerik Motoru madde #3a/#3b/#3c) kullanıcı kendi PowerShell'inden push etti: `a6df6ae..e1829f8`. |
| Gramer Rehberi — kitaptan 2. dalga (24 yeni konu) | ✅ Kullanıcı Murphy'nin PDF'ini tekrar yükledi. Kitabın SADECE ünite/konu başlık yapısından (telife konu olmayan standart terminoloji) esinlenerek, kural açıklaması/örnekler/sık hatalar %100 özgün yazıldı — kitaptan tek cümle kopyalanmadı. 5 yeni kategori (future, ing-to-infinitive, pronouns-determiners, adjectives-adverbs, prepositions) + 24 yeni `grammar_topics` satırı. Kategori 9→14, konu 13→37. Detaylı liste: §0.3. |
| Sınav soru sayısı artırıldı (kullanıcı talebi: *"sınav soru sayısı az, bunu artır"*) | ✅ Mevcut 45 soru tamamen KELİME/vocab ağırlıklıydı, gramer yapısını hiç test etmiyordu. 48 yeni soru eklendi — bunlar dilbilgisi YAPISI (tenses/conditionals/passive/relative clauses/prepositions vb.) test ediyor ve yukarıdaki 24 yeni konunun `slug`'larıyla `topic_tag` olarak birebir eşleşiyor (önceki oturumda "connectors-linking-words" dışında hiçbir soru gerçek bir gramer konusuna eşleşmiyordu — bu boşluk artık 25 etiket için kapandı). Toplam soru 45→93, hepsi `status='approved'`. |
| DB'ye uygulama | ✅ Supabase MCP (`mcp__Supabase__apply_migration`, proje `mrxeuxscyztpiuagsumh`) ile 3 parça halinde (categories, topics, questions) uygulandı ve `select count(*)` ile doğrulandı. `supabase/migrations/030_grammar_reference_expansion.sql` dosyası repoya yazılıp commit edildi (`d6595f2`), kullanıcı push etti. |
| Security advisors kontrolü | ✅ `get_advisors` çalıştırıldı — bu değişikliklerle ilgili yeni bir güvenlik uyarısı yok (mevcut tüm uyarılar önceden var olan, alakasız konular: RLS policy eksikliği 3 tabloda, security definer view, vb.). |
| Gramer Rehberi — kitaptan 3. dalga (15 yeni konu, aynı gün, devam sohbeti) | ✅ Kullanıcının "buradan başlayalım" onayıyla §0.2 planındaki en zayıf 3 bölüm işlendi: **Present Perfect and Past** (7 konu: present-perfect-continuous, present-perfect-simple-vs-continuous, for-since-how-long, already-yet-still, gone-vs-been, past-perfect, past-perfect-continuous — `tenses` kategorisine eklendi), **Questions and Auxiliary Verbs** (3 konu: question-word-order, question-tags, so-neither-agreement — yeni `questions-auxiliaries` kategorisi açıldı), **Prepositions** (5 konu: on-time-in-time, by-until, during-while, prepositions-of-movement, by-with-agent-instrument — `prepositions` kategorisine eklendi). Bu üç bölümün §0.2'deki "eksik" listeleri artık tamamen kapandı. Kategori 14→15, konu 37→52. Her konu için 2'şer yeni gramer-YAPISI temelli `exam_questions` (30 yeni soru, 93→123), hepsi `topic_tag` = yeni `grammar_topics.slug` ile birebir eşleşiyor. Detaylı liste: §0.4. |
| DB'ye uygulama (3. dalga) | ✅ Supabase MCP ile 3 parça (categories, topics, questions) uygulandı, `select count(*)` ile doğrulandı (15/52/123). `get_advisors` tekrar çalıştırıldı, yeni uyarı yok. `supabase/migrations/031_grammar_reference_wave2.sql` repoya yazıldı, commit hazırlandı (`a2ad1f5`) — **henüz push edilmedi**, kullanıcı PowerShell'den push etmeli. |

**Bu oturumda YAPILMADI:** Gramer Rehberi'nin geri kalanı (kitabın ~93 ünitesi daha var, bkz. §0.2), İçerik Motoru madde #5/#6, mobil native Google ile Giriş, `git push` PAT'ının kalıcı onarımı.

### 0.1. Yeni eklenen 24 konunun tam listesi (tekrar yazmamak için)

| Kategori (slug) | Konu slug'ları |
|---|---|
| `future` (yeni) | `future-going-to-will`, `future-present-continuous`, `future-continuous-perfect` |
| `ing-to-infinitive` (yeni) | `gerund-vs-infinitive`, `verb-preposition-ing`, `used-to-be-used-to` |
| `pronouns-determiners` (yeni) | `quantifiers-much-many-few-little`, `all-both-neither-either`, `reflexive-pronouns` |
| `adjectives-adverbs` (yeni) | `comparatives-superlatives`, `adjective-order-formation`, `adverbs-of-degree` |
| `prepositions` (yeni) | `prepositions-time`, `prepositions-place`, `dependent-prepositions` |
| `conditionals` (mevcut) | + `conditionals-third`, `wish-if-only` |
| `passive` (mevcut) | + `passive-modals-perfect`, `causative-have-something-done` |
| `modals` (mevcut) | + `modals-ability` |
| `clauses` (mevcut) | + `relative-clauses-whose-where` |
| `articles-nouns` (mevcut) | + `countable-uncountable-nouns` |
| `sentence-structure` (mevcut) | + `concession-connectors`, `purpose-reason-connectors` |

**Önceden var olan 13 konu (dokunulmadı):** `tenses`: `present-perfect-vs-past-simple`, `past-simple-vs-continuous` · `passive`: `passive-present-past` · `conditionals`: `conditionals-zero-first`, `conditionals-second` · `modals`: `modals-obligation-advice`, `modals-deduction` · `clauses`: `relative-clauses-defining` · `articles-nouns`: `articles` · `reported-speech`: `reported-speech-statements-questions` · `phrasal-vocab`: `phrasal-verbs`, `word-formation-collocations` · `sentence-structure`: `connectors-linking-words`.

Yeni sohbette bir üniteyi/konsepti kapsamadan önce **mutlaka bu tabloyu (ya da canlı `select slug from grammar_topics`) kontrol et** — tekrar yazma riski var.

### 0.4. Bu oturumun (3. dalga) eklediği 15 konunun tam listesi

| Kategori (slug) | Konu slug'ları |
|---|---|
| `tenses` (mevcut) | + `present-perfect-continuous`, `present-perfect-simple-vs-continuous`, `for-since-how-long`, `already-yet-still`, `gone-vs-been`, `past-perfect`, `past-perfect-continuous` |
| `questions-auxiliaries` (yeni) | `question-word-order`, `question-tags`, `so-neither-agreement` |
| `prepositions` (mevcut) | + `on-time-in-time`, `by-until`, `during-while`, `prepositions-of-movement`, `by-with-agent-instrument` |

Bu 15 konuyla birlikte §0.2'deki bölüm 2 (Present Perfect and Past), bölüm 8 (Questions and Auxiliary Verbs) ve bölüm 15 (Prepositions) artık TAMAMLANDI olarak işaretlendi — aşağıdaki plana bakınız.

### 0.2. Kitabın geri kalanı — bölüm bölüm plan (52/145 ünite karşılığı yapıldı)

Kitap 16 ana bölüm + 7 ek'ten oluşuyor. Her bölüm için: ünite aralığı, şu an kaç konumuz var, ne eksik, kaba tahmini kaç konu daha gerekiyor. **Bu tahminler bağlayıcı değil** — yeni sohbet gerçek ünite listesini PDF'ten (kullanıcı zaten yükledi, uploads dizininde arşivlenmiş olabilir, gerekirse tekrar istenebilir) teyit ederek ilerlemeli, sadece kitabın ünite BAŞLIKLARINI kullanmalı (telif nedeniyle örnek/alıştırma içeriği ASLA kopyalanmayacak — bkz. üstteki telif notu, bu kural değişmez).

1. **Present and Past (1-6):** 2 konu var. Eksik: present simple vs continuous, past continuous vs simple. ~2 konu.
2. **Present Perfect and Past (7-18, 12 ünite):** ✅ **TAMAMLANDI** (3. dalga) — 8 konu var: present-perfect-vs-past-simple, present-perfect-continuous, present-perfect-simple-vs-continuous, for-since-how-long, already-yet-still, gone-vs-been, past-perfect, past-perfect-continuous.
3. **Future (19-25):** 3 konu var, iyi durumda. Eksik: future time clauses (when/before/after + present), be about to. ~1-2 konu.
4. **Modals (26-37, 12 ünite):** 3 konu var. Eksik: permission/requests (can/could/may), must vs have to, needn't vs mustn't, had better/would rather. ~4-5 konu.
5. **If ve Wish (38-41):** 4 konu var, iyi durumda. Eksik: mixed conditionals. ~1 konu.
6. **Passive (42-46):** 3 konu var. Eksik: reporting passive (it is said that...), be vs get passive. ~1-2 konu.
7. **Reported Speech (47-48):** 1 konu var. Eksik: reported commands/requests. ~1 konu.
8. **Questions and Auxiliary Verbs (49-52):** ✅ **TAMAMLANDI** (3. dalga) — yeni `questions-auxiliaries` kategorisi, 3 konu: question-word-order, question-tags, so-neither-agreement.
9. **-ing ve to (53-68, 16 ünite):** 3 konu var, bölüm geniş. Eksik: verb+object+infinitive (want sb to do), preposition+-ing (sıfatlardan sonra), -ing clauses, see sb do/doing farkı. ~4-5 konu.
10. **Articles and Nouns (69-81, 13 ünite):** 2 konu var. Eksik: a/an vs the, singular/plural uyumu, possessive 's vs of, compound nouns. ~5 konu.
11. **Pronouns and Determiners (82-91, 10 ünite):** 3 konu var. Eksik: some/any/no/none, most/most of genişletmesi. ~3-4 konu.
12. **Relative Clauses (92-97):** 2 konu var. Eksik: non-defining relative clauses, -ing/-ed clause indirgeme. ~3 konu.
13. **Adjectives and Adverbs (98-112, 15 ünite):** 3 konu var. Eksik: good/well farkı, quite/rather/fairly, as...as genişletmesi. ~5 konu.
14. **Conjunctions and Prepositions (113-120):** 2 konu var (`sentence-structure` kategorisinde) — bu bölüm `prepositions` kategorisinden AYRI, henüz işlenmedi. Eksik: zaman cümlecikleri (when/while/as), if/unless/in case. ~3 konu.
15. **Prepositions (121-136, 16 ünite):** ✅ **TAMAMLANDI** (3. dalga) — 8 konu var: prepositions-time, prepositions-place, dependent-prepositions, on-time-in-time, by-until, during-while, prepositions-of-movement, by-with-agent-instrument.
16. **Phrasal Verbs (137-145):** 2 konu var (`phrasal-vocab` kategorisinde). Eksik: up/down, in/out, on/off anlam grupları. ~3-4 konu.
17. **Ekler (7 adet):** Düzensiz fiil listesi, yazım kuralları gibi referans tabloları — ayrı `grammar_topics` satırı açmak yerine, ilgili mevcut konuların `rule_content_md`'sine küçük notlar olarak serpiştirmek daha mantıklı.

**Toplam tahmini eksik: ~30-35 konu** (52'den ~85-90'a çıkar). Sıradaki dalga için önerilen en zayıf 3 bölüm: **Articles and Nouns** (~5 konu), **Adjectives and Adverbs** (~5 konu), **Modals** veya **-ing ve to** (~4-5'er konu). Tek oturumda bitirilecek iş değil — 2-3 bölüm/dalga halinde ilerlenmeli. Her dalgada aynı desen tekrarlanmalı:
1. Türkçe içeriği (kural + örnek + sık hata) baştan doğru diyakritiklerle (ç,ğ,ı,ö,ş,ü) yaz — bu oturumda ASCII yazıp sonra düzeltmeye çalışmak büyük zaman kaybettirdi, **doğrudan doğru Türkçe ile yaz**.
2. Her yeni konu için 2 adet YENİ, gramer-YAPISI temelli (vocab değil) `exam_questions` satırı yaz, `topic_tag` = yeni `grammar_topics.slug`, `exam_type` konunun `exam_relevance`'ından biri, `status='approved'`, `source_type='system'`, `learning_lang='en'`.
3. Supabase'e `apply_migration` ile 3 parça (categories varsa / topics / questions) uygula, `select count(*)` ile doğrula.
4. `supabase/migrations/03X_...sql` dosyasını repoya yaz (bkz. `030_grammar_reference_expansion.sql`'in header formatı — telif notu dahil), commit hazırla, push komutunu kullanıcıya ver.

### 0.3. Bu oturumda öğrenilen dersler

- **Türkçe diyakritik hatası:** İçerik önce ASCII (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u) yazılmış, sonra fark edilip düzeltilmişti — otomatik "deasciifier" pip paketleri bu ortamda kurulamadı (pypi.org/simple'da paket görünüyor ama pip bu proxy/index üzerinden bulamıyor). Manuel find-replace de riskli/yavaştı. **Ders: yeni içerik yazarken en baştan doğru Türkçe karakterlerle yaz, ASCII yazıp sonra düzeltmeyi deneme.**
- **exam_questions şeması netleşti:** `topic_tag` serbest metin, `grammar_topics.slug` ile eşleşmesi opsiyonel ama eşleşirse "ilgili konuyu incele" özelliği devreye giriyor (`_grammar_topics_for_tags()`, `exams.py`). `status='approved'` + `source_type='system'` canlıda direkt görünür; `status='pending'`+`source_type='ai'` moderasyon kuyruğuna düşer (bkz. `/admin/exam-questions` paneli) — yeni içerik direkt yayınlanacaksa `approved`/`system` kullan.
- **grammar_topics şeması netleşti:** `status='published'` + `source_type='manual'` mevcut 13 konunun deseni, yeni 24 konu da bu deseni takip etti (canlıda direkt görünür, `status='draft'` olsaydı görünmezdi).

---

## 1. V2 Yol Haritası — diğer bekleyen büyük başlıklar (önceki devir notlarından taşındı, DEĞİŞMEDİ)

Bu oturum tamamen §0'daki Gramer Rehberi/soru havuzu işine odaklandı, aşağıdakilere hiç dokunulmadı.

### 1.1. YDS / YÖKDİL / IELTS / TOEFL Sınav Hazırlık Alanı — ÖNCELİK #1

Büyük ölçüde tamamlandı: soru bankası + moderasyon + AI soru üretimi, session/attempt akışı, `timed_mock` modu (şemada `ExamSessionMode.timed_mock` mevcut), Gramer Rehberi (artık 37 konu), cevap sonrası kişisel öneri (ilgili konuyu incele / bu konudan pratik yap / haftalık zayıf konu özeti), dashboard widget'ları. **Kalan iş sadece §0.2'deki kitabın geri kalanı.** Madde #5 (çoklu dil/sınav genellemesi — IELTS/TOEFL şu an sadece learning_lang=en'e mi özel kalacak, başka dil çiftlerine mi genellenecek) ve madde #6 (istatistiği tüm uygulamaya yayma — şu an sadece Sınav Hazırlık alanında olan zayıf-konu/performans mantığının kelime/oyun tarafına da taşınması) kapsamı hâlâ netleşmedi, kullanıcıyla konuşulmalı.

### 1.2. Gerçek Zamanlı Düello — ÖNCELİK #2

- Anlık eşleşmeli, canlı kelime düellosu (Kahoot tarzı). **Backend'de websocket/realtime altyapısı yok, sıfırdan inşa gerekiyor** (Supabase Realtime channels önerilir).
- Genişletilmiş vizyon (kullanıcının kendi tarifi): özel/uluslararası grup+lig sistemi, ilk 3 üst lige çıkar/son 3 alt lige düşer, Duolingo tarzı görev haritası + ilerleme görselleştirmesi, kurumlara özel ligler (B2B potansiyeli). Bu bölüm kullanıcı tarafından "çok önemli" olarak vurgulandı.

### 1.3. Referans / Davet Programı — ÖNCELİK #3

- Arkadaşını davet et → ikinize de X gün premium. Mevcut social.py altyapısı üzerine oturur.

### 1.4. Yeni Diller — ÖNCELİK #4

- Kesinleşen: Korece (ko), Çince (zh). Ek öneri: Hollandaca (nl), Azerice (az), Farsça (fa).

### 1.5. Kurumsal / Dershane (B2B) Paketi — ÖNCELİK #5

- YDS/YÖKDİL öğrenci kitlesine toplu lisans satışı. Hedef segment + 5 adımlı outreach önceki oturumda hazırlandı.

### Şimdilik ertelenenler
- Telaffuz/dinleme pratiği, ana ekran widget'ı (mobil).

---

## 2. Açık / takip edilmemiş konular

1. **`git push` PAT'ı kalıcı olarak onarılmadı** — her oturumda `device_bash`'ten push "Invalid username or token" ile başarısız oluyor, kullanıcı kendi PowerShell'inden (tarayıcı auth ile) push ediyor. Kalıcı çözüm: GitHub'da yeni bir repo-scope PAT üretip origin remote URL'ini güncellemek — bunu kullanıcıya önerip yapmasını istemek bir sonraki oturumun ilk işi olabilir (tekrar tekrar aynı sürtünmeyi yaşamamak için).
2. **AB Trader Status (DSA)** — App Store Connect/Play Console'daki beyan hâlâ kontrol edilmedi; vergi dairesi onayına bağlı (bkz. §5).
3. **Paid Apps Agreement (App Store Connect)** — durumu "New", imzalanmamış; vergi dairesi onayına bağlı.
4. **`schedule-reminders.yml` / `daily-word-email.yml` GitHub Actions** — Railway native cron'larla yedekli hale geldi ama kaldırılmadı.
5. **iOS OTA:** App Store'a submit edilen STORE build #10 (runtimeVersion 1.0.1), Sınav Hazırlık banner'ı gibi sonraki commit'lerin JS'ini içermiyor — Apple review'dan geçince `eas update --branch production --platform ios` gerekiyor.
6. **Android production build:** Play Console'daki tek production build hâlâ eski runtimeVersion'da (1.0.0/versionCode 7) — yeni `eas build --profile production --platform android` + submit gerekiyor, yoksa OTA dahil hiçbir güncelleme Play Store'daki uygulamaya yansımaz.
7. **AdSense (web sidebar) kararı** — GVK mükerrer 20/B istisnası kapsamına girmiyor, vergi dairesi sonucu netleşince değerlendirilecek.
8. **Vergi dairesi istisna dilekçesi** (işlem no 1dmtmujj741x4u, Küçükköy VD) — sonucu bekleniyor; §2.2/2.3/2.7'nin hepsi buna bağlı.

---

## 3. Ortam / çalışma şekli — değişmeyen kurallar (önceki devir notlarından)

- Bağlı klasör: `$HOME/mnt/lexis` = `C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis`.
- **`git add -A` KULLANMA** — CRLF/LF gürültüsü riski (büyük ölçüde `.gitattributes` ile çözüldü ama yine de dosya dosya `git add` güvenli alışkanlık).
- **`git push` bu ortamdan çalışmıyor** — commit'i hazırla, push komutunu kullanıcıya ver.
- **`eas credentials` interaktif/TTY, device_bash'ten çalışmıyor** — Expo web paneli kullan.
- Backend push → Railway otomatik deploy; Web push → Vercel otomatik deploy.
- Supabase MCP (`mcp__Supabase__*`, `project_id: mrxeuxscyztpiuagsumh`) canlı DB'ye doğrudan erişim.
- Hassas dosya silme gerekirse `device_request_delete_permission` iste (bu oturumda `.git/index.lock` temizliği için kullanıldı ve çalıştı) ya da `_to_delete/` alt klasörüne taşı.
- Gramer/soru içeriği SQL'i büyükse `apply_migration`'ı mantıklı parçalara böl (categories / topics / questions gibi) — tek seferde 150+ satırlık SQL de çalışıyor ama parçalamak hata ayıklamayı kolaylaştırıyor.

---

## 4. Kimlikler / sabitler

| | |
|---|---|
| Bundle ID | `app.lexis.mobile` |
| EAS project ID | `06c954fe-baae-4671-a38f-8d053d954fad` |
| ASC App ID | `6806612758` |
| Backend | `https://lexis-production-6a53.up.railway.app` |
| Supabase project_id | `mrxeuxscyztpiuagsumh` |
| Firebase project | `lexis-291d9` |
| Railway project | `determined-recreation` / `production` |
| Demo hesap | `mobiltest@test.com` / `Lexis2026Test!` (OTP hep 123456) |

---

## 5. Yeni sohbette başlangıç — tam olarak şunu yap

1. Bu dosyayı oku.
2. Kullanıcıya HİÇBİR ŞEY SORMA — doğrudan §0.2'deki plandan bir sonraki dalgayı seç (Present Perfect, Questions/Auxiliaries, Prepositions bölümleri 3. dalgada TAMAMLANDI; sıradaki öneri: Articles and Nouns, Adjectives and Adverbs, Modals) ve yazmaya başla.
3. Yeni içerik yazarken Türkçe diyakritikleri baştan doğru yaz (§0.3'teki ders).
4. Her dalga sonunda: Supabase'e uygula → doğrula → migration dosyasını repoya yaz → commit hazırla → kullanıcıya `git push` komutunu ver.
5. Birkaç dalga sonunda (kitabın tamamına yaklaşınca) kullanıcıya durumu özetle; kitap tamamlanınca §1.1'deki madde #5/#6 kapsam netleştirmesine veya §1.2 (Gerçek Zamanlı Düello) gibi bir sonraki V2 önceliğine geçilebilir.
