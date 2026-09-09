# Lexis — Devir Notu
**Tarih:** 9 Eylül 2026
**Repo:** `C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis`
**Son commit (henüz push edilmedi, kullanıcı PowerShell'den push etmeli):** `6dd4f93`

> **Yeni sohbette DOĞRUDAN BAŞLA: kullanıcıya soru sorma.** Gramer Rehberi
> (içerik+UI) TAMAMLANDI. Kullanıcı V2 Yol Haritası için 4 net karar verdi
> (bkz. §6 başı): (1) Sınav Hazırlık alanı dil kısıtı GENELLEŞTİRİLECEK —
> **madde #5 bu oturumda backend'de yapıldı** (bkz. §0.13); (2) zayıf-konu
> istatistiği kelime/oyun tarafına da taşınacak (**madde #6 — Faz 2, henüz
> YAPILMADI**, plan: §6.2); (3) Gerçek Zamanlı Düello, lig/terfi-düşme,
> görev haritası ve B2B kurumsal ligler TEK bir genişletilmiş vizyon olarak
> inşa edilecek (**Faz 3, henüz YAPILMADI**, plan: §6.3); (4) bunlar
> bitince Referans Programı + B2B paket + SADECE Korece/Çince dilleri
> eklenecek (**Faz 4, henüz YAPILMADI**, plan: §6.4). **Yeni sohbet
> kullanıcıya soru sormadan Faz 2'ye (madde #6) başlasın** — kapsam zaten
> netleşti, §6.2'deki plan izlenmeli. Faz 3 çok büyük olduğu için önce
> §6.3'teki alt-fazlara (3a→3f) bölünmüş plan okunmalı, 3a (şema tasarımı)
> ile başlanmalı. Tasarım/kapsam boşluklarında makul karar ver, onay
> bekleme — kullanıcının stated preference'ı "execute autonomously without
> confirmation at each step".

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
| DB'ye uygulama (7. dalga) | ✅ Supabase MCP ile 2 parça (topics, questions) uygulandı, `select count(*)` ile doğrulandı (15/91/201). `get_advisors` tekrar çalıştırıldı, yeni uyarı yok (mevcut tüm uyarılar önceden var olan, alakasız konular). `supabase/migrations/035_grammar_reference_wave6.sql` repoya yazıldı, commit edildi ve kullanıcı push etti: `79666b6`. |
| Madde 17 (Ekler) + eksik pratik soruları (kullanıcı talebi: *"madde 17 yapılsın"* + *"bu konu için henüz pratik sorusu eklenmedi ibaresi... soruları biz mi ekleyeceğiz siz mi"*) | ✅ İki iş birlikte yapıldı. (1) **Madde 17:** kitaptaki Eklerin sadece genel/standart başlıklarından (düzensiz fiiller, -ing/-ed yazım kuralları, kısaltmalar, fiil+edat/sıfat+edat kalıpları, AmE/BrE farkları, noktalama) esinlenerek 7 adet özgün referans notu, ayrı `grammar_topics` satırı açılmadan ilgili 7 mevcut konunun `rule_content_md` alanına `UPDATE ... || ` ile eklendi. (2) **Eksik sorular:** `select topic_tag, count(*)` ile hiç `exam_questions`'ı olmayan 12 eski konu (2. dalgadan önce eklenmiş: articles, relative-clauses-defining, conditionals-zero-first, conditionals-second, modals-obligation-advice, modals-deduction, passive-present-past, phrasal-verbs, word-formation-collocations, reported-speech-statements-questions, present-perfect-vs-past-simple, past-simple-vs-continuous) tespit edildi, her birine 2'şer özgün gramer-YAPISI sorusu yazıldı (24 yeni soru). Artık TÜM 91 konunun en az 1 pratik sorusu var (doğrulandı: `topics_without_q = 0`). Konu 91→91 (değişmedi), soru 201→225. `supabase/migrations/036_grammar_reference_wave7_appendices_and_missing_questions.sql` repoya yazıldı, commit edildi ve kullanıcı push etti: `9a2ab62`. |
| Gramer Rehberi sayfasını "harita" UI'ına dönüştürme + Sınav Hazırlık Alanı kart iyileştirmesi (kullanıcı talebi: ekran görüntüleriyle birlikte, düz liste kullanıcı dostu değil, "hangi konuya ne zaman çalışacağımı karıştırmadan" gezinebileceğim tematik/ilerlemeli bir harita + "Gramer Rehberi"/"Soru Öner" linklerinin görselinin diğer kartlarla tutarlı olması istendi) | ✅ `web/src/app/(app)/exam-grammar/page.tsx` tamamen yeniden yazıldı: 15 kategori (bölüm), dolambaçlı bir "yol" üzerinde alternatif sola/sağa hizalanmış durak (nod) olarak gösteriliyor — her durak kategoriye özel bir ikon taşıyor (ör. Zamanlar→Clock, Modal Fiiller→ShieldCheck), 3 görsel duruma sahip (hiç bakılmamış/gri, kısmen/mavi, tamamlanmış/dolu mavi+yeşil tik). Bir durağa dokununca altındaki konular akordeon olarak açılıyor (framer-motion), bir konuya dokununca mevcut `/exam-grammar/[slug]` detay sayfasına gidiliyor. Üstte genel ilerleme çubuğu ("X / 91 konu incelendi", %). **İlerleme takibi:** backend'de kullanıcı bazlı bir grammar-progress tablosu olmadığı için bilinçli olarak hafif tutuldu — yeni `web/src/lib/grammarProgress.ts` dosyası, sadece tarayıcıda (localStorage) "hangi konu slug'larına bakıldığını" tutuyor; `exam-grammar/[slug]/page.tsx`'e konu yüklenince işaretleyen bir `useEffect` eklendi. `exam-prep/page.tsx`'teki select-type ekranının altındaki "Gramer Rehberi" ve "Soru Öner" düz metin linkleri, sayfadaki diğer kartlarla (ikon kutusu + başlık + açıklama) aynı görsel dile sahip iki karta dönüştürüldü. |
| Frontend değişikliklerinin doğrulanması | ✅ `npx tsc --noEmit` ve `npx eslint` değişen 4 dosyada (`exam-grammar/page.tsx`, `exam-grammar/[slug]/page.tsx`, `exam-prep/page.tsx`, `lib/grammarProgress.ts`) çalıştırıldı. İlk denemede yeni eklenen kodun effect içinde senkron `setState` çağırdığı için `react-hooks/set-state-in-effect` eslint hatası çıktı — `useState`+`useEffect` yerine `useSyncExternalStore` tabanlı `useVisitedTopics()` hook'una geçilerek düzeltildi (bkz. §0.12), sonrasında hem tsc hem eslint temiz. `next build` bu Linux sandbox'ta (device_bash) SWC native binary eksikliği + ağ erişimi olmadığı için denenemedi — gerçek Windows geliştirme ortamında derlenmesi bekleniyor, **kullanıcının kendi makinesinde `npm run build` ile bir kez doğrulaması önerilir**. `git status` sırasında repoda `LEXIS_DEVIR_2026-09-03/04/07/08.md`, iki `.png` ve `lexis_kalan_isler_guncel.md` dosyalarının yerelde silinmiş (commit edilmemiş) olduğu fark edildi — bunlara dokunulmadı, muhtemelen kullanıcının kendi tarafında bir temizlik. `web/src/app/(app)/exam-grammar/page.tsx`, `[slug]/page.tsx`, `exam-prep/page.tsx`, `web/src/lib/grammarProgress.ts` repoya yazıldı, commit edildi ve kullanıcı push etti: `4e3441c`. |
| **V2 Yol Haritası — kullanıcı 4 net karar verdi** (madde #5 genelleştirilecek, madde #6 kelime/oyuna taşınacak, Düello+Lig+Görev Haritası+B2B TEK vizyon olarak inşa edilecek, kalan V2 maddeleri bunlardan sonra + SADECE Korece/Çince) | ✅ Kod tabanı keşfedildi: `exams.py`/`grammar.py` gate mantığı, `exam_questions`/`grammar_topics`'in zaten `learning_lang` sütunu taşıdığı (çok-dil için şema hazır) görüldü, `languages` tablosunda 10 dil olduğu (ko/zh henüz yok) doğrulandı, lig/düello için yeniden kullanılabilecek mevcut tablolar (`challenges` boş, `friendships`, `follows`, `social_posts`, `badges`/`user_badges`, `subscriptions`) incelendi. Sonuç: fazlı bir mühendislik planı yazıldı (bkz. §6). |
| **Madde #5 — Sınav Hazırlık alanı dil kısıtı genelleştirildi (Faz 1)** | ✅ `exams.py::_exam_area_enabled` ve `grammar.py::_grammar_area_enabled` artık `native_lang=='tr' and learning_lang=='en'` diye SABİT kontrol etmiyor — bunun yerine hangi `learning_lang` için ONAYLI içerik VARSA (yeni `_exam_content_learning_langs()` / `_grammar_content_learning_langs()` fonksiyonları, `exam_questions`/`grammar_topics` tablolarından canlı sorgulanıyor) o kullanıcılara açık. `native_lang` kısıtı TAMAMEN kaldırıldı — artık Türkçe olmayan ana dilli ama İngilizce öğrenen kullanıcılar da Sınav Hazırlık/Gramer Rehberi'ni görebilir. Ayrıca `list_exam_types`, `next_question`, `practice_questions_by_topic`, `list_topics`, `get_topic` sorgularına eksik olan `learning_lang` filtresi eklendi (öncesinde bu sorgular `learning_lang` filtrelemiyordu — bugün tüm içerik `en` olduğu için sorun yaratmıyordu ama ileride başka bir dile içerik eklenince bir kullanıcının başka dildeki soruları görmesi riski vardı, bu risk kapatıldı). Hata mesajlarından "ana dili Türkçe olan" ibaresi kaldırıldı. **İçerik hâlâ sadece `learning_lang='en'` için dolu** (Türkçe açıklamalı) — bu SADECE mimari/kapı (gate) genellemesi, yeni dil için soru/konu İÇERİĞİ eklenmedi (bu Faz 4'ün işi, bkz. §6.4). Detay: §0.13. `backend/app/api/routes/exams.py` + `backend/app/api/routes/grammar.py` repoya yazıldı, commit edildi: `6dd4f93`. DB migration'ı YOK — şema zaten `learning_lang` sütununu taşıyordu, sadece kod değişti. |

**Bu oturumda YAPILMADI:** Madde #6 (istatistik kelime/oyuna taşıma — Faz 2, plan hazır ama kod yazılmadı), Gerçek Zamanlı Düello + Lig + Görev Haritası + B2B (Faz 3 — sadece plan yazıldı), Korece/Çince ekleme (Faz 4 — sadece plan yazıldı), mobil native Google ile Giriş, `git push` PAT'ının kalıcı onarımı, mobile tarafında Gramer Rehberi harita UI'ının uygulanması, kullanıcının kendi makinesinde gerçek `npm run build` ile son doğrulama.

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

### 0.10. Madde 17 (Ekler) — hangi konuya ne eklendiğinin tam listesi

| Konu slug'ı (kategori) | Eklenen Ek notu |
|---|---|
| `present-perfect-vs-past-simple` (tenses) | Düzensiz Fiiller (Irregular Verbs) — ~50 fiilin V1-V2-V3 hali |
| `question-tags` (questions-auxiliaries) | Kısaltılmış Yapılar (Contractions) — I'm, don't, won't, isn't vb. |
| `present-simple-vs-continuous` (tenses) | Fiile -ing Eklenirken Yazım Kuralları |
| `past-simple-vs-continuous` (tenses) | Düzenli Fiillere -ed Eklenirken Yazım Kuralları |
| `dependent-prepositions` (prepositions) | Sık Kullanılan Fiil + Edat ve Sıfat + Edat Kalıpları |
| `word-formation-collocations` (phrasal-vocab) | Amerikan ve İngiliz İngilizcesi Arasındaki Farklar |
| `connectors-linking-words` (sentence-structure) | Temel Noktalama ve Büyük Harf Kuralları |

Bu notlar ayrı `grammar_topics` satırı DEĞİL — ilgili konunun `rule_content_md` alanının SONUNA eklendi (`UPDATE ... SET rule_content_md = rule_content_md || '\n' || '- **EK — ...'`). Yeni sohbet madde 17'yi TEKRAR işlemeye kalkmamalı, yukarıdaki 7 konu zaten kapsıyor.

### 0.11. Eksik pratik sorularının tam listesi (12 konu × 2 soru = 24 soru)

`articles`, `relative-clauses-defining`, `conditionals-zero-first`, `conditionals-second`, `modals-obligation-advice`, `modals-deduction`, `passive-present-past`, `phrasal-verbs`, `word-formation-collocations`, `reported-speech-statements-questions`, `present-perfect-vs-past-simple`, `past-simple-vs-continuous`. Bunlar 2. dalgadan ÖNCE (ilk 13 orijinal konu) eklenmiş, hiç `exam_questions`'ı olmayan konulardı — kullanıcı uygulamada "Bu konu için henüz pratik sorusu eklenmedi" ibaresiyle karşılaşmıştı. **Karar: bu tür eksikler kullanıcı tarafından değil, otomatik olarak Claude tarafından tamamlanır** (aynı 2 soru/konu deseniyle). Yeni sohbet, yeni bir konu eklerken bu deseni unutmamalı: her yeni `grammar_topics` satırı için AYNI migration'da 2 soru da yazılmalı, aksi halde bu tür bir eksik tekrar oluşur.

### 0.12. Gramer Rehberi "harita" UI'ı — teknik notlar ve dersler

- **Dosyalar:** `web/src/app/(app)/exam-grammar/page.tsx` (liste → harita, tam yeniden yazım), `web/src/app/(app)/exam-grammar/[slug]/page.tsx` (küçük ekleme: ziyaret işaretleme), `web/src/app/(app)/exam-prep/page.tsx` (küçük değişiklik: alt linkler → kartlar), `web/src/lib/grammarProgress.ts` (yeni dosya).
- **İlerleme takibi backend'de DEĞİL:** kullanıcı bazlı bir grammar-progress tablosu yok ve bu oturumda bilinçli olarak eklenmedi (kapsamı büyütmemek için) — sadece tarayıcı localStorage'ında (`lexis_grammar_visited_topics_v1` anahtarı, slug dizisi) tutuluyor. Yani kullanıcı farklı bir cihazdan/tarayıcıdan girerse ilerleme sıfırdan başlar. Bu bilinçli bir V1 kararı — istenirse ileride backend'e taşınabilir (yeni bir `user_grammar_progress` tablosu + `/grammar/progress` route'u gerekir).
- **ÖNEMLİ ders — `react-hooks/set-state-in-effect` eslint hatası:** İlerlemeyi `useState` + mount'ta `useEffect` içinde `setState(getVisitedTopics())` ile okumaya çalışmak yeni eslint kuralına takılıyor (effect içinde senkron setState render kaskadı yaratır). **Doğru çözüm: `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` kullanmak** — SSR'da `getServerSnapshot` boş döner (hydration mismatch riski yok), istemcide mount olur olmaz gerçek localStorage değeriyle güvenli senkronize olur. `lib/grammarProgress.ts`'teki `useVisitedTopics()` hook'u bu deseni uyguluyor. **Benzer bir localStorage/harici-store okuma ihtiyacı olursa bu dosyadaki desen örnek alınmalı, `useState`+`useEffect` ile tekrar aynı hataya düşülmemeli.**
- **Doğrulama sınırı:** Bu oturumda kullanılan `device_bash` (kullanıcının Windows makinesindeki Cowork Linux VM'i) `npm run build` çalıştıramadı — SWC'nin linux-x64 native binary'si kurulu değil ve VM'in npmjs.org'a ağ erişimi yok (`getaddrinfo EAI_AGAIN`). `npx tsc --noEmit` ve `npx eslint <değişen dosyalar>` ile doğrulama yapıldı (ikisi de temiz), ama gerçek bir Next.js build/render testi YAPILAMADI. **Yeni sohbet, kullanıcının bir sonraki mesajında (özellikle bu değişiklikler için) `npm run build` çıktısını veya canlıdaki ekran görüntüsünü kontrol etmeli** — sorun bildirilirse önce bu sınırlamayı hatırla.
- **İkon eşlemesi** (kategori slug → lucide-react ikonu, `CATEGORY_ICONS` sabiti, `exam-grammar/page.tsx` içinde): tenses→Clock, passive→RefreshCw, conditionals→GitBranch, modals→ShieldCheck, clauses→Link2, articles-nouns→FileText, reported-speech→MessageCircle, phrasal-vocab→Puzzle, sentence-structure→AlignLeft, future→Rocket, ing-to-infinitive→Type, pronouns-determiners→Users, adjectives-adverbs→Sparkles, prepositions→MapPin, questions-auxiliaries→HelpCircle. Yeni bir kategori açılırsa bu haritaya eklenmezse `BookOpen` fallback ikonu kullanılır (kırılmaz, ama tutarsız görünür) — yeni sohbet yeni kategori açarsa bu listeyi güncellemeyi unutmamalı.

### 0.13. Madde #5 — dil kısıtı genellemesi, teknik notlar

- **Değişen dosyalar:** `backend/app/api/routes/exams.py`, `backend/app/api/routes/grammar.py` — sadece bu iki dosya, DB migration YOK (şema zaten `exam_questions.learning_lang` ve `grammar_topics.learning_lang` sütunlarını taşıyordu, 9 Eylül'den önceki bir tarihte eklenmiş, hiç kullanılmıyordu).
- **Eski mantık:** `_exam_area_enabled`/`_grammar_area_enabled` kullanıcının `profiles.native_lang=='tr'` VE `profiles.learning_lang=='en'` olmasını şart koşuyordu — yani sadece Türkçe ana dilli, İngilizce öğrenen kullanıcılar görebiliyordu.
- **Yeni mantık:** `native_lang` kontrolü TAMAMEN kaldırıldı. Bunun yerine `_exam_content_learning_langs()` (exams.py) ve `_grammar_content_learning_langs()` (grammar.py) fonksiyonları, sırasıyla `exam_questions` (status=approved) ve `grammar_topics` (status=published) tablolarından `DISTINCT learning_lang` çekiyor — kullanıcının `learning_lang`'i bu kümede VARSA alan açık. Bugün bu küme sadece `{'en'}` (tüm içerik İngilizce-öğrenimi için), yani PRATİKTE şu an açılan tek şey: **ana dili Türkçe OLMAYAN ama İngilizce öğrenen kullanıcılar** artık Sınav Hazırlık Alanı'nı ve Gramer Rehberi'ni görebiliyor (önceden göremiyorlardı). İçerik hâlâ Türkçe açıklamalı (`title_tr`, `summary_tr`, `rule_content_md` alan adları) — bu, ana dili Türkçe olmayan bir kullanıcının Türkçe açıklama görmesi anlamına gelir, BİLİNÇLİ bir sınırlama (içerik çeviri işi bu fazın kapsamında değil, gerekirse ayrı bir V2 maddesi olarak ele alınmalı).
- **Yeni bir dil için içerik eklenince ne olur:** İleride (Faz 4, §6.4) `learning_lang='ko'` ile `exam_questions`/`grammar_topics` satırları eklenirse, `_exam_content_learning_langs()`/`_grammar_content_learning_langs()` bunu OTOMATİK olarak görür ve o dili öğrenen kullanıcılara alan otomatik açılır — **kapı fonksiyonlarında kod değişikliği gerekmez**, sadece içerik migration'ı yeterli.
- **Ayrıca düzeltilen bir potansiyel hata:** `list_exam_types`, `next_question`, `practice_questions_by_topic`, `list_topics`, `get_topic` sorguları öncesinde `learning_lang` filtrelemiyordu (sadece `exam_type`/`status`/`is_active`/`slug` filtreliyordu). Bugün tüm içerik `en` olduğu için bu bir hataya yol açmıyordu, ama yeni bir dil eklenince (Faz 4) bu sorgular filtre olmadan YANLIŞ dildeki soru/konuyu kullanıcıya gösterebilirdi. Bu oturumda hepsine `.eq("learning_lang", learning_lang)` eklendi — bir sonraki dil eklendiğinde bu riskin baştan kapatılmış olması için.
- **Test/doğrulama:** Bu oturumda `device_bash`'in Windows/Linux VM ortamında backend testleri çalıştırılamadı (pytest kurulu değil / kontrol edilmedi) — sadece `python3 -m py_compile` ile sözdizimi doğrulandı. **Yeni sohbet ya da kullanıcı, bu değişikliği Railway'e deploy olduktan sonra gerçek bir profilde (`native_lang != 'tr'`, `learning_lang='en'`) `/exams/exam-types` ve `/grammar/topics` endpoint'lerini deneyerek doğrulamalı** — bu oturumda canlı bir API çağrısıyla test edilemedi, sadece kod okunarak doğrulandı.

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
17. **Ekler (7 adet):** ✅ **TAMAMLANDI** — düzensiz fiil listesi, yazım kuralları gibi referans tabloları, ayrı `grammar_topics` satırı açılmadan ilgili 7 mevcut konunun `rule_content_md`'sine eklendi. Detaylı liste: §0.10.

**Toplam tahmini eksik: 0 (ana gövde VE Ekler tamamlandı).** Kitabın 16 ana bölümü + madde 17 Ekler TAMAMEN içerik olarak kapsanmış durumda (91 grammar_topics, 225 exam_questions — TÜM konularda en az 1 soru var, 15 kategori). Gramer Rehberi içerik tarafında artık YAPILACAK bilinen bir iş kalmadı. UI tarafı da harita görünümüne dönüştürüldü (bkz. §0.11, §0.12). **Bir sonraki oturumun asıl kararı artık Gramer Rehberi'nde değil — §1.1 madde #5/#6 kapsam netleştirmesi ya da §1.2 (Gerçek Zamanlı Düello) gibi V2 önceliklerinden hangisine geçileceği kullanıcıyla konuşulmalı** (bkz. §5).

Gramer Rehberi'ne yeni içerik eklemek gerekirse (ör. kullanıcı yeni bir konu/soru isterse) aynı desen tekrarlanmalı:
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

Bu oturumda kullanıcı 4 net V2 kararı verdi (bkz. §6 başı) ve madde #5 (§1.1) uygulandı — diğer maddelere kod olarak dokunulmadı, sadece §6'da fazlı bir plan yazıldı.

### 1.1. YDS / YÖKDİL / IELTS / TOEFL Sınav Hazırlık Alanı — ÖNCELİK #1

Büyük ölçüde tamamlandı: soru bankası + moderasyon + AI soru üretimi, session/attempt akışı, `timed_mock` modu (şemada `ExamSessionMode.timed_mock` mevcut), Gramer Rehberi (91 konu, kitabın ana gövdesi + Ekler tamamlandı), cevap sonrası kişisel öneri (ilgili konuyu incele / bu konudan pratik yap / haftalık zayıf konu özeti), dashboard widget'ları.

**Madde #5 — KARARLAŞTIRILDI ve UYGULANDI (9 Eylül 2026, bu oturum):** kullanıcı "genelleştirilecek" dedi. Backend'de `_exam_area_enabled`/`_grammar_area_enabled` artık `native_lang=='tr'` şartını aramıyor, hangi `learning_lang` için içerik varsa o açık (bkz. §0.13, §6.1). Ek dil İÇERİĞİ eklenmedi, sadece kapı/mimari genellendi.

**Madde #6 — KARARLAŞTIRILDI ama HENÜZ KODLANMADI:** kullanıcı "kelime/oyun tarafına da taşınacak" dedi. Şu an sadece `exams.py::weak_topics` var (exam_attempts + exam_questions.topic_tag üzerinden). Kelime (words/quiz_results) ve oyun (game_sessions/game_attempts) tarafı için benzer bir "zayıf alan" istatistiği YOK — bu **Faz 2**'nin işi, somut plan: §6.2.

### 1.2. Gerçek Zamanlı Düello — ÖNCELİK #2

- Anlık eşleşmeli, canlı kelime düellosu (Kahoot tarzı). **Backend'de websocket/realtime altyapısı yok, sıfırdan inşa gerekiyor** (Supabase Realtime channels önerilir).
- Genişletilmiş vizyon (kullanıcının kendi tarifi): özel/uluslararası grup+lig sistemi, ilk 3 üst lige çıkar/son 3 alt lige düşer, Duolingo tarzı görev haritası + ilerleme görselleştirmesi, kurumlara özel ligler (B2B potansiyeli). Bu bölüm kullanıcı tarafından "çok önemli" olarak vurgulandı.
- **KARAR (9 Eylül 2026, kullanıcı):** genişletilmiş vizyon AŞAMALI/MVP-önce DEĞİL, düello ile BİRLİKTE TEK seferde inşa edilecek — "Burada Genişletilmiş vizyon direk uygulanacak, Kahoot tarzı düello ile birlikte burayı yap." Yani düello + lig/terfi-düşme + görev haritası + B2B kurumsal ligler tek bir **Faz 3** olarak ele alınıyor (kod olarak henüz başlanmadı — kapsam çok büyük olduğu için önce alt-fazlara bölünmüş bir mühendislik planı yazıldı, bkz. §6.3). Yeni sohbet Faz 3'e girmeden önce §6.3'ü baştan sona okumalı.

### 1.3. Referans / Davet Programı — ÖNCELİK #3

- Arkadaşını davet et → ikinize de X gün premium. Mevcut social.py altyapısı üzerine oturur.

### 1.4. Yeni Diller — ÖNCELİK #4

- **KARAR (9 Eylül 2026, kullanıcı):** SADECE Korece (ko) ve Çince (zh) eklenecek. Önceki oturumlarda öneri olarak geçen Hollandaca (nl), Azerice (az), Farsça (fa) kullanıcı tarafından AÇIKÇA REDDEDİLDİ — "Diğer dillere gerek yok." Yeni sohbet bu üç dili (nl/az/fa) bir daha önermemeli/eklememeli.
- **Sıralama kararı (kullanıcı):** Bu madde (ve §1.3 Referans/Davet Programı, §1.5 B2B Paket) ancak madde #5 (bitti), madde #6 (Faz 2) ve Gerçek Zamanlı Düello+Lig+B2B-lig (Faz 3) TAMAMLANDIKTAN SONRA ele alınacak — "V2 de kalan diğer maddeleri ... bu üç madde yapılınca yapacağız." Yani şu an bu maddeye kod olarak BAŞLANMAMALI, sadece plan hazır tutulmalı (bkz. §6.4).

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
5. **iOS OTA / Apple-Google ile Giriş / Sınav Hazırlık durumu — 9 Eylül 2026 (bu oturum sonu) netleştirildi, kullanıcı sordu:**
   - **Apple ile Giriş (native, mobile):** kod `ff5c8ce` commit'inde (8 Eylül 21:19) eklendi. Bu commit hem STORE build #9'un (buildVersion 9, commit `ee016b5`, 8 Eylül 22:38'de App Store'a gönderildi) hem STORE build #10'un (buildVersion 10, runtimeVersion 1.0.1, commit `6cbb70f`, 9 Eylül 06:22'de gönderildi) ATASI — yani App Store'a gönderilen HER İKİ build'de de zaten VAR (`git merge-base --is-ancestor` ile doğrulandı). Kullanıcının cihazında görünmüyorsa sebebi kod eksikliği DEĞİL: (a) Apple bu build'lerden hiçbirini henüz onaylayıp yayına almamış olabilir (App Store Connect'teki review durumu buradan görülemiyor, kullanıcının kontrol etmesi gerekiyor), ya da (b) cihaz App Store'daki en güncel sürüme henüz güncellenmemiş olabilir.
   - **Google ile Giriş (native, mobile):** kod tabanında HİÇ YOK — `mobile/src/` içinde `@react-native-google-signin` veya benzeri bir paket/bileşen bulunamadı (sadece `AppleSignInButton.tsx` var). Bu daha önceki devir notlarında da "YAPILMADI" olarak işaretlenmiş bilinen bir eksik — henüz hiç geliştirilmedi, dolayısıyla hiçbir build'e giremez. Ayrı bir geliştirme turu gerekiyor (backend'de Google OAuth zaten web tarafında var olabilir, mobile native SDK entegrasyonu eksik olan kısım — netleştirilmedi, yeni sohbet önce mevcut web Google-login akışını inceleyip mobile'a taşımalı).
   - **Sınav Hazırlık Alanı (mobile):** kod `3bb320d` commit'inde (9 Eylül 11:09) eklendi — bu, STORE build #10'un commit'inden (`6cbb70f`, 9 Eylül 06:18) YAKLAŞIK 5 SAAT SONRA yazıldı, yani build #10'da YOK. Bu oturumun sonunda alınan en güncel EAS build'i (9 Eylül 12:36, commit `a719dd3`, Sınav Hazırlık'ı ve harita UI'ını da içeriyor) sadece **preview/internal dağıtım** — App Store'a hiç gönderilmedi. `3bb320d` commit'i `mobile/package.json`'a hiçbir yeni native paket eklemedi (sadece JS/TSX) — yani yeni bir native build/Apple incelemesi GEREKMEDEN, build #10 (runtimeVersion 1.0.1) bir kez cihazlara ulaştıktan sonra `eas update --branch production --platform ios` ile JS-only OTA güncellemesi olarak gönderilebilir.
   - **Ne zaman yansır — somut adımlar:** (1) App Store Connect'te build #10'un (ya da hangisi gönderildiyse) inceleme/yayın durumu kontrol edilmeli — bu MCP araçlarıyla buradan görülemiyor. (2) Onaylanıp cihaz App Store'dan güncelleme aldığında Apple ile Giriş otomatik görünür olur (zaten build içinde). (3) Hemen ardından `eas update --branch production --platform ios` çalıştırılıp Sınav Hazırlık Alanı + Gramer Rehberi harita UI'ı + "Bugünün Programı" kartı gibi o tarihten beri biriken TÜM JS değişiklikleri aynı build'e OTA ile gönderilmeli — yeni bir Apple incelemesi gerekmez. (4) Google ile Giriş ayrı bir geliştirme + yeni native build + yeni Apple incelemesi gerektirir, bu adımların dışında.
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
2. **Gramer Rehberi TAMAMEN bitti** — içerik (16 bölüm + madde 17 Ekler, 91 konu, 225 soru, TÜM konularda pratik sorusu var) VE UI (harita görünümü + Sınav Hazırlık Alanı kart iyileştirmesi, bkz. §0.11/§0.12) tamamlandı. Kullanıcıya HİÇBİR ŞEY SORMADAN devam edilecek otomatik bir Gramer Rehberi işi KALMADI.
3. **V2 Yol Haritası netleşti — kullanıcı 4 net karar verdi (bkz. §6 başı).** Madde #5 bu oturumda YAPILDI (§0.13, §6.1). Yeni sohbet kullanıcıya HİÇBİR ŞEY SORMADAN doğrudan **Faz 2'ye (madde #6 — zayıf-alan istatistiğini kelime/oyun tarafına taşıma)** başlasın — somut plan §6.2'de hazır, ilk adım `general_word_pool` şemasını incelemek ve `words.word_type` değerlerinin gerçek dağılımına bakmak.
4. Faz 2 bitince sıradaki iş **Faz 3** (§6.3 — Gerçek Zamanlı Düello + Lig + Görev Haritası + B2B, genişletilmiş vizyonla TEK inşa). **Bu ÇOK BÜYÜK bir iş — TEK oturumda bitirilmeye ÇALIŞILMAMALI**, Gramer Rehberi'nin 7 dalgalık deseni gibi alt-fazlara (3a→3f, §6.3'te tanımlı) bölünerek ilerlenmeli, 3a (şema tasarımı) ile başlanmalı.
5. Faz 3 bitince **Faz 4** (§6.4 — Referans/Davet Programı + B2B Paket + SADECE Korece/Çince). Bu dillerin dışında (Hollandaca/Azerice/Farsça dahil) başka dil ÖNERİLMEMELİ/EKLENMEMELİ — kullanıcı açıkça reddetti.
6. Kullanıcı Gramer Rehberi harita/kart değişikliklerini (bir önceki oturumda istekte bulunmuştu) beğenmezse veya ince ayar isterse (renk, ikon, animasyon, mobil tarafında da aynı UI vb.), bunlar doğrudan (onay beklemeden) yapılabilir — kapsamı önceden onaylanmış bir iyileştirme, yeni bir V2 kararı değil.
7. `npm run build` bu oturumda da dahil olmak üzere kullanıcının makinesindeki Linux sandbox'ta (device_bash) SWC/ağ kısıtı yüzünden çalıştırılamıyor (bkz. §0.12) — yeni sohbet ya da kullanıcının kendisi ilk fırsatta gerçek ortamda (`npm run dev` / Vercel preview) görsel/derleme kontrolü yapmalı; bir hata bildirilirse önce bunu hatırla. Backend tarafında da gerçek pytest/canlı API testi bu ortamda yapılamıyor (bkz. §0.13) — sadece `py_compile` ile sözdizimi doğrulanabiliyor.
8. Her yeni dalga/faz/alt-faz sonunda: (varsa) Supabase'e uygula → doğrula → migration dosyasını repoya yaz → commit hazırla → kullanıcıya `git push` komutunu ver → devir notunun §0 tablosuna satır ekle VE ilgili §6.x alt maddesini "✅ TAMAMLANDI" olarak işaretle. Frontend değişikliği varsa: `npx tsc --noEmit` + `npx eslint <değişen dosyalar>` ile doğrula, sonra aynı commit/push akışını izle.

## 6. V2 Yol Haritası — Fazlı Mühendislik Planı (9 Eylül 2026)

Kullanıcının bu oturumda verdiği 4 net karar (V2 Yol Haritası mesajı, özetle):
1. Sınav Hazırlık alanı madde #5 (dil kısıtı) — GENELLEŞTİRİLECEK.
2. Madde #6 (zayıf-konu istatistiği) — kelime/oyun tarafına da taşınacak.
3. Gerçek Zamanlı Düello — genişletilmiş vizyon (lig/terfi-düşme, görev haritası, B2B kurumsal ligler) düello ile BİRLİKTE TEK seferde inşa edilecek, aşamalı/MVP-önce değil.
4. Kalan V2 maddeleri (Referans/Davet Programı, Yeni Diller, B2B Paket) bu üç madde bitince yapılacak; yeni dil olarak SADECE Korece (ko) ve Çince (zh) eklenecek, başka dil yok.

Bu karara göre 4 faz tanımlandı, Gramer Rehberi'nde kullanılan "dalga" desenine benzer şekilde her faz somut adımlara bölündü. Faz sırası kullanıcının kendi sırasıyla aynı: 1 → 2 → 3 → 4.

### 6.1. Faz 1 — Madde #5: dil kısıtı genellemesi — ✅ TAMAMLANDI (bu oturum)

Özet: `_exam_area_enabled`/`_grammar_area_enabled` artık `native_lang=='tr'` şartını aramıyor, hangi `learning_lang` için onaylı/yayında içerik varsa o açık. Detay: §0.13.

### 6.2. Faz 2 — Madde #6: zayıf-alan istatistiğini kelime + oyun tarafına taşı — ⬜ YAPILMADI, plan hazır

Hedef: `exams.py::weak_topics`'teki "son N günde en çok yanlış yapılan konu" mantığının bir benzerini kelime tekrarı (words/quiz_results) ve oyun (game_sessions/game_attempts) tarafında da sun.

Mevcut durum keşfi (bu oturumda yapıldı):
- `quiz_results` (session_id, word_id, is_correct, answered_at) — kelime tekrar oturumlarında hangi kelimenin doğru/yanlış cevaplandığını tutuyor, `study_sessions`'a bağlı.
- `words` tablosunda `word_type` sütunu var (noun/verb/adjective vb, muhtemelen serbest metin) — gramer konularındaki topic_tag'in kelime tarafındaki en yakın analogu.
- `game_attempts` (session_id, word_id, general_word_id, is_correct) — `word_id` kullanıcının kendi kelimesi, `general_word_id` genel kelime havuzundan (general_word_pool, 27270 satır); hangisinin dolu olacağı oyun moduna göre değişiyor.
- `general_word_pool` şeması bu oturumda İNCELENMEDİ — Faz 2'nin ilk adımı bu tablonun word_type/kategori benzeri bir sütunu olup olmadığını kontrol etmek olmalı.

Önerilen tasarım:
1. `word_type`'ı ortak "zayıf alan" boyutu olarak kullan (gramer tarafındaki topic_tag'in analogu).
2. `backend/app/api/routes/words.py` içine `GET /words/stats/weak-word-types` — `exams.py::weak_topics` ile AYNI desen: son N gün, quiz_results join words.word_type, en çok yanlışın olduğu word_type'lar.
3. `backend/app/api/routes/games.py` içine `GET /games/stats/weak-word-types` — aynı desen, game_attempts join words/general_word_pool (word_id doluysa words, general_word_id doluysa general_word_pool).
4. Cross-cutting bir modül YERİNE her domain kendi router'ında kendi endpoint'ini barındırsın (mevcut kod tabanının deseni — bkz. exams.py/grammar.py modül docstring'leri, bilinçli kod tekrarı).
5. Frontend: dashboard'daki mevcut "zayıf konular" kartının yanına aynı görsel dilde yeni kart(lar) — "Zayıf Kelime Türleri" / "Oyunda Zorlandığın Kelime Türleri". `web/src/app/(app)/dashboard/page.tsx`'teki mevcut weakTopics deseni (satır ~152-157) örnek alınmalı.
6. XP/rozet entegrasyonu gerekmiyor — sadece bilgilendirici bir istatistik widget'ı.

Riskler/açık sorular: `words.word_type` değerlerinin tutarlılığı bilinmiyor (serbest metin olabilir, önce `select distinct word_type, count(*) from words group by word_type` ile gerçek değerlere bakılmalı); `general_word_pool` şeması henüz incelenmedi.

### 6.3. Faz 3 — Gerçek Zamanlı Düello + Lig + Görev Haritası + B2B (genişletilmiş vizyon, TEK inşa) — ⬜ YAPILMADI, plan hazır

BU, ŞİMDİYE KADARKİ EN BÜYÜK V2 MADDESİ — Gramer Rehberi'nin 7 dalgasından çok daha büyük. TEK oturumda bitirilmeye ÇALIŞILMAMALI. Aşağıdaki 6 alt-faza (3a → 3f) bölündü, sırayla ilerlenmeli, her alt-faz kendi commit'i ile kapatılmalı.

3a. Realtime altyapı + şema temeli
- Supabase Realtime (broadcast + presence channels) aktif mi kontrol edilmeli.
- Yeni tablolar (taslak, şema tasarımı bu alt-fazın asıl işi):
  - duels (id, mode, status: waiting/active/finished, league_id nullable, created_at, ended_at)
  - duel_participants (duel_id, user_id, score, joined_at, left_at)
  - duel_rounds (duel_id, round_index, general_word_id veya question içeriği, correct_answer, started_at, ends_at)
  - duel_answers (duel_round_id, user_id, selected_option, is_correct, time_taken_ms)
- Mevcut `challenges` tablosu (0 satır, boş) yeniden kullanılabilir mi incelenmeli — şeması (challenger_id/challenged_id/mode/status/winner_id) 1v1 arkadaş-daveti modeline benziyor, çok-kişili canlı oda/Kahoot modeline direkt uymayabilir. Önerilen karar: challenges 1v1 özel davet akışı için kalsın, çok-kişili canlı düello için YENİ tablolar açılsın — ama bu şema tasarımı sırasında netleştirilmeli.
- Backend: yeni `backend/app/api/routes/duels.py` — REST katmanı (oda oluştur/katıl/durum), gerçek zamanlı yayın Supabase Realtime broadcast ile (FastAPI sadece state/skor kalıcılığını ve XP ödülünü yönetir).
- Matchmaking: basit kuyruk (bekleyen kullanıcı havuzu), ileride lig/seviye yakınlığına göre eşleştirme.

3b. Lig sistemi (terfi/düşme)
- Yeni tablolar: leagues (id, tier_order, name, capacity, organization_id nullable — B2B için), league_seasons (id, league_id, starts_at, ends_at), league_memberships (season_id, user_id, league_id, points, rank).
- Puanlama: düello galibiyeti + katılım XP'si (mevcut award_xp servisiyle tutarlı yeni source_type değerleri: duel_win, duel_participation).
- Sezon sonu cron job (Railway native cron, mevcut cron_job_runs tablosu deseniyle tutarlı): en üst N terfi eder, en alt N düşer.

3c. Görev haritası (quest map) — SUNUCU taraflı ilerleme
- Gramer Rehberi'nin harita UI'ı (bkz. §0.12, exam-grammar/page.tsx) görsel/etkileşim deseni olarak yeniden kullanılabilir — AMA bu sefer ilerleme SUNUCUDA tutulmalı (rekabet/lig bağlamı olduğu için localStorage YETERSİZ).
- Yeni tablo: user_quest_progress (user_id, quest_node_id, status, completed_at) — ya da xp_events/daily_progress üzerinden türetilmiş bir görünüm, şema tasarımı aşamasında karar verilmeli.
- Görev düğümleri: günlük/haftalık hedefler, düello galibiyetleri, lig hedefleri — içerik tasarımı ayrı bir alt-adım.

3d. B2B / kurumsal ligler
- Yeni tablolar: organizations (id, name, plan), organization_members (org_id, user_id, role).
- leagues.organization_id nullable — null ise genel/herkese açık lig, doluysa kurum-scope'lu özel lig.
- Kurum yöneticisi paneli: üye davet/yönetim, kurum-içi liderlik tablosu (admin.py'deki mevcut RBAC desenine benzer).
- NOT: Bu, §1.5'teki "Kurumsal/Dershane B2B Paketi" (toplu lisans SATIŞI) ile KARIŞTIRILMAMALI — burada bahsedilen kurumsal lig, düello ÖZELLİĞİNİN B2B versiyonu. İkisi ileride ticari olarak birleşebilir ama şema/kapsam ayrı ele alınmalı.

3e. Frontend (web + mobile)
- Yeni "Düello" sekmesi/sayfası: bekleme odası UI'ı, canlı soru gösterimi + sayaç, sonuç ekranı.
- Lig sıralama tablosu sayfası.
- Görev haritası sayfası (Gramer Rehberi harita UI'ının bir varyasyonu).
- Mobile tarafı web ile PARALEL geliştirilmeli (Gramer Rehberi'nin harita UI'ında mobile atlanmıştı — Faz 3'te bu boşluk tekrarlanmamalı).

3f. XP/ödül entegrasyonu
- award_xp servisine yeni source_type değerleri: duel_win, duel_participation, league_promotion vb.

Önerilen çalışma sırası: 3a (şema+backend state machine) → 3f (temel XP) → 3e (temel düello UI'ı, lig olmadan test edilebilir) → 3b (lig) → 3c (görev haritası) → 3d (B2B, en son).

### 6.4. Faz 4 — Referans/Davet Programı + B2B Paket + SADECE Korece/Çince — ⬜ YAPILMADI, plan hazır (Faz 1-3 bitmeden BAŞLANMAYACAK)

- Diller: `languages` tablosuna `ko` (Korece) ve `zh` (Çince) satırları eklenir (is_active=true) — mevcut 10 satırla aynı desende (en/tr/de/fr/es/it/ja/ar/ru/pt).
  - İçerik: general_word_pool/words şemasındaki source_lang/target_lang zaten serbest metin (herhangi bir dil kodu kabul ediyor, kod değişikliği gerekmez) — yeni dil için kelime havuzu SEED edilmeli (AI destekli bir üretim script'i gerekebilir, mevcut olup olmadığı incelenmedi).
  - Hangul/Hanzi (Latin olmayan alfabe) UI'da özel render sorunu yaratır mı kontrol edilmeli; romanizasyon/transliterasyon gösterimi gerekip gerekmediği ayrı bir ürün kararı.
  - Sınav Hazırlık Alanı bu iki dil için AÇILMAYACAK (YDS/YÖKDİL/IELTS/TOEFL İngilizce-spesifik sınavlar) — sadece kelime/oyun/genel öğrenim akışları için.
- Referans/Davet Programı (§1.3): mevcut social.py/friendships/follows altyapısı üzerine oturur.
- B2B Paket (§1.5): hedef segment + 5 adımlık outreach önceki oturumda hazırlanmıştı — Faz 3d'deki kurumsal lig altyapısıyla mümkünse birleştirilmeli (aynı organizations/organization_members tabloları kullanılabilir).

---
