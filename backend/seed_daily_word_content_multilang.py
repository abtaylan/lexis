"""
backend/seed_daily_word_content_multilang.py

daily_word_content havuzunu, seed_daily_word_content.py'nin ilk 30 kelimesine
EK OLARAK genişletir (6 Eylül 2026, kullanıcı isteği: "db de kelime havuzu
daha fazla olmalı" + "sadece ingilizce değil... hedef dil arapça ise kelime
arapça kelime olacak"). Migration 020'den (çok dilli yeniden yapılandırma)
SONRA yazıldığı için buradaki kayıtlar YENİ kolon adlarını kullanır:
meaning_target/meaning_native, example_1_target/native, example_2_target/
native, grammar_note_native, target_lang, native_lang.

İçerik:
  - EN_TR: 15 ek İngilizce/Türkçe kelime (YDS/YÖKDİL/TOEFL'de sık karışan
    sıfat/kelime çiftleri — affect/effect, economic/economical, vb.)
  - AR_TR: 10 temel Arapça kelime (ana dili Türkçe, hedef dili Arapça olan
    kullanıcılar için — tr→ar en büyük ikinci kullanıcı grubu)

Bu script zaten Supabase'e mcp__Supabase__execute_sql ile canlı olarak
uygulandı (bkz. /tmp/more_words_en.sql, /tmp/more_words_ar.sql); bu dosya
repo'da tekrarlanabilir bir kaynak olarak sonradan eklendi — tekrar
çalıştırmak word_exists() kontrolü sayesinde güvenlidir (zaten var olan
kelimeleri atlar).

Kullanım (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python seed_daily_word_content_multilang.py
"""

from app.core.database import supabase_admin

EN_TR: list[dict] = [
    dict(word="affect", meaning_target="affect (verb) = to influence or change something; effect (noun) = a result caused by something — the most common word-class confusion in English",
         meaning_native="etkilemek (fiil) / etki, sonuç (isim) — İngilizcede en sık karıştırılan kelime çifti",
         example_1_target="The bad weather affected our travel plans.", example_1_native="Kötü hava koşulları seyahat planlarımızı etkiledi.",
         example_2_target="The new policy had a positive effect on sales.", example_2_native="Yeni politika satışlar üzerinde olumlu bir etki yarattı.",
         grammar_note_native="'Affect' neredeyse her zaman FİİLDİR ('etkilemek'), 'effect' ise neredeyse her zaman İSİMDİR ('etki, sonuç') — YDS'de bu ikisi doğrudan birbirinin yerine kullandırılarak sorulur. Kısa hatırlatma: cümlede fiil boşluğu varsa 'affect', isim boşluğu varsa (genelde 'a/an/the' veya 'have an ... on' kalıbıyla) 'effect' doğru cevaptır: 'have an effect on' kalıbı çok sık geçer."),
    dict(word="economic", meaning_target="economic = relating to the economy; economical = using money/resources efficiently, not wasteful",
         meaning_native="economic = ekonomiyle ilgili; economical = tutumlu, idareli (kaynak israf etmeyen)",
         example_1_target="The government announced new economic reforms.", example_1_native="Hükümet yeni ekonomik reformlar açıkladı.",
         example_2_target="This car is very economical — it uses very little fuel.", example_2_native="Bu araba çok ekonomik/tutumlu — çok az yakıt tüketiyor.",
         grammar_note_native="'Economic' genel olarak EKONOMİYLE İLGİLİ anlamına gelir (economic crisis, economic policy), 'economical' ise TASARRUFLU/İSRAF ETMEYEN anlamına gelir. YDS'de '-ic' ve '-ical' ekiyle biten sıfat çiftleri (economic/economical, historic/historical, classic/classical) sık sorulan bir kalıptır — her çiftin anlamı farklıdır, ezbere bilinmesi gerekir."),
    dict(word="historic", meaning_target="historic = important in history, famous; historical = relating to history/the past in general (not necessarily famous)",
         meaning_native="historic = tarihi öneme sahip, ünlü; historical = tarihle ilgili, geçmişe ait (illa ünlü olması gerekmez)",
         example_1_target="The signing of the treaty was a historic moment.", example_1_native="Antlaşmanın imzalanması tarihi bir andı.",
         example_2_target="The museum has a large collection of historical documents.", example_2_native="Müzenin geniş bir tarihi belge koleksiyonu var.",
         grammar_note_native="'Historic' = ÖNEMLİ, akılda kalıcı bir tarihi olay/an için kullanılır ('a historic victory'). 'Historical' = sadece geçmişe/tarihe ait olan, illa önemli olması gerekmeyen her şey için kullanılır ('historical records'). Bu ayrım economic/economical ile aynı mantıkta: '-ic' daha dar/özel bir anlam, '-ical' daha genel bir anlam taşır."),
    dict(word="sensible", meaning_target="sensible = showing good judgment, practical; sensitive = easily affected emotionally or physically, quick to react",
         meaning_native="sensible = mantıklı, sağduyulu; sensitive = hassas, duyarlı (duygusal ya da fiziksel olarak)",
         example_1_target="It was a sensible decision to leave early.", example_1_native="Erken ayrılmak mantıklı bir karardı.",
         example_2_target="She is very sensitive about criticism.", example_2_native="Eleştirilere karşı çok hassas.",
         grammar_note_native="'Sensible' Türkçe 'hissi/duyarlı' kelimesine benzediği için genelde YANLIŞLIKLA 'duygusal' sanılır — oysa 'mantıklı, sağduyulu' anlamına gelir (false friend/yanıltıcı ikiz tuzağı). 'Duyarlı, hassas' anlamı için doğru kelime 'sensitive'dir. YDS'de bu tür 'false friend' kelime çiftleri özellikle dikkat gerektirir."),
    dict(word="considerate", meaning_target="considerate = thoughtful of others' feelings; considerable = large in amount or degree",
         meaning_native="considerate = düşünceli, saygılı (başkalarının hislerine karşı); considerable = hatırı sayılır, önemli miktarda",
         example_1_target="It was very considerate of him to help the elderly woman.", example_1_native="Yaşlı kadına yardım etmesi çok düşünceliydi.",
         example_2_target="The company invested a considerable amount of money.", example_2_native="Şirket hatırı sayılır miktarda para yatırdı.",
         grammar_note_native="'Considerate' İNSANLARIN DAVRANIŞI için kullanılır (başkalarını düşünen, saygılı), 'considerable' ise MİKTAR/DERECE için kullanılır (büyük, önemli ölçüde). İkisi de 'consider' fiilinden türer ama tamamen farklı anlamlara gider — YDS'nin klasik '-ate/-able' sıfat eki tuzaklarından biridir."),
    dict(word="successful", meaning_target="successful = having achieved success; successive = following one after another, consecutive",
         meaning_native="successful = başarılı; successive = art arda gelen, ardışık",
         example_1_target="She became a successful entrepreneur.", example_1_native="Başarılı bir girişimci oldu.",
         example_2_target="The team won the championship for three successive years.", example_2_native="Takım şampiyonluğu üç yıl art arda kazandı.",
         grammar_note_native="'Successful' 'başarı' (success) ile ilgilidir, 'successive' ise 'ardışıklık, birbirini takip etme' (succession) ile ilgilidir — kökleri benzer göründüğü için karıştırılır ama anlamları tamamen alakasızdır. 'Successive' genelde bir sayı/zaman ifadesiyle birlikte kullanılır: 'three successive years', 'on successive days'."),
    dict(word="continuous", meaning_target="continuous = happening without any interruption or break; continual = happening repeatedly, with breaks in between",
         meaning_native="continuous = kesintisiz, aralıksız devam eden; continual = tekrar tekrar olan (aralarla), sürekli tekrarlanan",
         example_1_target="There has been continuous rain for the last 12 hours.", example_1_native="Son 12 saattir kesintisiz yağmur yağıyor.",
         example_2_target="His continual complaints annoyed everyone.", example_2_native="Onun sürekli (tekrar tekrar) şikayetleri herkesi rahatsız etti.",
         grammar_note_native="'Continuous' HİÇ ARA VERMEDEN devam eden bir şey için kullanılır (tek, kesintisiz bir süreç). 'Continual' ise ARALARLA TEKRARLANAN bir şey için kullanılır (birçok kez, ama aralıklarla). YDS'de bu ayrım, 'Present Continuous' dilbilgisi terimiyle karıştırılmaması gereken ayrı bir kelime çiftidir."),
    dict(word="respectful", meaning_target="respectful = showing respect or courtesy; respective = belonging separately to each person/thing mentioned",
         meaning_native="respectful = saygılı; respective = kendine ait, ayrı ayrı (her birine özgü)",
         example_1_target="Students should be respectful to their teachers.", example_1_native="Öğrenciler öğretmenlerine karşı saygılı olmalıdır.",
         example_2_target="The players returned to their respective teams.", example_2_native="Oyuncular kendi takımlarına (her biri kendi takımına) geri döndü.",
         grammar_note_native="'Respectful' 'saygı göstermek' (respect) fiilinden gelir ve bir DAVRANIŞ sıfatıdır. 'Respective' ise 'her birine ayrı ayrı ait olan' anlamına gelir ve genelde çoğul bir isimden önce kullanılır: 'their respective countries' = 'kendi (ayrı ayrı) ülkeleri'. Bu iki kelime yazılışça çok benzer olduğu için sınavlarda sık karıştırılır."),
    dict(word="imaginary", meaning_target="imaginary = existing only in the imagination, not real; imaginative = having or showing a lot of creative imagination",
         meaning_native="imaginary = hayali, gerçek olmayan; imaginative = yaratıcı hayal gücüne sahip",
         example_1_target="Children often have imaginary friends.", example_1_native="Çocukların genellikle hayali arkadaşları olur.",
         example_2_target="She wrote a very imaginative short story.", example_2_native="Çok yaratıcı bir kısa öykü yazdı.",
         grammar_note_native="'Imaginary' bir ŞEYİN GERÇEK OLMADIĞINI belirtir (var olmayan, uydurma). 'Imaginative' ise bir KİŞİNİN YARATICILIĞINI belirtir (hayal gücü kuvvetli, özgün fikirler üreten). 'Imaginary' bir nesneyi/varlığı nitelerken, 'imaginative' bir kişiyi ya da onun ürettiği eseri niteler."),
    dict(word="comprehensive", meaning_target="comprehensive = complete, including everything necessary; comprehensible = able to be understood, clear",
         meaning_native="comprehensive = kapsamlı, eksiksiz; comprehensible = anlaşılır, kavranabilir",
         example_1_target="The report gives a comprehensive overview of the market.", example_1_native="Rapor, pazara dair kapsamlı bir genel bakış sunuyor.",
         example_2_target="The instructions were written in simple, comprehensible language.", example_2_native="Talimatlar basit, anlaşılır bir dille yazılmıştı.",
         grammar_note_native="'Comprehensive' bir şeyin NE KADAR KAPSAMLI/EKSİKSİZ olduğunu anlatır. 'Comprehensible' ise bir şeyin NE KADAR ANLAŞILIR olduğunu anlatır — aynı kökten türeyen ('comprehend') ama iki farklı anlama giden bir çift, YDS'nin '-ive/-ible' ek tuzaklarından biridir."),
    dict(word="confident", meaning_target="confident = feeling sure of oneself or a fact; confidential = meant to be kept secret, private",
         meaning_native="confident = kendine güvenen, emin; confidential = gizli, mahrem (saklı tutulması gereken)",
         example_1_target="She felt confident about passing the exam.", example_1_native="Sınavı geçme konusunda kendinden emindi.",
         example_2_target="This is confidential information and must not be shared.", example_2_native="Bu gizli bir bilgidir ve paylaşılmamalıdır.",
         grammar_note_native="'Confident' bir KİŞİNİN kendine güvenini anlatır ('I am confident that...'). 'Confidential' ise bir BİLGİNİN gizli/saklı tutulması gerektiğini anlatır ('confidential documents'). İkisi de 'confide' (güvenmek, sır vermek) kökünden gelir ama biri kişi, diğeri bilgi için kullanılır."),
    dict(word="industrial", meaning_target="industrial = relating to industry/manufacturing; industrious = hard-working, diligent",
         meaning_native="industrial = sanayiyle ilgili; industrious = çalışkan, gayretli",
         example_1_target="The city has several large industrial zones.", example_1_native="Şehirde birkaç büyük sanayi bölgesi var.",
         example_2_target="She is known for being industrious and never gives up.", example_2_native="Çalışkan olması ve asla pes etmemesiyle tanınır.",
         grammar_note_native="'Industrial' SANAYİ/ÜRETİM ile ilgili bir sıfattır (industrial revolution). 'Industrious' ise bir KİŞİNİN çalışkanlığını anlatan bir sıfattır — 'industry' kelimesinin hem 'sanayi' hem eski kullanımda 'çalışkanlık' anlamına gelmesinden türeyen iki farklı sıfat."),
    dict(word="literary", meaning_target="literary = relating to literature, books; literal = the exact, basic meaning of a word, not figurative",
         meaning_native="literary = edebi, edebiyatla ilgili; literal = kelimenin gerçek/birebir anlamı, mecazi olmayan",
         example_1_target="She has a deep interest in literary criticism.", example_1_native="Edebiyat eleştirisine derin bir ilgisi var.",
         example_2_target="Don't take his words in the literal sense — he was joking.", example_2_native="Sözlerini birebir/gerçek anlamıyla alma — şaka yapıyordu.",
         grammar_note_native="'Literary' EDEBİYATLA ilgilidir (literary work = edebi eser). 'Literal' ise bir kelimenin/ifadenin GERÇEK, MECAZ OLMAYAN anlamını belirtir ('literal translation' = birebir çeviri). Bu ikisi yazılışça benzer ama tamamen farklı kavram alanlarına aittir — YDS'de dikkat gerektiren bir çifttir."),
    dict(word="momentary", meaning_target="momentary = lasting for a very short time; momentous = very important, having great significance",
         meaning_native="momentary = anlık, çok kısa süren; momentous = çok önemli, tarihi öneme sahip",
         example_1_target="There was a momentary silence before she answered.", example_1_native="Cevap vermeden önce anlık bir sessizlik oldu.",
         example_2_target="Signing the peace agreement was a momentous decision.", example_2_native="Barış anlaşmasını imzalamak çok önemli bir karardı.",
         grammar_note_native="'Momentary' 'moment' (an) kelimesinden gelir ve SÜRE olarak çok kısa olan bir şeyi anlatır. 'Momentous' ise ÖNEM açısından büyük olan bir şeyi anlatır — ikisi de 'moment' köküyle bağlantılıdır ama anlamları zıt yönlere gitmiştir (kısalık vs. önem)."),
    dict(word="credible", meaning_target="credible = believable, convincing; credulous = too willing to believe things, easily fooled",
         meaning_native="credible = inandırıcı, güvenilir; credulous = saf, her şeye kolay inanan (kolay kandırılan)",
         example_1_target="She gave a credible explanation for her absence.", example_1_native="Devamsızlığı için inandırıcı bir açıklama yaptı.",
         example_2_target="He is so credulous that he believes every rumor he hears.", example_2_native="O kadar saf ki duyduğu her söylentiye inanıyor.",
         grammar_note_native="'Credible' bir ŞEYİN/BİLGİNİN inandırıcı olduğunu belirtir (bir açıklama, kanıt, tanık için). 'Credulous' ise bir KİŞİNİN çok kolay inanan, saf olduğunu belirtir (genelde olumsuz bir anlam taşır) — Latince 'credere' (inanmak) kökünden gelen, biri nesneye biri kişiye uygulanan klasik bir çifttir."),
]

AR_TR: list[dict] = [
    dict(word="بيت", meaning_target="المكان الذي يسكن فيه الإنسان أو العائلة", meaning_native="ev (bir kişinin veya ailenin yaşadığı yer)",
         example_1_target="بيتي كبير وجميل.", example_1_native="Evim büyük ve güzel.",
         example_2_target="أين بيتك؟", example_2_native="Evin nerede?",
         grammar_note_native="'بيت' eril (müzekker) bir isimdir. Belirli hale getirmek için başına 'ال' (elif-lam) takısı eklenir: 'البيت' = 'o ev / belli olan ev'. Arapçada İngilizce/Türkçedeki gibi ayrı bir belirsiz artikel (a/an, bir) yoktur — isim yalın haldeyken zaten belirsizdir: 'بيت' = 'bir ev'."),
    dict(word="مدرسة", meaning_target="مكان يذهب إليه الطلاب للتعلم", meaning_native="okul (öğrencilerin öğrenmeye gittiği yer)",
         example_1_target="أذهب إلى المدرسة كل يوم.", example_1_native="Her gün okula gidiyorum.",
         example_2_target="المدرسة قريبة من بيتي.", example_2_native="Okul evime yakın.",
         grammar_note_native="'مدرسة' dişil (müennes) bir isimdir — sonundaki yuvarlak te (ة) çoğu dişil ismin belirtisidir. Dişil isimlerle kullanılan sıfatlar da dişil formda olmalıdır: 'مدرسة كبيرة' (büyük bir okul) — 'كبيرة' sıfatı da ة ile bitiyor, çünkü 'مدرسة' dişil."),
    dict(word="كتاب", meaning_target="أوراق مكتوبة أو مطبوعة ومجموعة معًا", meaning_native="kitap",
         example_1_target="قرأت هذا الكتاب في أسبوع.", example_1_native="Bu kitabı bir haftada okudum.",
         example_2_target="الكتاب على الطاولة.", example_2_native="Kitap masanın üzerinde.",
         grammar_note_native="'كتاب' eril bir isimdir, çoğulu düzensizdir (kırık çoğul): 'كتب' (kutub) = 'kitaplar'. Arapçada birçok isim düzenli bir çoğul eki almaz, kelimenin kalıbı tamamen değişir — bu yüzden her ismin çoğulu ayrıca öğrenilmelidir."),
    dict(word="طعام", meaning_target="كل ما يؤكل", meaning_native="yemek, gıda",
         example_1_target="الطعام لذيذ جدًا.", example_1_native="Yemek çok lezzetli.",
         example_2_target="أحب الطعام التركي.", example_2_native="Türk yemeğini seviyorum.",
         grammar_note_native="'طعام' sayılamayan (cins isim) bir isimdir, Türkçedeki 'yemek/gıda' gibi genel bir kategoriyi ifade eder. 'أحب الطعام التركي' cümlesinde sıfat ('التركي') isimden SONRA gelir ve isimle aynı şekilde belirli olmalıdır — Arapçada sıfatlar Türkçenin aksine isimden sonra kullanılır."),
    dict(word="ماء", meaning_target="سائل شفاف نشربه", meaning_native="su",
         example_1_target="أشرب الماء كل صباح.", example_1_native="Her sabah su içerim.",
         example_2_target="الماء بارد جدًا.", example_2_native="Su çok soğuk.",
         grammar_note_native="'ماء' düzensiz bir isimdir ve belirlilik takısı aldığında 'الماء' (el-mā') şeklinde okunur. Arapçada klasik fiil cümlesinde özne genelde fiilden SONRA gelir (fiil-özne-nesne dizilişi) — ama günlük konuşmada 'أنا أشرب الماء' gibi özne-fiil sırası da yaygındır."),
    dict(word="صديق", meaning_target="شخص تحبه وتثق به", meaning_native="arkadaş, dost",
         example_1_target="هو صديقي منذ الطفولة.", example_1_native="O, çocukluğumdan beri arkadaşım.",
         example_2_target="لدي أصدقاء كثيرون.", example_2_native="Birçok arkadaşım var.",
         grammar_note_native="'صديق' eril, dişili 'صديقة' (ṣadīqa)'dır — Arapçada birçok isim bu şekilde ة eklenerek dişil yapılır. Çoğulu 'أصدقاء' kırık çoğuldur. 'لدي' kelimesi 'bende var, sahibim' anlamına gelen bir sahiplik yapısıdır — Arapçada ayrı bir 'sahip olmak' fiili yerine sıkça bu tür edat yapıları kullanılır."),
    dict(word="عمل", meaning_target="نشاط يقوم به الإنسان لكسب المال أو لتحقيق هدف", meaning_native="iş, çalışma",
         example_1_target="أذهب إلى العمل الساعة الثامنة.", example_1_native="Saat sekizde işe gidiyorum.",
         example_2_target="هذا العمل صعب.", example_2_native="Bu iş zor.",
         grammar_note_native="'عمل' hem isim ('iş') hem de fiil kökü ('yapmak, çalışmak') olarak kullanılabilen çok yönlü bir kelimedir. 'الساعة الثامنة' (saat sekiz) ifadesinde sayının sıra sayısı (ثامنة = sekizinci) kullanıldığına dikkat — Arapçada saat söylerken asıl sayı değil sıra sayısı tercih edilir."),
    dict(word="وقت", meaning_target="المدة التي تمر، أو لحظة معينة", meaning_native="zaman, vakit",
         example_1_target="ليس لدي وقت الآن.", example_1_native="Şu an vaktim yok.",
         example_2_target="الوقت مهم جدًا.", example_2_native="Zaman çok önemli.",
         grammar_note_native="'ليس لدي وقت' cümlesi 'ليس' (olumsuzluk edatı) + 'لدي' (bende var) yapısıyla 'bende yok/sahip değilim' anlamı kurar — Arapçada isim cümlelerini olumsuz yapmanın standart yollarından biridir. 'الآن' (şimdi) zaman zarfı cümle sonunda kullanılabilir, Türkçedeki gibi konum esnektir."),
    dict(word="مهم", meaning_target="له قيمة كبيرة أو تأثير كبير", meaning_native="önemli",
         example_1_target="هذا الموضوع مهم جدًا.", example_1_native="Bu konu çok önemli.",
         example_2_target="الصحة أهم من المال.", example_2_native="Sağlık paradan daha önemlidir.",
         grammar_note_native="'أهم' ('daha önemli/en önemli'), 'مهم' sıfatının üstünlük/karşılaştırma (ism-i tafdil) halidir — Arapçada karşılaştırma genelde 'أفعل' kalıbına sokularak yapılır (مهم → أهم). Karşılaştırmada 'daha' anlamı için 'من' edatı kullanılır: 'أهم من المال' = 'paradan daha önemli'."),
    dict(word="جميل", meaning_target="له مظهر أو صفة تسر النظر", meaning_native="güzel",
         example_1_target="المنظر جميل جدًا.", example_1_native="Manzara çok güzel.",
         example_2_target="لديها صوت جميل.", example_2_native="Onun güzel bir sesi var.",
         grammar_note_native="'جميل' eril sıfattır, dişil ismi nitelerken 'جميلة' (jamīla) olur — Arapçada sıfat, nitelediği ismin cinsiyetine (eril/dişil) ve sayısına UYUM SAĞLAMAK zorundadır: 'رجل جميل' (yakışıklı bir adam) ama 'امرأة جميلة' (güzel bir kadın). Bu, Arapça öğreniminde en temel ve en sık karşılaşılan uyum kuralıdır."),
]


def word_exists(word: str, target_lang: str, native_lang: str) -> bool:
    existing = (
        supabase_admin.table("daily_word_content")
        .select("id")
        .eq("word", word)
        .eq("target_lang", target_lang)
        .eq("native_lang", native_lang)
        .execute()
    )
    return bool(existing.data)


def seed() -> None:
    inserted, skipped = 0, 0
    for rows, target_lang, native_lang, level in (
        (EN_TR, "en", "tr", "YDS / YÖKDİL / TOEFL"),
        (AR_TR, "ar", "tr", "Temel Arapça"),
    ):
        for row in rows:
            if word_exists(row["word"], target_lang, native_lang):
                skipped += 1
                continue
            payload = {**row, "level": level, "target_lang": target_lang, "native_lang": native_lang}
            result = supabase_admin.table("daily_word_content").insert(payload).execute()
            if result.data:
                inserted += 1
                print(f"  [EKLENDI] ({target_lang}->{native_lang}) {row['word']}")
            else:
                print(f"  [HATA] ({target_lang}->{native_lang}) {row['word']} — insert başarısız")

    print(f"\nEklendi: {inserted}, zaten vardı (atlandı): {skipped}")


if __name__ == "__main__":
    seed()
