-- Faz 1 içerik: 9 kategori + 13 gramer konusu (idempotent, slug UNIQUE constraint sayesinde ON CONFLICT DO NOTHING ile güvenli tekrar-çalıştırma)

insert into grammar_categories (slug, name_tr, name_en, sort_order) values ('tenses', 'Zamanlar', 'Tenses', 1) on conflict (slug) do nothing;
insert into grammar_categories (slug, name_tr, name_en, sort_order) values ('passive', 'Edilgen Çatı', 'Passive Voice', 2) on conflict (slug) do nothing;
insert into grammar_categories (slug, name_tr, name_en, sort_order) values ('conditionals', 'Koşul Cümleleri', 'Conditionals', 3) on conflict (slug) do nothing;
insert into grammar_categories (slug, name_tr, name_en, sort_order) values ('modals', 'Modal Fiiller', 'Modals', 4) on conflict (slug) do nothing;
insert into grammar_categories (slug, name_tr, name_en, sort_order) values ('clauses', 'İlgi Cümlecikleri', 'Relative Clauses', 5) on conflict (slug) do nothing;
insert into grammar_categories (slug, name_tr, name_en, sort_order) values ('articles-nouns', 'Artikeller ve İsimler', 'Articles & Nouns', 6) on conflict (slug) do nothing;
insert into grammar_categories (slug, name_tr, name_en, sort_order) values ('reported-speech', 'Aktarılan Cümle', 'Reported Speech', 7) on conflict (slug) do nothing;
insert into grammar_categories (slug, name_tr, name_en, sort_order) values ('phrasal-vocab', 'Deyimsel Fiiller ve Kelime Türetme', 'Phrasal Verbs & Word Formation', 8) on conflict (slug) do nothing;
insert into grammar_categories (slug, name_tr, name_en, sort_order) values ('sentence-structure', 'Cümle Yapısı ve Bağlaçlar', 'Sentence Structure', 9) on conflict (slug) do nothing;

insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'present-perfect-vs-past-simple',
  (select id from grammar_categories where slug = 'tenses'),
  'Present Perfect ve Past Simple Farkı',
  'Sonucu şimdiki zamanla bağlantılı olaylarla, tamamen bitmiş ve net zaman belirtilen olayları ayırt etme.',
  'b1',
  ARRAY['yds','yokdil']::text[],
  '**Present Perfect** (*have/has + V3*), geçmişte olan ama şimdiki zamanla bir bağlantısı olan (sonucu hâlâ geçerli olan, ne zaman olduğu önemli olmayan) olayları anlatır.

**Past Simple** (*V2*), belirli/net bir zamanda olmuş ve tamamen bitmiş olayları anlatır — genelde bir zaman zarfıyla (*yesterday, in 2020, last week*) birlikte kullanılır.

Kural olarak: cümlede net bir geçmiş zaman ifadesi varsa Past Simple, yoksa ve sonuç/etki hâlâ önemliyse Present Perfect kullanılır. `ever/never/already/yet/just/so far` gibi zarflar genelde Present Perfect ile birlikte gelir; `yesterday/ago/last...` gibi zarflar Past Simple ister.',
  '[{"en": "I have lost my keys.", "tr": "Anahtarlarımı kaybettim (hâlâ kayıp, sonuç önemli)."}, {"en": "I lost my keys yesterday, but I found them an hour later.", "tr": "Olay tamamen bitmiş, net zaman var."}, {"en": "She has lived in Ankara for 10 years.", "tr": "Hâlâ Ankara''da yaşıyor — süre şimdiye kadar devam ediyor."}, {"en": "She lived in Ankara from 2010 to 2015.", "tr": "Net başlangıç-bitiş, artık orada yaşamıyor."}]'::jsonb,
  '[{"wrong": "I have seen him yesterday.", "correct": "I saw him yesterday.", "note": "Cümlede net bir zaman zarfı (yesterday) varsa Present Perfect kullanılmaz — Türkçe''de -mış/-dı ayrımı bu kuralla birebir örtüşmediği için bu hata çok sık yapılır."}, {"wrong": "I am living in this city since 2018.", "correct": "I have been living in this city since 2018.", "note": "''Since/for'' ile süregelen bir durum anlatılırken Present Continuous değil Present Perfect (Continuous) kullanılır."}, {"wrong": "Have you finished it already?", "correct": "Have you finished it yet?", "note": "''Already'' olumlu cümlelerde, ''yet'' soru ve olumsuz cümlelerde kullanılır — Türkçe''de ikisi de kabaca ''hâlâ/zaten'' gibi çevrildiği için karıştırılır."}]'::jsonb,
  'published',
  'manual',
  1
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'past-simple-vs-continuous',
  (select id from grammar_categories where slug = 'tenses'),
  'Past Simple ve Past Continuous Farkı',
  'Tamamlanmış bir olayla, başka bir olay sırasında devam etmekte olan bir eylemi ayırt etme.',
  'a2',
  ARRAY['yds','yokdil','ielts','toefl']::text[],
  '**Past Simple** (*V2*), geçmişte olup bitmiş, tamamlanmış bir eylemi anlatır.

**Past Continuous** (*was/were + V-ing*), geçmişte belirli bir anda DEVAM ETMEKTE olan bir eylemi, genelde başka (kısa) bir olay araya girdiğinde anlatır.

En sık kalıp: *while + Past Continuous, Past Simple* — ''while'' uzun/devam eden eylemi, kısa eylem ise Past Simple ile verilir. `when` genelde kısa eylemin başında kullanılır.',
  '[{"en": "I was watching TV when the phone rang.", "tr": "TV izliyordum (devam eden), telefon çaldı (kısa/ani olay)."}, {"en": "While she was cooking, I was setting the table.", "tr": "İki eylem aynı anda devam ediyor."}, {"en": "He finished his homework and went to bed.", "tr": "İki ayrı, tamamlanmış olay art arda."}]'::jsonb,
  '[{"wrong": "When I was arriving, she left.", "correct": "When I arrived, she left.", "note": "''Arrive'' gibi anlık/kısa eylemler genelde Past Continuous''ta kullanılmaz — Türkçe''de ''-yordu'' ekinin geniş kullanımı bu hatayı tetikler."}, {"wrong": "I was knowing the answer.", "correct": "I knew the answer.", "note": "''Know, want, believe, understand'' gibi durum bildiren (stative) fiiller normalde continuous formda kullanılmaz."}]'::jsonb,
  'published',
  'manual',
  2
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'passive-present-past',
  (select id from grammar_categories where slug = 'passive'),
  'Edilgen Çatı: Present ve Past',
  'Eylemi yapan değil, eylemden etkilenen öznenin öne çıktığı cümle yapısı.',
  'b1',
  ARRAY['yds','yokdil']::text[],
  'Edilgen (passive) çatı, eylemi KİMİN yaptığından çok eylemden kimin/neyin etkilendiği önemliyse kullanılır — özellikle YDS''nin akademik/haber metinlerinde çok sık geçer.

Yapı: **be (uygun zamanda) + V3**. Örn. Present Simple Passive: *am/is/are + V3*; Past Simple Passive: *was/were + V3*.

Eylemi yapan kişi önemliyse cümlenin sonuna `by + kişi/nesne` eklenir; çoğu zaman (özellikle kim yaptığı belli değilse veya önemsizse) hiç eklenmez — bu edilgenin en sık kullanılma sebebidir.',
  '[{"en": "The report is written every month.", "tr": "Rapor her ay yazılır (kim yazdığı önemli değil)."}, {"en": "The bridge was built in 1990.", "tr": "Köprü 1990''da yapıldı."}, {"en": "This novel was written by a famous author.", "tr": "Yazan kişi burada önemli, ''by'' eklendi."}]'::jsonb,
  '[{"wrong": "The letter was sending yesterday.", "correct": "The letter was sent yesterday.", "note": "Edilgende fiil her zaman V3 (past participle) formundadır, -ing formu değil — bu iki form Türkçe''de net bir karşılığı olmadığı için karıştırılır."}, {"wrong": "This book is reading by millions of people.", "correct": "This book is read by millions of people.", "note": "Aynı hata present passive''de de sık görülür: be + V-ing yerine be + V3 gerekir."}, {"wrong": "The company was founded by in 1980.", "correct": "The company was founded in 1980.", "note": "Eylemi yapan belirtilmiyorsa ''by'' hiç kullanılmaz — gereksiz yere eklenmemeli."}]'::jsonb,
  'published',
  'manual',
  1
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'conditionals-zero-first',
  (select id from grammar_categories where slug = 'conditionals'),
  'Zero ve First Conditional',
  'Genel geçerlilikler (zero) ile gerçekleşmesi olası gelecek durumları (first) anlatan koşul cümleleri.',
  'a2',
  ARRAY['yds','yokdil','ielts']::text[],
  '**Zero Conditional** — *If + Present Simple, Present Simple*: her zaman doğru olan, genel geçer kurallar/bilimsel gerçekler için kullanılır. ''If'' yerine ''when'' de konulabilir, anlam değişmez.

**First Conditional** — *If + Present Simple, will + V1*: gelecekte gerçekleşmesi mümkün/olası bir durumu ve sonucunu anlatır.

Önemli kural: `if` cümleciğinde ASLA `will` kullanılmaz — sonuç kısmında kullanılır.',
  '[{"en": "If you heat water to 100°C, it boils.", "tr": "Genel geçer bir gerçek (zero)."}, {"en": "If it rains tomorrow, we will stay at home.", "tr": "Olası bir gelecek durumu (first)."}, {"en": "If you don''t study, you won''t pass the exam.", "tr": "Olumsuz first conditional."}]'::jsonb,
  '[{"wrong": "If it will rain, I will take an umbrella.", "correct": "If it rains, I will take an umbrella.", "note": "''If'' cümleciğinde ''will'' kullanılmaz — bu, Türkçe''de her iki cümlecikte de gelecek zaman kullanılmasından (yağarsA/yağacaksa) kaynaklanan çok yaygın bir hatadır."}, {"wrong": "If you mix red and blue, you will get purple.", "correct": "If you mix red and blue, you get purple.", "note": "Genel/bilimsel bir gerçek anlatılıyorsa (her zaman doğru) ''will'' değil zero conditional (Present Simple) kullanılır."}]'::jsonb,
  'published',
  'manual',
  1
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'conditionals-second',
  (select id from grammar_categories where slug = 'conditionals'),
  'Second Conditional (Hayali/Gerçek Dışı Durumlar)',
  'Şimdiki zamanda gerçek olmayan ya da gerçekleşmesi çok düşük ihtimalli hayali durumlar.',
  'b2',
  ARRAY['yds','yokdil','ielts','toefl']::text[],
  '**Second Conditional** — *If + Past Simple, would + V1*: şimdiki zamanda gerçek olmayan ya da gerçekleşme ihtimali çok düşük hayali bir durumu ve onun sonucunu anlatır.

''If'' cümleciğinde ''was'' yerine tüm şahıslarla resmi/yazılı dilde `were` kullanılır (*If I were you...*) — bu, sınavlarda en sık test edilen noktalardan biridir.',
  '[{"en": "If I had a million dollars, I would travel the world.", "tr": "Şu an gerçek değil, hayali bir durum."}, {"en": "If I were you, I would apologize.", "tr": "Tavsiye vermek için çok kullanılan bir kalıp."}, {"en": "She would help you if she had more time.", "tr": "Şu an vakti yok, hayali sonuç."}]'::jsonb,
  '[{"wrong": "If I was rich, I would buy a house.", "correct": "If I were rich, I would buy a house.", "note": "Resmi/sınav İngilizcesinde second conditional''da ''was'' yerine ''were'' tercih edilir (konuşma dilinde ''was'' da kabul görse de sınavlarda ''were'' beklenir)."}, {"wrong": "If I will have more money, I would travel more.", "correct": "If I had more money, I would travel more.", "note": "''If'' cümleciğinde ''will'' değil Past Simple kullanılır — first ve second conditional karıştırılınca ortaya çıkan tipik bir hata."}]'::jsonb,
  'published',
  'manual',
  2
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'modals-obligation-advice',
  (select id from grammar_categories where slug = 'modals'),
  'Zorunluluk ve Tavsiye Modalları',
  'must/have to ile zorunluluk, should/ought to ile tavsiye arasındaki anlam farkları.',
  'b1',
  ARRAY['yds','yokdil','toefl']::text[],
  '**must**: konuşanın kendi görüşüne göre zorunluluk (genelde kişisel/içsel bir zorunluluk).

**have to**: dışarıdan gelen bir kural/zorunluluk (kanun, kurum kuralı, başkasının koyduğu kural).

**mustn''t**: yasak (yapmamalısın/yapman yasak) — **don''t have to** ile karıştırılmamalı, o ''gerek yok, zorunlu değilsin'' demektir, tamamen farklı bir anlam taşır.

**should / ought to**: tavsiye, öneri — zorunluluk değil.',
  '[{"en": "I must finish this report today.", "tr": "Kendi kararım/görüşüm (kişisel zorunluluk)."}, {"en": "Employees have to wear a uniform.", "tr": "Şirket kuralı (dışarıdan gelen zorunluluk)."}, {"en": "You mustn''t smoke here.", "tr": "Yasak."}, {"en": "You don''t have to come if you''re busy.", "tr": "Zorunlu değil, gelmesen de olur."}, {"en": "You should see a doctor.", "tr": "Tavsiye."}]'::jsonb,
  '[{"wrong": "You don''t must smoke here.", "correct": "You mustn''t smoke here.", "note": "''Must'' olumsuzu ''don''t must'' değil ''mustn''t''tir; ayrıca ''mustn''t'' yasak anlamı taşır."}, {"wrong": "You mustn''t come if you''re busy — it''s not necessary.", "correct": "You don''t have to come if you''re busy.", "note": "''mustn''t'' (yasak) ile ''don''t have to'' (gerek yok) anlamca tamamen farklıdır — Türkçe''de ikisi de ''gerekmiyor/olmaz'' gibi çevrilebildiği için sıkça karıştırılır."}]'::jsonb,
  'published',
  'manual',
  1
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'modals-deduction',
  (select id from grammar_categories where slug = 'modals'),
  'Çıkarım Modalları: must/might/can''t',
  'Elimizdeki kanıtlara göre bir şeyin ne kadar kesin olduğunu belirten modallar.',
  'b2',
  ARRAY['yds','yokdil','toefl']::text[],
  'Bir şeyin ne kadar KESİN olduğuna dair çıkarım (deduction) yaparken:

**must** = eminim, kesinlikle öyle (güçlü olumlu çıkarım)

**might/may/could** = olabilir (belirsiz, ihtimal)

**can''t** = eminim, kesinlikle değil (güçlü olumsuz çıkarım — ''mustn''t'' DEĞİL)

Geçmişe dair çıkarımlarda: `must/might/can''t + have + V3` kalıbı kullanılır.',
  '[{"en": "She''s not answering — she must be asleep.", "tr": "Güçlü olumlu çıkarım."}, {"en": "He might be at the office; I''m not sure.", "tr": "Belirsiz."}, {"en": "That can''t be true — I just saw her yesterday.", "tr": "Güçlü olumsuz çıkarım."}, {"en": "They must have left already; the lights are off.", "tr": "Geçmişe dair çıkarım."}]'::jsonb,
  '[{"wrong": "That mustn''t be true.", "correct": "That can''t be true.", "note": "Çıkarımda güçlü olumsuzluk için ''mustn''t'' değil ''can''t'' kullanılır — ''mustn''t'' burada yasak anlamına gelir, çıkarım anlamı taşımaz."}, {"wrong": "He must slept badly last night.", "correct": "He must have slept badly last night.", "note": "Geçmişe dair çıkarımda modal''dan sonra ''have + V3'' gelmesi unutulur — sadece V2/V1 ile bırakılır."}]'::jsonb,
  'published',
  'manual',
  2
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'relative-clauses-defining',
  (select id from grammar_categories where slug = 'clauses'),
  'Tanımlayıcı İlgi Cümlecikleri (who/which/that)',
  'Bir ismi tanımlamak/hangisi olduğunu belirtmek için kullanılan, virgülsüz ilgi cümlecikleri.',
  'b1',
  ARRAY['yds','yokdil']::text[],
  'Tanımlayıcı (defining) ilgi cümlecikleri, bahsedilen ismin HANGİSİ olduğunu belirtmek için gereklidir — cümleden çıkarılırsa anlam eksik/belirsiz kalır, virgülle ayrılmaz.

`who/that` — kişiler için; `which/that` — nesneler için; `whose` — iyelik/sahiplik için; `where` — yer için.

Türkçe''nin SOV (özne-nesne-yüklem) yapısında ilgi cümleciği isimden ÖNCE gelirken (*gördüğüm adam*), İngilizce''de isimden SONRA gelir (*the man who I saw*) — bu, Türkçe konuşanların bu yapıda en çok zorlandığı noktadır.',
  '[{"en": "The man who called you is my brother.", "tr": "Seni arayan adam kardeşimdir."}, {"en": "This is the book that I told you about.", "tr": "Sana bahsettiğim kitap bu."}, {"en": "The company whose products we sell is based in İzmir.", "tr": "Ürünlerini sattığımız şirket."}]'::jsonb,
  '[{"wrong": "The man who I saw him yesterday is a doctor.", "correct": "The man who(m) I saw yesterday is a doctor.", "note": "İlgi cümleciğinde ilgi zamiri zaten öznenin/nesnenin yerini tuttuğu için ayrıca ''him'' gibi bir zamir tekrar EKLENMEZ — Türkçe''de bu tekrar doğal geldiği için sık yapılan bir hatadır."}, {"wrong": "The man which called you is my brother.", "correct": "The man who called you is my brother.", "note": "Kişiler için ''which'' değil ''who'' (veya ''that'') kullanılır."}]'::jsonb,
  'published',
  'manual',
  1
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'articles',
  (select id from grammar_categories where slug = 'articles-nouns'),
  'Artikel Kullanımı: a/an, the ve Artikelsiz',
  'Türkçe''de karşılığı olmayan artikel sisteminin temel mantığı — ne zaman a/an, ne zaman the, ne zaman hiç artikel.',
  'b1',
  ARRAY['yds','yokdil','ielts','toefl']::text[],
  'Türkçe''de artikel sistemi olmadığı için bu, Türkçe konuşanlar için İngilizce''nin en zor noktalarından biridir — bu yüzden neredeyse her sınavda mutlaka test edilir.

**a/an**: ilk kez bahsedilen, belirsiz, tekil sayılabilir bir isim için (*a book*).

**the**: hem konuşan hem dinleyenin HANGİ isimden bahsedildiğini bildiği durumlar için (daha önce bahsedilmiş, tek olan, bağlamdan belli olan).

**Artikelsiz (Ø)**: çoğul veya sayılamayan isimlerden genel olarak bahsederken (*I like music*, *Dogs are loyal*), çoğu özel isimde, ve soyut/genel kavramlarda.',
  '[{"en": "I saw a cat in the garden. The cat was black.", "tr": "İlk bahsedişte ''a'', ikincisinde ''the'' (artık hangisi olduğu belli)."}, {"en": "Dogs are loyal animals.", "tr": "Genel bir ifade — artikelsiz çoğul."}, {"en": "I love music.", "tr": "Sayılamayan isim, genel anlamda — artikelsiz."}, {"en": "The Earth revolves around the Sun.", "tr": "Tek olan varlıklar için ''the''."}]'::jsonb,
  '[{"wrong": "I like the music.", "correct": "I like music.", "note": "Genel anlamda (belirli bir müzik değil, müzik kavramı) bahsederken ''the'' kullanılmaz — Türkçe''de belirlilik eki olmadığı için bu ayrımı hissetmek zordur."}, {"wrong": "She is the best student in class.", "correct": "She is the best student in the class.", "note": "Belirli, tek bir sınıftan bahsedildiği için ''class'' önünde ''the'' gerekir."}, {"wrong": "I want to be a engineer.", "correct": "I want to be an engineer.", "note": "Ünlü SESLE başlayan kelimelerden önce ''a'' değil ''an'' kullanılır (yazımdan değil telaffuzdan bakılır)."}]'::jsonb,
  'published',
  'manual',
  1
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'reported-speech-statements-questions',
  (select id from grammar_categories where slug = 'reported-speech'),
  'Aktarılan Cümle: İfadeler ve Sorular',
  'Birinin söylediklerini kendi cümlemize aktarırken yapılan zaman kayması ve söz dizimi değişiklikleri.',
  'b2',
  ARRAY['yds','yokdil']::text[],
  'Birinin sözünü (genelde geçmiş zamanda bir bildirme fiiliyle: *said, told, asked*) aktarırken iki temel değişiklik olur:

**1) Zaman kayması (backshift)**: present simple → past simple, present perfect → past perfect, will → would, can → could, vb. (fiil bir kademe geriye kayar).

**2) Soru cümlelerinde düz cümle sırası**: aktarılan sorularda özne-yüklem YER DEĞİŞTİRMEZ ve yardımcı fiil (do/does/did) düşer — normal bir düz cümle gibi kurulur, soru işareti de konmaz. Wh- sorularda soru kelimesi (*where, what, why*) korunur; evet/hayır sorularında `if/whether` eklenir.',
  '[{"en": "\"I am tired,\" she said. → She said (that) she was tired.", "tr": "am → was (backshift)."}, {"en": "\"Where do you live?\" he asked. → He asked where I lived.", "tr": "Soru sırası düzleşti, do/does düştü."}, {"en": "\"Are you coming?\" she asked. → She asked if I was coming.", "tr": "Evet/hayır sorusuna ''if'' eklendi."}]'::jsonb,
  '[{"wrong": "He asked where did I live.", "correct": "He asked where I lived.", "note": "Aktarılan sorularda yardımcı fiil (did/do/does) kullanılmaz ve özne-yüklem sırası düz cümledeki gibi kalır — Türkçe''de doğrudan aktarım daha az kullanıldığı için bu kural çoğu zaman atlanır."}, {"wrong": "She asked if am I ready.", "correct": "She asked if I was ready.", "note": "Aynı hata: soru sözcük sırası korunmamalı, ayrıca zaman kayması (am → was) da unutulmamalı."}]'::jsonb,
  'published',
  'manual',
  1
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'phrasal-verbs',
  (select id from grammar_categories where slug = 'phrasal-vocab'),
  'Deyimsel Fiiller (Phrasal Verbs) — Temel Mantık',
  'Fiil + edat/zarf birleşiminin genelde kelimelerin tek tek anlamından tamamen farklı bir anlam taşıması.',
  'b2',
  ARRAY['yds','ielts','toefl']::text[],
  'Deyimsel fiiller (*phrasal verbs*), bir fiille bir veya iki edat/zarfın (particle) birleşiminden oluşur ve çoğu zaman anlamı, parçaların tek tek anlamından TAHMİN EDİLEMEZ — bu yüzden ezber gerektirir, mantıkla çözülemez.

Bazıları AYRILABİLİR (nesne fiil ile edat arasına girebilir: *turn the light off* / *turn off the light*), bazıları AYRILAMAZ (*look after the kids*, asla *look the kids after* denmez). Nesne zamir ise (it, them) ayrılabilir fiillerde ARAYA GİRMESİ ZORUNLUDUR: *turn it off*, *turn off it* yanlıştır.',
  '[{"en": "Can you turn off the light? / Can you turn the light off?", "tr": "Ayrılabilir — ikisi de doğru."}, {"en": "Can you turn it off?", "tr": "Zamirle mutlaka ayrılır — ''turn off it'' yanlış."}, {"en": "She looks after her little brother.", "tr": "Ayrılamaz fiil."}, {"en": "I ran into an old friend yesterday.", "tr": "''Rastlamak'' — kelimelerin tek tek anlamından tahmin edilemez."}]'::jsonb,
  '[{"wrong": "Can you turn off it?", "correct": "Can you turn it off?", "note": "Ayrılabilir phrasal verb''lerde nesne ZAMİR ise mutlaka fiille edat arasına girer."}, {"wrong": "She looks her little brother after.", "correct": "She looks after her little brother.", "note": "''Look after'' gibi bazı phrasal verb''ler asla ayrılmaz — hangilerinin ayrılabilir/ayrılamaz olduğu ezberlenmelidir."}]'::jsonb,
  'published',
  'manual',
  1
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'word-formation-collocations',
  (select id from grammar_categories where slug = 'phrasal-vocab'),
  'Kelime Türetme ve Sık Kullanılan Kelime Eşleşmeleri',
  'Ek (suffix/prefix) ile kelime türü değiştirme ve doğal kelime eşleşmelerini (collocation) tanıma.',
  'b2',
  ARRAY['yds','yokdil']::text[],
  '**Kelime türetme (word formation)**: aynı kökten ek alarak isim/sıfat/fiil/zarf türetilir — YDS''de özellikle sık çıkan bir soru tipidir. Örn. *decide (fiil) → decision (isim) → decisive (sıfat) → decisively (zarf)*.

**Collocation (kelime eşleşmesi)**: bazı kelimeler doğal olarak belirli kelimelerle birlikte kullanılır, başka (anlamca yakın) bir kelimeyle değil — bu, dilbilgisi kuralı değil, dilin alışkanlığıdır ve ezberlenmesi gerekir. Örn. *make a decision* (doğru) ama *do a decision* (yanlış); *heavy rain* (doğru) ama *strong rain* (yanlış, doğal değil).',
  '[{"en": "He made a difficult decision. (NOT: did a decision)", "tr": "make + decision doğal eşleşme."}, {"en": "I take full responsibility. (NOT: I make full responsibility)", "tr": "take + responsibility."}, {"en": "She has a successful career. (success → successful)", "tr": "İsimden sıfat türetme."}, {"en": "It was an economically difficult year. (economy → economically)", "tr": "Sıfattan zarf türetme."}]'::jsonb,
  '[{"wrong": "I did a mistake.", "correct": "I made a mistake.", "note": "''Yapmak'' fiili Türkçe''de tek bir kelimeyken İngilizce''de bağlama göre ''make'' veya ''do'' olarak ikiye ayrılır — bu ikisinin hangi kelimelerle eşleştiği ezberlenmelidir."}, {"wrong": "This is a very economic decision for the family. (kastedilen: tasarruflu)", "correct": "This is a very economical decision for the family.", "note": "''Economic'' (ekonomiyle ilgili) ile ''economical'' (tutumlu/az harcayan) farklı anlamlar taşır — aynı kökten türeyen kelimelerin anlamları da birbirinden farklılaşabilir."}]'::jsonb,
  'published',
  'manual',
  2
) on conflict (slug) do nothing;
insert into grammar_topics (slug, category_id, title_tr, summary_tr, level, exam_relevance, rule_content_md, example_sentences, common_mistakes, status, source_type, sort_order) values (
  'connectors-linking-words',
  (select id from grammar_categories where slug = 'sentence-structure'),
  'Bağlaçlar: Zıtlık, Sebep-Sonuç ve Ekleme',
  'although/despite, because/because of, in addition gibi bağlaçların doğru kullanımı ve birbirine karıştırılmaması.',
  'b2',
  ARRAY['yds','yokdil']::text[],
  'Sınavlarda en sık karıştırılan bağlaç grupları:

**Zıtlık**: `although/though/even though` + ÖZNE + YÜKLEM (tam cümle) — ama `despite/in spite of` + İSİM veya V-ing (asla tam cümle almaz).

**Sebep**: `because` + ÖZNE + YÜKLEM (tam cümle) — ama `because of/due to` + İSİM.

**Ekleme**: `in addition/furthermore/moreover` yeni bir cümle başlatır (genelde noktalı virgül veya nokta ile önce); `and` cümle içinde iki öğeyi bağlar.',
  '[{"en": "Although it was raining, we went out.", "tr": "Tam cümle ile."}, {"en": "Despite the rain, we went out.", "tr": "Sadece isimle."}, {"en": "We went out because it was sunny.", "tr": "Tam cümle."}, {"en": "We went out because of the sunny weather.", "tr": "Sadece isimle."}, {"en": "The project was late. In addition, it was over budget.", "tr": "Yeni cümle başlatır."}]'::jsonb,
  '[{"wrong": "Despite it was raining, we went out.", "correct": "Despite the rain, we went out. / Although it was raining, we went out.", "note": "''Despite'' asla tam cümle almaz, sadece isim veya -ing alır — bu iki grup İngilizce öğrenen Türkçe konuşanların en sık karıştırdığı bağlaç çiftidir."}, {"wrong": "We were late because of we missed the bus.", "correct": "We were late because we missed the bus. / We were late because of missing the bus.", "note": "''Because of'' isim alır, tam cümle almaz — tam cümle için düz ''because'' kullanılmalı."}]'::jsonb,
  'published',
  'manual',
  1
) on conflict (slug) do nothing;