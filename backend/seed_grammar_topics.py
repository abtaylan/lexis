"""
backend/seed_grammar_topics.py

Sınav Hazırlık — Gramer Rehberi (Grammar Reference), Faz 1 içerik yüklemesi.

9 Eylül 2026: Cambridge'in "English Grammar in Use" kitabını (telifli) uygulamaya
eklemek yerine, ÖZGÜN gramer referans içeriği yazılıp Sınav Hazırlık Alanı'na
eklenmesine karar verildi (bkz. supabase/migrations/027_grammar_reference.sql).
Bu script o kararın ilk içerik yüklemesi — YDS/YÖKDİL'de en sık çıkan 13 konu,
Türkçe konuşanlara özgü hatalara odaklanarak yazıldı. Diğer seed_*.py
script'leriyle aynı desen: idempotent (slug/upsert), supabase_admin ile.

Kullanım: python backend/seed_grammar_topics.py
"""

from app.core.database import supabase_admin

CATEGORIES = [
    {"slug": "tenses", "name_tr": "Zamanlar", "name_en": "Tenses", "sort_order": 1},
    {"slug": "passive", "name_tr": "Edilgen Çatı", "name_en": "Passive Voice", "sort_order": 2},
    {"slug": "conditionals", "name_tr": "Koşul Cümleleri", "name_en": "Conditionals", "sort_order": 3},
    {"slug": "modals", "name_tr": "Modal Fiiller", "name_en": "Modals", "sort_order": 4},
    {"slug": "clauses", "name_tr": "İlgi Cümlecikleri", "name_en": "Relative Clauses", "sort_order": 5},
    {"slug": "articles-nouns", "name_tr": "Artikeller ve İsimler", "name_en": "Articles & Nouns", "sort_order": 6},
    {"slug": "reported-speech", "name_tr": "Aktarılan Cümle", "name_en": "Reported Speech", "sort_order": 7},
    {"slug": "phrasal-vocab", "name_tr": "Deyimsel Fiiller ve Kelime Türetme", "name_en": "Phrasal Verbs & Word Formation", "sort_order": 8},
    {"slug": "sentence-structure", "name_tr": "Cümle Yapısı ve Bağlaçlar", "name_en": "Sentence Structure", "sort_order": 9},
]

TOPICS = [
    {
        "slug": "present-perfect-vs-past-simple",
        "category_slug": "tenses",
        "title_tr": "Present Perfect ve Past Simple Farkı",
        "summary_tr": "Sonucu şimdiki zamanla bağlantılı olaylarla, tamamen bitmiş ve net zaman belirtilen olayları ayırt etme.",
        "level": "b1",
        "exam_relevance": ["yds", "yokdil"],
        "sort_order": 1,
        "rule_content_md": (
            "**Present Perfect** (*have/has + V3*), geçmişte olan ama şimdiki zamanla bir bağlantısı olan "
            "(sonucu hâlâ geçerli olan, ne zaman olduğu önemli olmayan) olayları anlatır.\n\n"
            "**Past Simple** (*V2*), belirli/net bir zamanda olmuş ve tamamen bitmiş olayları anlatır — "
            "genelde bir zaman zarfıyla (*yesterday, in 2020, last week*) birlikte kullanılır.\n\n"
            "Kural olarak: cümlede net bir geçmiş zaman ifadesi varsa Past Simple, yoksa ve sonuç/etki hâlâ "
            "önemliyse Present Perfect kullanılır. `ever/never/already/yet/just/so far` gibi zarflar genelde "
            "Present Perfect ile birlikte gelir; `yesterday/ago/last...` gibi zarflar Past Simple ister."
        ),
        "example_sentences": [
            {"en": "I have lost my keys.", "tr": "Anahtarlarımı kaybettim (hâlâ kayıp, sonuç önemli)."},
            {"en": "I lost my keys yesterday, but I found them an hour later.", "tr": "Olay tamamen bitmiş, net zaman var."},
            {"en": "She has lived in Ankara for 10 years.", "tr": "Hâlâ Ankara'da yaşıyor — süre şimdiye kadar devam ediyor."},
            {"en": "She lived in Ankara from 2010 to 2015.", "tr": "Net başlangıç-bitiş, artık orada yaşamıyor."},
        ],
        "common_mistakes": [
            {
                "wrong": "I have seen him yesterday.",
                "correct": "I saw him yesterday.",
                "note": "Cümlede net bir zaman zarfı (yesterday) varsa Present Perfect kullanılmaz — Türkçe'de -mış/-dı ayrımı bu kuralla birebir örtüşmediği için bu hata çok sık yapılır.",
            },
            {
                "wrong": "I am living in this city since 2018.",
                "correct": "I have been living in this city since 2018.",
                "note": "'Since/for' ile süregelen bir durum anlatılırken Present Continuous değil Present Perfect (Continuous) kullanılır.",
            },
            {
                "wrong": "Have you finished it already?",
                "correct": "Have you finished it yet?",
                "note": "'Already' olumlu cümlelerde, 'yet' soru ve olumsuz cümlelerde kullanılır — Türkçe'de ikisi de kabaca 'hâlâ/zaten' gibi çevrildiği için karıştırılır.",
            },
        ],
    },
    {
        "slug": "past-simple-vs-continuous",
        "category_slug": "tenses",
        "title_tr": "Past Simple ve Past Continuous Farkı",
        "summary_tr": "Tamamlanmış bir olayla, başka bir olay sırasında devam etmekte olan bir eylemi ayırt etme.",
        "level": "a2",
        "exam_relevance": ["yds", "yokdil", "ielts", "toefl"],
        "sort_order": 2,
        "rule_content_md": (
            "**Past Simple** (*V2*), geçmişte olup bitmiş, tamamlanmış bir eylemi anlatır.\n\n"
            "**Past Continuous** (*was/were + V-ing*), geçmişte belirli bir anda DEVAM ETMEKTE olan bir eylemi, "
            "genelde başka (kısa) bir olay araya girdiğinde anlatır.\n\n"
            "En sık kalıp: *while + Past Continuous, Past Simple* — 'while' uzun/devam eden eylemi, kısa "
            "eylem ise Past Simple ile verilir. `when` genelde kısa eylemin başında kullanılır."
        ),
        "example_sentences": [
            {"en": "I was watching TV when the phone rang.", "tr": "TV izliyordum (devam eden), telefon çaldı (kısa/ani olay)."},
            {"en": "While she was cooking, I was setting the table.", "tr": "İki eylem aynı anda devam ediyor."},
            {"en": "He finished his homework and went to bed.", "tr": "İki ayrı, tamamlanmış olay art arda."},
        ],
        "common_mistakes": [
            {
                "wrong": "When I was arriving, she left.",
                "correct": "When I arrived, she left.",
                "note": "'Arrive' gibi anlık/kısa eylemler genelde Past Continuous'ta kullanılmaz — Türkçe'de '-yordu' ekinin geniş kullanımı bu hatayı tetikler.",
            },
            {
                "wrong": "I was knowing the answer.",
                "correct": "I knew the answer.",
                "note": "'Know, want, believe, understand' gibi durum bildiren (stative) fiiller normalde continuous formda kullanılmaz.",
            },
        ],
    },
    {
        "slug": "passive-present-past",
        "category_slug": "passive",
        "title_tr": "Edilgen Çatı: Present ve Past",
        "summary_tr": "Eylemi yapan değil, eylemden etkilenen öznenin öne çıktığı cümle yapısı.",
        "level": "b1",
        "exam_relevance": ["yds", "yokdil"],
        "sort_order": 1,
        "rule_content_md": (
            "Edilgen (passive) çatı, eylemi KİMİN yaptığından çok eylemden kimin/neyin etkilendiği önemliyse "
            "kullanılır — özellikle YDS'nin akademik/haber metinlerinde çok sık geçer.\n\n"
            "Yapı: **be (uygun zamanda) + V3**. Örn. Present Simple Passive: *am/is/are + V3*; "
            "Past Simple Passive: *was/were + V3*.\n\n"
            "Eylemi yapan kişi önemliyse cümlenin sonuna `by + kişi/nesne` eklenir; çoğu zaman (özellikle "
            "kim yaptığı belli değilse veya önemsizse) hiç eklenmez — bu edilgenin en sık kullanılma sebebidir."
        ),
        "example_sentences": [
            {"en": "The report is written every month.", "tr": "Rapor her ay yazılır (kim yazdığı önemli değil)."},
            {"en": "The bridge was built in 1990.", "tr": "Köprü 1990'da yapıldı."},
            {"en": "This novel was written by a famous author.", "tr": "Yazan kişi burada önemli, 'by' eklendi."},
        ],
        "common_mistakes": [
            {
                "wrong": "The letter was sending yesterday.",
                "correct": "The letter was sent yesterday.",
                "note": "Edilgende fiil her zaman V3 (past participle) formundadır, -ing formu değil — bu iki form Türkçe'de net bir karşılığı olmadığı için karıştırılır.",
            },
            {
                "wrong": "This book is reading by millions of people.",
                "correct": "This book is read by millions of people.",
                "note": "Aynı hata present passive'de de sık görülür: be + V-ing yerine be + V3 gerekir.",
            },
            {
                "wrong": "The company was founded by in 1980.",
                "correct": "The company was founded in 1980.",
                "note": "Eylemi yapan belirtilmiyorsa 'by' hiç kullanılmaz — gereksiz yere eklenmemeli.",
            },
        ],
    },
    {
        "slug": "conditionals-zero-first",
        "category_slug": "conditionals",
        "title_tr": "Zero ve First Conditional",
        "summary_tr": "Genel geçerlilikler (zero) ile gerçekleşmesi olası gelecek durumları (first) anlatan koşul cümleleri.",
        "level": "a2",
        "exam_relevance": ["yds", "yokdil", "ielts"],
        "sort_order": 1,
        "rule_content_md": (
            "**Zero Conditional** — *If + Present Simple, Present Simple*: her zaman doğru olan, genel geçer "
            "kurallar/bilimsel gerçekler için kullanılır. 'If' yerine 'when' de konulabilir, anlam değişmez.\n\n"
            "**First Conditional** — *If + Present Simple, will + V1*: gelecekte gerçekleşmesi mümkün/olası "
            "bir durumu ve sonucunu anlatır.\n\n"
            "Önemli kural: `if` cümleciğinde ASLA `will` kullanılmaz — sonuç kısmında kullanılır."
        ),
        "example_sentences": [
            {"en": "If you heat water to 100°C, it boils.", "tr": "Genel geçer bir gerçek (zero)."},
            {"en": "If it rains tomorrow, we will stay at home.", "tr": "Olası bir gelecek durumu (first)."},
            {"en": "If you don't study, you won't pass the exam.", "tr": "Olumsuz first conditional."},
        ],
        "common_mistakes": [
            {
                "wrong": "If it will rain, I will take an umbrella.",
                "correct": "If it rains, I will take an umbrella.",
                "note": "'If' cümleciğinde 'will' kullanılmaz — bu, Türkçe'de her iki cümlecikte de gelecek zaman kullanılmasından (yağarsA/yağacaksa) kaynaklanan çok yaygın bir hatadır.",
            },
            {
                "wrong": "If you mix red and blue, you will get purple.",
                "correct": "If you mix red and blue, you get purple.",
                "note": "Genel/bilimsel bir gerçek anlatılıyorsa (her zaman doğru) 'will' değil zero conditional (Present Simple) kullanılır.",
            },
        ],
    },
    {
        "slug": "conditionals-second",
        "category_slug": "conditionals",
        "title_tr": "Second Conditional (Hayali/Gerçek Dışı Durumlar)",
        "summary_tr": "Şimdiki zamanda gerçek olmayan ya da gerçekleşmesi çok düşük ihtimalli hayali durumlar.",
        "level": "b2",
        "exam_relevance": ["yds", "yokdil", "ielts", "toefl"],
        "sort_order": 2,
        "rule_content_md": (
            "**Second Conditional** — *If + Past Simple, would + V1*: şimdiki zamanda gerçek olmayan ya da "
            "gerçekleşme ihtimali çok düşük hayali bir durumu ve onun sonucunu anlatır.\n\n"
            "'If' cümleciğinde 'was' yerine tüm şahıslarla resmi/yazılı dilde `were` kullanılır "
            "(*If I were you...*) — bu, sınavlarda en sık test edilen noktalardan biridir."
        ),
        "example_sentences": [
            {"en": "If I had a million dollars, I would travel the world.", "tr": "Şu an gerçek değil, hayali bir durum."},
            {"en": "If I were you, I would apologize.", "tr": "Tavsiye vermek için çok kullanılan bir kalıp."},
            {"en": "She would help you if she had more time.", "tr": "Şu an vakti yok, hayali sonuç."},
        ],
        "common_mistakes": [
            {
                "wrong": "If I was rich, I would buy a house.",
                "correct": "If I were rich, I would buy a house.",
                "note": "Resmi/sınav İngilizcesinde second conditional'da 'was' yerine 'were' tercih edilir (konuşma dilinde 'was' da kabul görse de sınavlarda 'were' beklenir).",
            },
            {
                "wrong": "If I will have more money, I would travel more.",
                "correct": "If I had more money, I would travel more.",
                "note": "'If' cümleciğinde 'will' değil Past Simple kullanılır — first ve second conditional karıştırılınca ortaya çıkan tipik bir hata.",
            },
        ],
    },
    {
        "slug": "modals-obligation-advice",
        "category_slug": "modals",
        "title_tr": "Zorunluluk ve Tavsiye Modalları",
        "summary_tr": "must/have to ile zorunluluk, should/ought to ile tavsiye arasındaki anlam farkları.",
        "level": "b1",
        "exam_relevance": ["yds", "yokdil", "toefl"],
        "sort_order": 1,
        "rule_content_md": (
            "**must**: konuşanın kendi görüşüne göre zorunluluk (genelde kişisel/içsel bir zorunluluk).\n\n"
            "**have to**: dışarıdan gelen bir kural/zorunluluk (kanun, kurum kuralı, başkasının koyduğu kural).\n\n"
            "**mustn't**: yasak (yapmamalısın/yapman yasak) — **don't have to** ile karıştırılmamalı, o "
            "'gerek yok, zorunlu değilsin' demektir, tamamen farklı bir anlam taşır.\n\n"
            "**should / ought to**: tavsiye, öneri — zorunluluk değil."
        ),
        "example_sentences": [
            {"en": "I must finish this report today.", "tr": "Kendi kararım/görüşüm (kişisel zorunluluk)."},
            {"en": "Employees have to wear a uniform.", "tr": "Şirket kuralı (dışarıdan gelen zorunluluk)."},
            {"en": "You mustn't smoke here.", "tr": "Yasak."},
            {"en": "You don't have to come if you're busy.", "tr": "Zorunlu değil, gelmesen de olur."},
            {"en": "You should see a doctor.", "tr": "Tavsiye."},
        ],
        "common_mistakes": [
            {
                "wrong": "You don't must smoke here.",
                "correct": "You mustn't smoke here.",
                "note": "'Must' olumsuzu 'don't must' değil 'mustn't'tir; ayrıca 'mustn't' yasak anlamı taşır.",
            },
            {
                "wrong": "You mustn't come if you're busy — it's not necessary.",
                "correct": "You don't have to come if you're busy.",
                "note": "'mustn't' (yasak) ile 'don't have to' (gerek yok) anlamca tamamen farklıdır — Türkçe'de ikisi de 'gerekmiyor/olmaz' gibi çevrilebildiği için sıkça karıştırılır.",
            },
        ],
    },
    {
        "slug": "modals-deduction",
        "category_slug": "modals",
        "title_tr": "Çıkarım Modalları: must/might/can't",
        "summary_tr": "Elimizdeki kanıtlara göre bir şeyin ne kadar kesin olduğunu belirten modallar.",
        "level": "b2",
        "exam_relevance": ["yds", "yokdil", "toefl"],
        "sort_order": 2,
        "rule_content_md": (
            "Bir şeyin ne kadar KESİN olduğuna dair çıkarım (deduction) yaparken:\n\n"
            "**must** = eminim, kesinlikle öyle (güçlü olumlu çıkarım)\n\n"
            "**might/may/could** = olabilir (belirsiz, ihtimal)\n\n"
            "**can't** = eminim, kesinlikle değil (güçlü olumsuz çıkarım — 'mustn't' DEĞİL)\n\n"
            "Geçmişe dair çıkarımlarda: `must/might/can't + have + V3` kalıbı kullanılır."
        ),
        "example_sentences": [
            {"en": "She's not answering — she must be asleep.", "tr": "Güçlü olumlu çıkarım."},
            {"en": "He might be at the office; I'm not sure.", "tr": "Belirsiz."},
            {"en": "That can't be true — I just saw her yesterday.", "tr": "Güçlü olumsuz çıkarım."},
            {"en": "They must have left already; the lights are off.", "tr": "Geçmişe dair çıkarım."},
        ],
        "common_mistakes": [
            {
                "wrong": "That mustn't be true.",
                "correct": "That can't be true.",
                "note": "Çıkarımda güçlü olumsuzluk için 'mustn't' değil 'can't' kullanılır — 'mustn't' burada yasak anlamına gelir, çıkarım anlamı taşımaz.",
            },
            {
                "wrong": "He must slept badly last night.",
                "correct": "He must have slept badly last night.",
                "note": "Geçmişe dair çıkarımda modal'dan sonra 'have + V3' gelmesi unutulur — sadece V2/V1 ile bırakılır.",
            },
        ],
    },
    {
        "slug": "relative-clauses-defining",
        "category_slug": "clauses",
        "title_tr": "Tanımlayıcı İlgi Cümlecikleri (who/which/that)",
        "summary_tr": "Bir ismi tanımlamak/hangisi olduğunu belirtmek için kullanılan, virgülsüz ilgi cümlecikleri.",
        "level": "b1",
        "exam_relevance": ["yds", "yokdil"],
        "sort_order": 1,
        "rule_content_md": (
            "Tanımlayıcı (defining) ilgi cümlecikleri, bahsedilen ismin HANGİSİ olduğunu belirtmek için "
            "gereklidir — cümleden çıkarılırsa anlam eksik/belirsiz kalır, virgülle ayrılmaz.\n\n"
            "`who/that` — kişiler için; `which/that` — nesneler için; `whose` — iyelik/sahiplik için; "
            "`where` — yer için.\n\n"
            "Türkçe'nin SOV (özne-nesne-yüklem) yapısında ilgi cümleciği isimden ÖNCE gelirken "
            "(*gördüğüm adam*), İngilizce'de isimden SONRA gelir (*the man who I saw*) — bu, Türkçe "
            "konuşanların bu yapıda en çok zorlandığı noktadır."
        ),
        "example_sentences": [
            {"en": "The man who called you is my brother.", "tr": "Seni arayan adam kardeşimdir."},
            {"en": "This is the book that I told you about.", "tr": "Sana bahsettiğim kitap bu."},
            {"en": "The company whose products we sell is based in İzmir.", "tr": "Ürünlerini sattığımız şirket."},
        ],
        "common_mistakes": [
            {
                "wrong": "The man who I saw him yesterday is a doctor.",
                "correct": "The man who(m) I saw yesterday is a doctor.",
                "note": "İlgi cümleciğinde ilgi zamiri zaten öznenin/nesnenin yerini tuttuğu için ayrıca 'him' gibi bir zamir tekrar EKLENMEZ — Türkçe'de bu tekrar doğal geldiği için sık yapılan bir hatadır.",
            },
            {
                "wrong": "The man which called you is my brother.",
                "correct": "The man who called you is my brother.",
                "note": "Kişiler için 'which' değil 'who' (veya 'that') kullanılır.",
            },
        ],
    },
    {
        "slug": "articles",
        "category_slug": "articles-nouns",
        "title_tr": "Artikel Kullanımı: a/an, the ve Artikelsiz",
        "summary_tr": "Türkçe'de karşılığı olmayan artikel sisteminin temel mantığı — ne zaman a/an, ne zaman the, ne zaman hiç artikel.",
        "level": "b1",
        "exam_relevance": ["yds", "yokdil", "ielts", "toefl"],
        "sort_order": 1,
        "rule_content_md": (
            "Türkçe'de artikel sistemi olmadığı için bu, Türkçe konuşanlar için İngilizce'nin en zor "
            "noktalarından biridir — bu yüzden neredeyse her sınavda mutlaka test edilir.\n\n"
            "**a/an**: ilk kez bahsedilen, belirsiz, tekil sayılabilir bir isim için (*a book*).\n\n"
            "**the**: hem konuşan hem dinleyenin HANGİ isimden bahsedildiğini bildiği durumlar için "
            "(daha önce bahsedilmiş, tek olan, bağlamdan belli olan).\n\n"
            "**Artikelsiz (Ø)**: çoğul veya sayılamayan isimlerden genel olarak bahsederken (*I like music*, "
            "*Dogs are loyal*), çoğu özel isimde, ve soyut/genel kavramlarda."
        ),
        "example_sentences": [
            {"en": "I saw a cat in the garden. The cat was black.", "tr": "İlk bahsedişte 'a', ikincisinde 'the' (artık hangisi olduğu belli)."},
            {"en": "Dogs are loyal animals.", "tr": "Genel bir ifade — artikelsiz çoğul."},
            {"en": "I love music.", "tr": "Sayılamayan isim, genel anlamda — artikelsiz."},
            {"en": "The Earth revolves around the Sun.", "tr": "Tek olan varlıklar için 'the'."},
        ],
        "common_mistakes": [
            {
                "wrong": "I like the music.",
                "correct": "I like music.",
                "note": "Genel anlamda (belirli bir müzik değil, müzik kavramı) bahsederken 'the' kullanılmaz — Türkçe'de belirlilik eki olmadığı için bu ayrımı hissetmek zordur.",
            },
            {
                "wrong": "She is the best student in class.",
                "correct": "She is the best student in the class.",
                "note": "Belirli, tek bir sınıftan bahsedildiği için 'class' önünde 'the' gerekir.",
            },
            {
                "wrong": "I want to be a engineer.",
                "correct": "I want to be an engineer.",
                "note": "Ünlü SESLE başlayan kelimelerden önce 'a' değil 'an' kullanılır (yazımdan değil telaffuzdan bakılır).",
            },
        ],
    },
    {
        "slug": "reported-speech-statements-questions",
        "category_slug": "reported-speech",
        "title_tr": "Aktarılan Cümle: İfadeler ve Sorular",
        "summary_tr": "Birinin söylediklerini kendi cümlemize aktarırken yapılan zaman kayması ve söz dizimi değişiklikleri.",
        "level": "b2",
        "exam_relevance": ["yds", "yokdil"],
        "sort_order": 1,
        "rule_content_md": (
            "Birinin sözünü (genelde geçmiş zamanda bir bildirme fiiliyle: *said, told, asked*) aktarırken "
            "iki temel değişiklik olur:\n\n"
            "**1) Zaman kayması (backshift)**: present simple → past simple, present perfect → past perfect, "
            "will → would, can → could, vb. (fiil bir kademe geriye kayar).\n\n"
            "**2) Soru cümlelerinde düz cümle sırası**: aktarılan sorularda özne-yüklem YER DEĞİŞTİRMEZ ve "
            "yardımcı fiil (do/does/did) düşer — normal bir düz cümle gibi kurulur, soru işareti de konmaz. "
            "Wh- sorularda soru kelimesi (*where, what, why*) korunur; evet/hayır sorularında `if/whether` "
            "eklenir."
        ),
        "example_sentences": [
            {"en": "\"I am tired,\" she said. → She said (that) she was tired.", "tr": "am → was (backshift)."},
            {"en": "\"Where do you live?\" he asked. → He asked where I lived.", "tr": "Soru sırası düzleşti, do/does düştü."},
            {"en": "\"Are you coming?\" she asked. → She asked if I was coming.", "tr": "Evet/hayır sorusuna 'if' eklendi."},
        ],
        "common_mistakes": [
            {
                "wrong": "He asked where did I live.",
                "correct": "He asked where I lived.",
                "note": "Aktarılan sorularda yardımcı fiil (did/do/does) kullanılmaz ve özne-yüklem sırası düz cümledeki gibi kalır — Türkçe'de doğrudan aktarım daha az kullanıldığı için bu kural çoğu zaman atlanır.",
            },
            {
                "wrong": "She asked if am I ready.",
                "correct": "She asked if I was ready.",
                "note": "Aynı hata: soru sözcük sırası korunmamalı, ayrıca zaman kayması (am → was) da unutulmamalı.",
            },
        ],
    },
    {
        "slug": "phrasal-verbs",
        "category_slug": "phrasal-vocab",
        "title_tr": "Deyimsel Fiiller (Phrasal Verbs) — Temel Mantık",
        "summary_tr": "Fiil + edat/zarf birleşiminin genelde kelimelerin tek tek anlamından tamamen farklı bir anlam taşıması.",
        "level": "b2",
        "exam_relevance": ["yds", "ielts", "toefl"],
        "sort_order": 1,
        "rule_content_md": (
            "Deyimsel fiiller (*phrasal verbs*), bir fiille bir veya iki edat/zarfın (particle) birleşiminden "
            "oluşur ve çoğu zaman anlamı, parçaların tek tek anlamından TAHMİN EDİLEMEZ — bu yüzden ezber "
            "gerektirir, mantıkla çözülemez.\n\n"
            "Bazıları AYRILABİLİR (nesne fiil ile edat arasına girebilir: *turn the light off* / *turn off "
            "the light*), bazıları AYRILAMAZ (*look after the kids*, asla *look the kids after* denmez). "
            "Nesne zamir ise (it, them) ayrılabilir fiillerde ARAYA GİRMESİ ZORUNLUDUR: *turn it off*, "
            "*turn off it* yanlıştır."
        ),
        "example_sentences": [
            {"en": "Can you turn off the light? / Can you turn the light off?", "tr": "Ayrılabilir — ikisi de doğru."},
            {"en": "Can you turn it off?", "tr": "Zamirle mutlaka ayrılır — 'turn off it' yanlış."},
            {"en": "She looks after her little brother.", "tr": "Ayrılamaz fiil."},
            {"en": "I ran into an old friend yesterday.", "tr": "'Rastlamak' — kelimelerin tek tek anlamından tahmin edilemez."},
        ],
        "common_mistakes": [
            {
                "wrong": "Can you turn off it?",
                "correct": "Can you turn it off?",
                "note": "Ayrılabilir phrasal verb'lerde nesne ZAMİR ise mutlaka fiille edat arasına girer.",
            },
            {
                "wrong": "She looks her little brother after.",
                "correct": "She looks after her little brother.",
                "note": "'Look after' gibi bazı phrasal verb'ler asla ayrılmaz — hangilerinin ayrılabilir/ayrılamaz olduğu ezberlenmelidir.",
            },
        ],
    },
    {
        "slug": "word-formation-collocations",
        "category_slug": "phrasal-vocab",
        "title_tr": "Kelime Türetme ve Sık Kullanılan Kelime Eşleşmeleri",
        "summary_tr": "Ek (suffix/prefix) ile kelime türü değiştirme ve doğal kelime eşleşmelerini (collocation) tanıma.",
        "level": "b2",
        "exam_relevance": ["yds", "yokdil"],
        "sort_order": 2,
        "rule_content_md": (
            "**Kelime türetme (word formation)**: aynı kökten ek alarak isim/sıfat/fiil/zarf türetilir — "
            "YDS'de özellikle sık çıkan bir soru tipidir. Örn. *decide (fiil) → decision (isim) → decisive "
            "(sıfat) → decisively (zarf)*.\n\n"
            "**Collocation (kelime eşleşmesi)**: bazı kelimeler doğal olarak belirli kelimelerle birlikte "
            "kullanılır, başka (anlamca yakın) bir kelimeyle değil — bu, dilbilgisi kuralı değil, dilin "
            "alışkanlığıdır ve ezberlenmesi gerekir. Örn. *make a decision* (doğru) ama *do a decision* "
            "(yanlış); *heavy rain* (doğru) ama *strong rain* (yanlış, doğal değil)."
        ),
        "example_sentences": [
            {"en": "He made a difficult decision. (NOT: did a decision)", "tr": "make + decision doğal eşleşme."},
            {"en": "I take full responsibility. (NOT: I make full responsibility)", "tr": "take + responsibility."},
            {"en": "She has a successful career. (success → successful)", "tr": "İsimden sıfat türetme."},
            {"en": "It was an economically difficult year. (economy → economically)", "tr": "Sıfattan zarf türetme."},
        ],
        "common_mistakes": [
            {
                "wrong": "I did a mistake.",
                "correct": "I made a mistake.",
                "note": "'Yapmak' fiili Türkçe'de tek bir kelimeyken İngilizce'de bağlama göre 'make' veya 'do' olarak ikiye ayrılır — bu ikisinin hangi kelimelerle eşleştiği ezberlenmelidir.",
            },
            {
                "wrong": "This is a very economic decision for the family. (kastedilen: tasarruflu)",
                "correct": "This is a very economical decision for the family.",
                "note": "'Economic' (ekonomiyle ilgili) ile 'economical' (tutumlu/az harcayan) farklı anlamlar taşır — aynı kökten türeyen kelimelerin anlamları da birbirinden farklılaşabilir.",
            },
        ],
    },
    {
        "slug": "connectors-linking-words",
        "category_slug": "sentence-structure",
        "title_tr": "Bağlaçlar: Zıtlık, Sebep-Sonuç ve Ekleme",
        "summary_tr": "although/despite, because/because of, in addition gibi bağlaçların doğru kullanımı ve birbirine karıştırılmaması.",
        "level": "b2",
        "exam_relevance": ["yds", "yokdil"],
        "sort_order": 1,
        "rule_content_md": (
            "Sınavlarda en sık karıştırılan bağlaç grupları:\n\n"
            "**Zıtlık**: `although/though/even though` + ÖZNE + YÜKLEM (tam cümle) — ama `despite/in spite of` "
            "+ İSİM veya V-ing (asla tam cümle almaz).\n\n"
            "**Sebep**: `because` + ÖZNE + YÜKLEM (tam cümle) — ama `because of/due to` + İSİM.\n\n"
            "**Ekleme**: `in addition/furthermore/moreover` yeni bir cümle başlatır (genelde noktalı virgül "
            "veya nokta ile önce); `and` cümle içinde iki öğeyi bağlar."
        ),
        "example_sentences": [
            {"en": "Although it was raining, we went out.", "tr": "Tam cümle ile."},
            {"en": "Despite the rain, we went out.", "tr": "Sadece isimle."},
            {"en": "We went out because it was sunny.", "tr": "Tam cümle."},
            {"en": "We went out because of the sunny weather.", "tr": "Sadece isimle."},
            {"en": "The project was late. In addition, it was over budget.", "tr": "Yeni cümle başlatır."},
        ],
        "common_mistakes": [
            {
                "wrong": "Despite it was raining, we went out.",
                "correct": "Despite the rain, we went out. / Although it was raining, we went out.",
                "note": "'Despite' asla tam cümle almaz, sadece isim veya -ing alır — bu iki grup İngilizce öğrenen Türkçe konuşanların en sık karıştırdığı bağlaç çiftidir.",
            },
            {
                "wrong": "We were late because of we missed the bus.",
                "correct": "We were late because we missed the bus. / We were late because of missing the bus.",
                "note": "'Because of' isim alır, tam cümle almaz — tam cümle için düz 'because' kullanılmalı.",
            },
        ],
    },
]


def run() -> None:
    slug_to_category_id: dict[str, str] = {}

    for cat in CATEGORIES:
        existing = (
            supabase_admin.table("grammar_categories").select("id").eq("slug", cat["slug"]).execute()
        )
        if existing.data:
            slug_to_category_id[cat["slug"]] = existing.data[0]["id"]
            print(f"[SKIP] category already exists: {cat['slug']}")
            continue
        result = supabase_admin.table("grammar_categories").insert(cat).execute()
        slug_to_category_id[cat["slug"]] = result.data[0]["id"]
        print(f"[OK] category created: {cat['slug']}")

    created, skipped = 0, 0
    for topic in TOPICS:
        existing = (
            supabase_admin.table("grammar_topics").select("id").eq("slug", topic["slug"]).execute()
        )
        if existing.data:
            print(f"[SKIP] topic already exists: {topic['slug']}")
            skipped += 1
            continue

        category_slug = topic.pop("category_slug")
        row = {
            **topic,
            "category_id": slug_to_category_id[category_slug],
            "status": "published",
            "source_type": "manual",
        }
        supabase_admin.table("grammar_topics").insert(row).execute()
        print(f"[OK] topic created: {row['slug']}")
        created += 1

    print(f"\nTamamlandı — {created} yeni konu, {skipped} zaten mevcuttu.")


if __name__ == "__main__":
    run()
