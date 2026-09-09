# Lexis — Devir Notu
**Tarih:** 9 Eylül 2026
**Repo:** `C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis`
**Son commit (henüz push edilmedi, kullanıcı PowerShell'den push etmeli):** `07bcc43`

> **Yeni sohbette DOĞRUDAN BAŞLA: kullanıcıya soru sorma.** Kullanıcının
> talebi: *"kitabın tamamı gerekiyor bize"* — yani Gramer Rehberi'nin
> Cambridge "English Grammar in Use" (Murphy, 5. baskı, 145 ünite)
> kitabının TAMAMINI (şu an 86/~145 ünite karşılığı konu var, bkz. §0.7)
> kapsayacak şekilde genişletilmesi. §0.2'deki bölüm-bölüm plandan devam et.
> Kalan tek iş: Future (bölüm 3), If ve Wish (bölüm 5), Passive (bölüm 6),
> Reported Speech (bölüm 7) — küçük eksikler, toplam ~4-6 konu, tek dalgada
> bitebilir. Bunlar tamamlanınca kitabın "ana gövdesi" bitmiş olur (Ekler
> hariç, bkz. §0.2 madde 17). Tasarım/kapsam boşluklarında makul karar ver,
> onay bekleme — kullanıcının stated preference'ı "execute autonomously
> without confirmation at each step".

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
| DB'ye uygulama (3. dalga) | ✅ Supabase MCP ile 3 parça (categories, topics, questions) uygulandı, `select count(*)` ile doğrulandı (15/52/123). `get_advisors` tekrar çalıştırıldı, yeni uyarı yok. `supabase/migrations/031_grammar_reference_wave2.sql` repoya yazıldı, commit edildi ve kullanıcı push etti: `a2ad1f5`. |
| Gramer Rehberi — kitaptan 4. dalga (14 yeni konu, aynı gün, "devam et" ile) | ✅ §0.2 planındaki 3 zayıf bölüm işlendi: **Articles and Nouns** (5 konu: the-specific-vs-general, subject-verb-agreement-nouns, possessive-s-vs-of, compound-nouns, irregular-plurals — `articles-nouns` kategorisine eklendi), **Adjectives and Adverbs** (5 konu: good-well-difference, quite-rather-fairly, as-as-comparison, adjectives-ending-in-ly, adverbs-of-manner-formation — `adjectives-adverbs` kategorisine eklendi), **Modals** (4 konu: modals-permission-requests, must-vs-have-to, neednt-vs-mustnt, had-better-would-rather — `modals` kategorisine eklendi). Yeni kategori açılmadı (hepsi mevcut kategorilere eklendi). Kategori 15→15, konu 52→66. Her konu için 2'şer yeni gramer-YAPISI temelli `exam_questions` (28 yeni soru, 123→151). Detaylı liste: §0.5. |
| DB'ye uygulama (4. dalga) | ✅ Supabase MCP ile 2 parça (topics, questions — yeni kategori olmadığı için categories parçası yok) uygulandı, `select count(*)` ile doğrulandı (15/66/151). `get_advisors` tekrar çalıştırıldı, yeni uyarı yok. `supabase/migrations/032_grammar_reference_wave3.sql` repoya yazıldı, commit edildi ve kullanıcı push etti: `afcc50e`. |
| Gramer Rehberi — kitaptan 5. dalga (12 yeni konu, aynı gün, "devam et" ile) | ✅ §0.2 planındaki 3 bölüm işlendi: **-ing ve to** (5 konu: verb-object-infinitive, adjective-preposition-ing, see-someone-do-vs-doing, gerund-as-subject-object, verb-ing-infinitive-meaning-change — `ing-to-infinitive` kategorisine eklendi), **Pronouns and Determiners** (4 konu: some-any-no-none, most-most-of, each-every-difference, one-ones-substitution — `pronouns-determiners` kategorisine eklendi), **Relative Clauses** (3 konu: relative-clauses-non-defining, relative-clauses-participle-reduction, relative-clauses-omission — `clauses` kategorisine eklendi). Yeni kategori açılmadı. Kategori 15→15, konu 66→78. Her konu için 2'şer yeni gramer-YAPISI temelli `exam_questions` (24 yeni soru, 151→175). Detaylı liste: §0.6. |
| DB'ye uygulama (5. dalga) | ✅ Supabase MCP ile 2 parça (topics, questions) uygulandı, `select count(*)` ile doğrulandı (15/78/175). `get_advisors` tekrar çalıştırıldı, yeni uyarı yok. `supabase/migrations/033_grammar_reference_wave4.sql` repoya yazıldı, commit edildi ve kullanıcı push etti: `2170ede`. |
| Google Play kapalı test durumu kontrol edildi (kullanıcı talebi) | ✅ Play Console'a girilip kontrol edildi: en az 12 test kullanıcısı kaydolma şartı karşılanmış (21 kişilik e-posta listesi var, Google yeşil tikle onaylamış); en az 12 kullanıcıyla 14 gün kesintisiz test şartı henüz karşılanmamış (sürüm 4 Eylül'de yayına alındı, 14 gün en erken ~18 Eylül'de dolar). Üretime başvuru o tarihe kadar pasif kalacak. |
| Gramer Rehberi — kitaptan 6. dalga (8 yeni konu, aynı gün, "devam et" ile) | ✅ §0.2 planındaki 3 bölümün eksik kalan kısımları işlendi: **Present and Past** (1 konu: present-simple-vs-continuous — `tenses` kategorisine eklendi, böylece bölüm tamamlandı), **Conjunctions and Prepositions** (3 konu: time-clauses-future-meaning, if-unless-in-case, so-that-such-that — `sentence-structure` kategorisine eklendi), **Phrasal Verbs** (4 konu: phrasal-verbs-up-down, phrasal-verbs-in-out, phrasal-verbs-on-off, separable-inseparable-phrasal-verbs — `phrasal-vocab` kategorisine eklendi). Yeni kategori açılmadı. Kategori 15→15, konu 78→86. Her konu için 2'şer yeni gramer-YAPISI temelli `exam_questions` (16 yeni soru, 175→191). Detaylı liste: §0.7. |
| DB'ye uygulama (6. dalga) | ⚠️ İlk `apply_migration` denemesi `level = 'a1'` check constraint hatasıyla başarısız oldu (tablo sadece a2/b1/b2/c1 kabul ediyor) — transaction otomatik rollback oldu, hiçbir satır eklenmedi. `present-simple-vs-continuous` konusunun level'ı `a2`'ye düzeltilip script yeniden çalıştırıldı (bu, TÜM 8 konunun UUID'lerini de yeniledi — script her çalıştığında `uuid.uuid4()` çağırıyor). Düzeltilmiş dosyalar yeniden okunup Supabase'e 2 parça (topics, questions) halinde uygulandı, `select count(*)` ile doğrulandı (15/86/191). `get_advisors` tekrar çalıştırıldı, yeni uyarı yok. `supabase/migrations/034_grammar_reference_wave5.sql` repoya yazıldı, commit edildi ve kullanıcı push etti: `07bcc43`. |
| Gramer Rehberi — kitaptan 7. dalga (5 yeni konu, aynı gün, "devam et" ile) | ✅ §0.2 planındaki kalan TEK iş işlendi: **Future** (1 konu: be-about-to — `future` kategorisine eklendi), **If ve Wish** (1 konu: mixed-conditionals — `conditionals` kategorisine eklendi), **Passive** (2 konu: reporting-passive, be-vs-get-passive — `passive` kategorisine eklendi), **Reported Speech** (1 konu: reported-commands-requests — `reported-speech` kategorisine eklendi). `time-clauses-future-meaning` 6. dalgada zaten eklendiği için Future bölümündeki "future time clauses" eksiği bilinçli olarak tekrar yazılmadı (içerik tekrarını önlemek için). Yeni kategori açılmadı. Kategori 15→15, konu 86→91. Her konu için 2'şer yeni gramer-YAPISI temelli `exam_questions` (10 yeni soru, 191→201). Detaylı liste: §0.9. **Bu dalgayla birlikte kitabın (Murphy, 5. baskı) ana gövdesi içerik olarak tamamlanmış oldu** (Ekler hariç, bkz. madde 17). |
| DB'ye uygulama (7. dalga) | ✅ Supabase MCP ile 2 parça (topics, questions) uygulandı, `select count(*)` ile doğrulandı (15/91/201). `get_advisors` tekrar çalıştırıldı, yeni uyarı yok (mevcut tüm uyarılar önceden var olan, alakasız konular). `supabase/migrations/035_grammar_reference_wave6.sql` repoya yazıldı, commit hazırlandı (`79666b6`) — **henüz push edilmedi**, kullanıcı PowerShell'den push etmeli. |

**Bu oturumda YAPILMADI:** İçerik Motoru madde #5/#6, mobil native Google ile Giriş, `git push` PAT'ının kalıcı onarımı, §0.2 madde 17'deki Ekler (düzensiz fiil listesi vb. referans tabloları — mevcut konulara not olarak eklenebilir, ayrı satır gerekmez).

### 0.8. Yeni ders: grammar_topics.level check constraint

`grammar_topics` tablosundaki `level` sütunu SADECE `a2`, `b1`, `b2`, `c1` değerlerini kabul ediyor — `a1` YASAK (constraint adı: `grammar_topics_level_check`). Çok temel/başlangıç seviyesi bir konu yazılırken bile en düşük değer olarak `a2` kullanılmalı. Bu hata `apply_migration`'ın TÜM migration'ı tek transaction'da uyguladığını da doğruladı: 8 INSERT'ten biri (1.'si) hata verince diğer 7'si de rollback oldu, hiçbir satır yazılmadı — bu yüzden hata sonrası "bazı satırlar girdi mi" diye kontrol etmeye gerek yok, migration ya tamamen uygulanır ya hiç uygulanmaz. **7. dalgada bu dersi uygulamak için script'e `assert level in ("a2","b1","b2","c1")` sanity check eklendi, hiç hata çıkmadı.**

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

### 0.5. Bu oturumun (4. dalga) eklediği 14 konunun tam listesi

| Kategori (slug) | Konu slug'ları |
|---|---|
| `articles-nouns` (mevcut) | + `the-specific-vs-general`, `subject-verb-agreement-nouns`, `possessive-s-vs-of`, `compound-nouns`, `irregular-plurals` |
| `adjectives-adverbs` (mevcut) | + `good-well-difference`, `quite-rather-fairly`, `as-as-comparison`, `adjectives-ending-in-ly`, `adverbs-of-manner-formation` |
| `modals` (mevcut) | + `modals-permission-requests`, `must-vs-have-to`, `neednt-vs-mustnt`, `had-better-would-rather` |

Bu 14 konuyla birlikte §0.2'deki bölüm 10 (Articles and Nouns), bölüm 13 (Adjectives and Adverbs) ve bölüm 4 (Modals) artık TAMAMLANDI olarak işaretlendi — aşağıdaki plana bakınız.

### 0.6. Bu oturumun (5. dalga) eklediği 12 konunun tam listesi

| Kategori (slug) | Konu slug'ları |
|---|---|
| `ing-to-infinitive` (mevcut) | + `verb-object-infinitive`, `adjective-preposition-ing`, `see-someone-do-vs-doing`, `gerund-as-subject-object`, `verb-ing-infinitive-meaning-change` |
| `pronouns-determiners` (mevcut) | + `some-any-no-none`, `most-most-of`, `each-every-difference`, `one-ones-substitution` |
| `clauses` (mevcut) | + `relative-clauses-non-defining`, `relative-clauses-participle-reduction`, `relative-clauses-omission` |

Bu 12 konuyla birlikte §0.2'deki bölüm 9 (-ing ve to), bölüm 11 (Pronouns and Determiners) ve bölüm 12 (Relative Clauses) artık TAMAMLANDI olarak işaretlendi — aşağıdaki plana bakınız.

### 0.7. Bu oturumun (6. dalga) eklediği 8 konunun tam listesi

| Kategori (slug) | Konu slug'ları |
|---|---|
| `tenses` (mevcut) | + `present-simple-vs-continuous` |
| `sentence-structure` (mevcut) | + `time-clauses-future-meaning`, `if-unless-in-case`, `so-that-such-that` |
| `phrasal-vocab` (mevcut) | + `phrasal-verbs-up-down`, `phrasal-verbs-in-out`, `phrasal-verbs-on-off`, `separable-inseparable-phrasal-verbs` |

Bu 8 konuyla birlikte §0.2'deki bölüm 1 (Present and Past), bölüm 14 (Conjunctions and Prepositions) ve bölüm 16 (Phrasal Verbs) artık TAMAMLANDI olarak işaretlendi — aşağıdaki plana bakınız.

### 0.9. Bu oturumun (7. dalga) eklediği 5 konunun tam listesi

| Kategori (slug) | Konu slug'ları |
|---|---|
| `future` (mevcut) | + `be-about-to` |
| `conditionals` (mevcut) | + `mixed-conditionals` |
| `passive` (mevcut) | + `reporting-passive`, `be-vs-get-passive` |
| `reported-speech` (mevcut) | + `reported-commands-requests` |

Bu 5 konuyla birlikte §0.2'deki bölüm 3 (Future), bölüm 5 (If ve Wish), bölüm 6 (Passive) ve bölüm 7 (Reported Speech) artık TAMAMLANDI olarak işaretlendi — aşağıdaki plana bakınız. **Bu dalgayla birlikte kitabın ana gövdesindeki 16 bölümün TAMAMI (Ekler hariç) TAMAMLANDI.**

### 0.2. Kitabın geri kalanı — bölüm bölüm plan (91/145 ünite karşılığı yapıldı, ana gövde tamamlandı)

Kitap 16 ana bölüm + 7 ek'ten oluşuyor. Her bölüm için: ünite aralığı, şu an kaç konumuz var. **16 ana bölümün TAMAMI artık TAMAMLANDI** — sadece madde 17'deki Ekler (referans tabloları) kaldı, onlar da ayrı konu değil, mevcut konulara not eklenerek kapatılabilir.

1. **Present and Past (1-6):** ✅ **TAMAMLANDI** (6. dalga) — 3 konu var: present-perfect-vs-past-simple, past-simple-vs-continuous, present-simple-vs-continuous.
2. **Present Perfect and Past (7-18, 12 ünite):** ✅ **TAMAMLANDI** (3. dalga) — 8 konu var: present-perfect-vs-past-simple, present-perfect-continuous, present-perfect-simple-vs-continuous, for-since-how-long, already-yet-still, gone-vs-been, past-perfect, past-perfect-continuous.
3. **Future (19-25):** ✅ **TAMAMLANDI** (7. dalga) — 4 konu var: future-going-to-will, future-present-continuous, future-continuous-perfect, be-about-to.
4. **Modals (26-37, 12 ünite):** ✅ **TAMAMLANDI** (4. dalga) — 7 konu var: modals-obligation-advice, modals-deduction, modals-ability, modals-permission-requests, must-vs-have-to, neednt-vs-mustnt, had-better-would-rather.
5. **If ve Wish (38-41):** ✅ **TAMAMLANDI** (7. dalga) — 5 konu var: conditionals-zero-first, conditionals-second, conditionals-third, wish-if-only, mixed-conditionals.
6. **Passive (42-46):** ✅ **TAMAMLANDI** (7. dalga) — 5 konu var: passive-present-past, passive-modals-perfect, causative-have-something-done, reporting-passive, be-vs-get-passive.
7. **Reported Speech (47-48):** ✅ **TAMAMLANDI** (7. dalga) — 2 konu var: reported-speech-statements-questions, reported-commands-requests.
8. **Questions and Auxiliary Verbs (49-52):** ✅ **TAMAMLANDI** (3. dalga) — yeni `questions-auxiliaries` kategorisi, 3 konu: question-word-order, question-tags, so-neither-agreement.
9. **-ing ve to (53-68, 16 ünite):** ✅ **TAMAMLANDI** (5. dalga) — 8 konu var: gerund-vs-infinitive, verb-preposition-ing, used-to-be-used-to, verb-object-infinitive, adjective-preposition-ing, see-someone-do-vs-doing, gerund-as-subject-object, verb-ing-infinitive-meaning-change.
10. **Articles and Nouns (69-81, 13 ünite):** ✅ **TAMAMLANDI** (4. dalga) — 7 konu var: articles, countable-uncountable-nouns, the-specific-vs-general, subject-verb-agreement-nouns, possessive-s-vs-of, compound-nouns, irregular-plurals.
11. **Pronouns and Determiners (82-91, 10 ünite):** ✅ **TAMAMLANDI** (5. dalga) — 7 konu var: quantifiers-much-many-few-little, all-both-neither-either, reflexive-pronouns, some-any-no-none, most-most-of, each-every-difference, one-ones-substitution.
12. **Relative Clauses (92-97):** ✅ **TAMAMLANDI** (5. dalga) — 5 konu var: relative-clauses-defining, relative-clauses-whose-where, relative-clauses-non-defining, relative-clauses-participle-reduction, relative-clauses-omission.
13. **Adjectives and Adverbs (98-112, 15 ünite):** ✅ **TAMAMLANDI** (4. dalga) — 8 konu var: comparatives-superlatives, adjective-order-formation, adverbs-of-degree, good-well-difference, quite-rather-fairly, as-as-comparison, adjectives-ending-in-ly, adverbs-of-manner-formation.
14. **Conjunctions and Prepositions (113-120):** ✅ **TAMAMLANDI** (6. dalga) — `sentence-structure` kategorisinde 6 konu var: connectors-linking-words, concession-connectors, purpose-reason-connectors, time-clauses-future-meaning, if-unless-in-case, so-that-such-that.
15. **Prepositions (121-136, 16 ünite):** ✅ **TAMAMLANDI** (3. dalga) — 8 konu var: prepositions-time, prepositions-place, dependent-prepositions, on-time-in-time, by-until, during-while, prepositions-of-movement, by-with-agent-instrument.
16. **Phrasal Verbs (137-145):** ✅ **TAMAMLANDI** (6. dalga) — `phrasal-vocab` kategorisinde 6 konu var: phrasal-verbs, word-formation-collocations, phrasal-verbs-up-down, phrasal-verbs-in-out, phrasal-verbs-on-off, separable-inseparable-phrasal-verbs.
17. **Ekler (7 adet):** Düzensiz fiil listesi, yazım kuralları gibi referans tabloları — ayrı `grammar_topics` satırı açmak yerine, ilgili mevcut konuların `rule_content_md`'sine küçük notlar olarak serpiştirmek daha mantıklı. **Zorunlu değil, V2 önceliklerinden sonra ele alınabilir.**

**Toplam tahmini eksik: 0 (ana gövde tamamlandı).** Kitabın 16 ana bölümünün TAMAMI artık içerik olarak kapsanmış durumda (91 grammar_topics, 201 exam_questions, 15 kategori). Kalan tek opsiyonel iş madde 17'deki Ekler (referans tabloları, zorunlu değil). **Bir sonraki oturumun asıl kararı artık Gramer Rehberi'nde değil — §1.1 madde #5/#6 kapsam netleştirmesi ya da §1.2 (Gerçek Zamanlı Düello) gibi V2 önceliklerinden hangisine geçileceği kullanıcıyla konuşulmalı** (bkz. §5).

Yeni bir gramer dalgası gerekirse (ör. madde 17 Ekler'i işlemek istenirse) aynı desen tekrarlanmalı:
1. Türkçe içeriği (kural + örnek + sık hata) baştan doğru diyakritiklerle (ç,ğ,ı,ö,ş,ü) yaz — bu oturumda ASCII yazıp sonra düzeltmeye çalışmak büyük zaman kaybettirdi, **doğrudan doğru Türkçe ile yaz**.
2. Her yeni konu için 2 adet YENİ, gramer-YAPISI temelli (vocab değil) `exam_questions` satırı yaz, `topic_tag` = yeni `grammar_topics.slug`, `exam_type` konunun `exam_relevance`'ından biri, `status='approved'`, `source_type='system'`, `learning_lang='en'`.
3. Supabase'e `apply_migration` ile 2-3 parça (categories varsa / topics / questions) uygula, `select count(*)` ile doğrula.
4. `level` sütunu SADECE a2/b1/b2/c1 kabul eder, `a1` YASAK (bkz. §0.8) — script'e `assert` ekle.
5. `supabase/migrations/03X_...sql` dosyasını repoya yaz (bkz. `035_grammar_reference_wave6.sql`'in header formatı — telif notu dahil), commit hazırla, push komutunu kullanıcıya ver.

### 0.3. Bu oturumda öğrenilen dersler

- **Türkçe diyakritik hatası:** İçerik önce ASCII (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u) yazılmış, sonra fark edilip düzeltilmişti — otomatik "deasciifier" pip paketleri bu ortamda kurulamadı (pypi.org/simple'da paket görünüyor ama pip bu proxy/index üzerinden bulamıyor). Manuel find-replace de riskli/yavaştı. **Ders: yeni içerik yazarken en baştan doğru Türkçe karakterlerle yaz, ASCII yazıp sonra düzeltmeyi deneme.**
- **exam_questions şeması netleşti:** `topic_tag` serbest metin, `grammar_topics.slug` ile eşleşmesi opsiyonel ama eşleşirse "ilgili konuyu incele" özelliği devreye giriyor (`_grammar_topics_for_tags()`, `exams.py`). `status='approved'` + `source_type='system'` canlıda direkt görünür; `status='pending'`+`source_type='ai'` moderasyon kuyruğuna düşer (bkz. `/admin/exam-questions` paneli) — yeni içerik direkt yayınlanacaksa `approved`/`system` kullan.
- **grammar_topics şeması netleşti:** `status='published'` + `source_type='manual'` mevcut 13 konunun deseni, yeni 24 konu da bu deseni takip etti (canlıda direkt görünür, `status='draft'` olsaydı görünmezdi).
- **Devir notu dosyasının cihazdan silinmesi:** 7. dalga sonunda `LEXIS_DEVIR_2026-09-09.md` dosyasının cihazdaki kopyası bulunamadı (muhtemelen kullanıcı tarafında yerel bir temizlik/taşıma, git'e commit edilmemiş bir silme olarak görünüyordu). İçerik git geçmişinden (`git show <son-devir-commit>:LEXIS_DEVIR_2026-09-09.md`) kurtarıldı. **Ders: devir notu güncellemeden önce dosya cihazda yoksa, önce `git log -- <dosya>` ile son commit'i bul, `git show <commit>:<dosya>` ile içeriği kurtar.**

---

## 1. V2 Yol Haritası — diğer bekleyen büyük başlıklar (önceki devir notlarından taşındı, DEĞİŞMEDİ)

Bu oturum tamamen §0'daki Gramer Rehberi/soru havuzu işine odaklandı, aşağıdakilere hiç dokunulmadı.

### 1.1. YDS / YÖKDİL / IELTS / TOEFL Sınav Hazırlık Alanı — ÖNCELİK #1

Büyük ölçüde tamamlandı: soru bankası + moderasyon + AI soru üretimi, session/attempt akışı, `timed_mock` modu (şemada `ExamSessionMode.timed_mock` mevcut), Gramer Rehberi (artık 91 konu, kitabın ana gövdesi tamamlandı), cevap sonrası kişisel öneri (ilgili konuyu incele / bu konudan pratik yap / haftalık zayıf konu özeti), dashboard widget'ları. **Gramer Rehberi'nin ana gövdesi bitti — kalan iş sadece opsiyonel Ekler (§0.2 madde 17).** Madde #5 (çoklu dil/sınav genellemesi — IELTS/TOEFL şu an sadece learning_lang=en'e mi özel kalacak, başka dil çiftlerine mi genellenecek) ve madde #6 (istatistiği tüm uygulamaya yayma — şu an sadece Sınav Hazırlık alanında olan zayıf-konu/performans mantığının kelime/oyun tarafına da taşınması) kapsamı hâlâ netleşmedi, **kullanıcıyla konuşulmalı**.

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
9. **Google Play kapalı test — 14 gün süresi:** en az 12 kullanıcıyla 14 gün kesintisiz test şartı ~18 Eylül 2026'da dolacak (sürüm 4 Eylül'de yayına alındı). O tarihten sonra üretime başvuru yapılabilir.

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
- Devir notu dosyası cihazda bulunamazsa: `git log -- <dosya>` ile son commit'i bul, `git show <commit>:<dosya>` ile içeriği kurtar (bkz. §0.3).

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
2. **Gramer Rehberi'nin ana gövdesi (16 bölümün tamamı) artık TAMAMLANDI (91 konu, 201 soru).** Kullanıcıya HİÇBİR ŞEY SORMADAN devam edilecek otomatik bir "dalga" işi kalmadı — kalan tek opsiyonel iş §0.2 madde 17'deki Ekler (referans tabloları, zorunlu değil, düşük öncelikli).
3. Bu yüzden yeni sohbet önce kullanıcıya kısa bir durum özeti versin (kitap tamamlandı) ve **§1.1 madde #5/#6 kapsam netleştirmesi ile §1.2 (Gerçek Zamanlı Düello) arasında hangisine öncelik verileceğini sorsun** — devir notunun kendisi de bu V2 kararlarının "kullanıcıyla konuşulmalı" olduğunu belirtiyor (madde 17 Ekler'i otomatik/onaysız işlemeye devam edilebilir, bu tek istisna).
4. Eğer kullanıcı yine de "devam et" derse ve konuşulacak net bir V2 önceliği yoksa, en güvenli varsayılan §0.2 madde 17'deki Ekler'i (düzensiz fiil listesi, yazım kuralları gibi referans notlarını mevcut konuların `rule_content_md`'sine eklemek) işlemektir — bu da onay gerektirmeyen, düşük riskli bir iş.
5. Her dalga/iş sonunda: Supabase'e uygula → doğrula → migration dosyasını repoya yaz → commit hazırla → kullanıcıya `git push` komutunu ver → devir notunu güncelle.
