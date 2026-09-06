"""
backend/seed_daily_word_content.py

daily_word_content tablosunu (bkz. migration 019) elle hazırlanmış, gramer
açısından gözden geçirilmiş 30 kayıtla doldurur — send_daily_word_email.py
her gün buradan sırayla bir kelime seçip kullanıcılara e-posta olarak
gönderir.

seed_general_word_pool.py'nin aksine burası dış bir sözlük API'sine
bağlanmaz: buradaki içerik (İngilizce/Türkçe anlam, 2 örnek cümle +
çevirisi, YDS/YÖKDİL/TOEFL sınavlarına yönelik dilbilgisi analizi) bilinçli
olarak elle yazıldı, çünkü mevcut sözlük servisleri (Cambridge/dictionaryapi/
MyMemory) sadece kelime anlamı+örnek veriyor, dilbilgisi analizi üretmiyor.

Kelimeler seed_general_word_pool.py'deki INTERMEDIATE_WORDS/ADVANCED_WORDS
listeleriyle tutarlı, sınavlarda en sık tuzak oluşturan bağlaç/edat/kalıp
grubundan seçildi (despite/although farkı, gerund-alan-fiiller, inversion
yapıları, vb.) — rastgele kelime değil, gerçekten öğretici bir başlangıç
seti. Daha fazla kelime eklemek için bu dosyaya yeni bir dict eklemek ve
tekrar çalıştırmak yeterli (var olan kelimeler word_exists ile atlanır).

Çalıştırma:
    cd backend
    venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
    python seed_daily_word_content.py
"""

from app.core.database import supabase_admin

LEVEL = "YDS / YÖKDİL / TOEFL"

WORDS = [
    dict(
        word="despite",
        meaning_en="used to show that something happens although something else makes it seem unlikely; followed by a noun or -ing form, NOT a clause",
        meaning_tr="-e rağmen (isim veya V-ing'den önce kullanılır, cümleden önce KULLANILMAZ)",
        example_1_en="Despite the heavy rain, the match continued.",
        example_1_tr="Şiddetli yağmura rağmen maç devam etti.",
        example_2_en="She succeeded despite facing many difficulties.",
        example_2_tr="Birçok zorlukla karşılaşmasına rağmen başarılı oldu.",
        grammar_note_tr=(
            "'Despite' bir edat (preposition) olduğu için ardından İSİM veya V-ing (gerund) gelir, "
            "ÖZNE+FİİL içeren bir cümle (clause) gelemez. YDS/YÖKDİL'de en sık yapılan hata: "
            "'despite + that clause' kullanmak — bunun yerine 'despite the fact that + clause' ya da "
            "'although/even though + clause' kullanılmalı. İkinci örnekteki 'despite facing' yapısına "
            "dikkat: edattan sonra fiil her zaman gerund (-ing) halinde gelir."
        ),
    ),
    dict(
        word="although",
        meaning_en="used to introduce a statement that makes the main statement seem surprising; followed by a full clause (subject + verb)",
        meaning_tr="-e rağmen, gerçi (ardından ÖZNE+FİİL içeren tam bir cümle gelir)",
        example_1_en="Although he was tired, he kept working.",
        example_1_tr="Yorgun olmasına rağmen çalışmaya devam etti.",
        example_2_en="Although it was raining, they went for a walk.",
        example_2_tr="Yağmur yağıyor olmasına rağmen yürüyüşe çıktılar.",
        grammar_note_tr=(
            "'Although', 'despite'nin aksine bir bağlaç (conjunction) olduğu için ardından ÖZNE + FİİL "
            "içeren tam bir cümle alır, isim ya da V-ing ALAMAZ. 'Although he was tired' yapısını "
            "'Despite he was tired' şeklinde kurmak YDS'de klasik bir tuzaktır — 'despite' sonrası "
            "cümle gelemeyeceği için bu her zaman yanlıştır."
        ),
    ),
    dict(
        word="in spite of",
        meaning_en="= despite; followed by a noun or -ing form",
        meaning_tr="-e rağmen (despite ile eş anlamlı, isim veya V-ing alır)",
        example_1_en="In spite of the traffic, we arrived on time.",
        example_1_tr="Trafiğe rağmen zamanında vardık.",
        example_2_en="In spite of being ill, she went to work.",
        example_2_tr="Hasta olmasına rağmen işe gitti.",
        grammar_note_tr=(
            "'In spite of' tam olarak 'despite' ile aynı işlevi görür ve aynı kurala tabidir: ardından "
            "isim ya da V-ing gelir, cümle gelemez. Cümle bağlamak için 'in spite of the fact that + "
            "clause' kalıbı kullanılabilir. Sınavlarda despite/in spite of/although arasında geçiş "
            "yaptırma soruları çok sık çıkar."
        ),
    ),
    dict(
        word="consequently",
        meaning_en="as a result; used to connect two independent sentences, usually followed by a comma",
        meaning_tr="sonuç olarak, bunun sonucunda (iki bağımsız cümleyi bağlar)",
        example_1_en="He missed the deadline; consequently, he lost the contract.",
        example_1_tr="Son tarihi kaçırdı; bunun sonucunda sözleşmeyi kaybetti.",
        example_2_en="The road was closed. Consequently, traffic was diverted.",
        example_2_tr="Yol kapalıydı. Bunun sonucunda trafik başka yöne yönlendirildi.",
        grammar_note_tr=(
            "'Consequently' bir bağlaç değil, bir CÜMLE ZARFIdır (sentence connector); bu yüzden iki "
            "cümleyi doğrudan bağlayamaz — araya noktalı virgül (;) veya nokta (.) konur, 'consequently' "
            "yeni cümlenin başında ve genelde virgülle ayrılır. 'because'in aksine SEBEP değil SONUÇ "
            "bildirir."
        ),
    ),
    dict(
        word="nevertheless",
        meaning_en="despite what has just been said; in spite of that (contrast connector between sentences)",
        meaning_tr="yine de, buna rağmen (cümleler arasında zıtlık bağlacı)",
        example_1_en="The weather was terrible. Nevertheless, they went hiking.",
        example_1_tr="Hava berbattı. Yine de yürüyüşe çıktılar.",
        example_2_en="She was exhausted; nevertheless, she finished the race.",
        example_2_tr="Bitkindi; yine de yarışı bitirdi.",
        grammar_note_tr=(
            "'Nevertheless' de 'consequently' gibi bir cümle zarfıdır, iki bağımsız cümleyi ';' veya '.' "
            "ile ayırıp bağlar. Anlamca 'however'e yakındır ama 'nevertheless' 'buna rağmen, yine de' "
            "anlamıyla biraz daha güçlü, beklenmedik bir sonuç vurgusu taşır."
        ),
    ),
    dict(
        word="provided that",
        meaning_en="on condition that; only if (introduces a condition, similar to 'if')",
        meaning_tr="şartıyla, yeter ki (koşul bildirir, 'if' gibi kullanılır)",
        example_1_en="You can borrow the book, provided that you return it by Friday.",
        example_1_tr="Cuma gününe kadar iade etmen şartıyla kitabı ödünç alabilirsin.",
        example_2_en="Provided that the weather is good, the event will take place outdoors.",
        example_2_tr="Hava iyi olması şartıyla etkinlik açık havada yapılacak.",
        grammar_note_tr=(
            "'Provided that' (kısaca 'provided'), koşul cümlelerinde 'if' yerine kullanılabilen resmi bir "
            "bağlaçtır — anlamı 'yeter ki, ...dığı sürece'dir. Koşul bağlaçlarından sonra (if, provided "
            "that, as long as, unless) GELECEK ZAMAN (will) değil, ŞİMDİKİ ZAMAN (present simple) "
            "kullanılır — 'provided that the weather IS good' doğru, 'WILL BE' yanlıştır."
        ),
    ),
    dict(
        word="unless",
        meaning_en="except if; if...not (negative condition)",
        meaning_tr="eğer ...mezse, ...olmadıkça (olumsuz koşul)",
        example_1_en="You won't pass the exam unless you study harder.",
        example_1_tr="Daha çok çalışmazsan sınavı geçemeyeceksin.",
        example_2_en="Unless it rains, the picnic will go ahead.",
        example_2_tr="Yağmur yağmadıkça piknik yapılacak.",
        grammar_note_tr=(
            "'Unless' = 'if...not' anlamına gelir, bu yüzden 'unless' kullanılan bir cümlede AYRICA 'not' "
            "kullanılmaz (çift olumsuzluk hatası sınavlarda sık tuzaktır): 'unless you don't study' "
            "YANLIŞ, doğrusu 'unless you study'. Diğer koşul bağlaçları gibi 'unless'ten sonra da "
            "present simple kullanılır, will kullanılmaz."
        ),
    ),
    dict(
        word="albeit",
        meaning_en="although (formal, usually followed by an adjective, adverb, or short phrase — not a full clause)",
        meaning_tr="gerçi, her ne kadar ...olsa da (resmi, genelde sıfat/zarf/kısa ifade alır)",
        example_1_en="The plan worked, albeit slowly.",
        example_1_tr="Plan işe yaradı, gerçi yavaş oldu.",
        example_2_en="It was a good decision, albeit a risky one.",
        example_2_tr="İyi bir karardı, gerçi riskli bir karardı.",
        grammar_note_tr=(
            "'Albeit' çok resmi bir bağlaçtır ve genellikle tam bir cümle değil, kısa bir sıfat/zarf öbeği "
            "alır ('albeit slowly', 'albeit a risky one') — 'although' gibi özne+fiil içeren uzun bir "
            "cümle almaz. Akademik metinlerde kısa, vurgulu zıtlık eklemek için kullanılır."
        ),
    ),
    dict(
        word="whereas",
        meaning_en="in contrast; while, on the other hand (compares two facts)",
        meaning_tr="oysa, halbuki (iki durumu karşılaştırır)",
        example_1_en="She loves the city, whereas her husband prefers the countryside.",
        example_1_tr="O şehri seviyor, oysa kocası kırsalı tercih ediyor.",
        example_2_en="Sales increased in Europe, whereas they declined in Asia.",
        example_2_tr="Avrupa'da satışlar arttı, oysa Asya'da düştü.",
        grammar_note_tr=(
            "'Whereas' zıtlık değil, KARŞILAŞTIRMA bildirir — iki farklı durumu yan yana koyar "
            "(although/despite gibi 'beklenmedik sonuç' anlamı taşımaz). Cümlenin başında da ortasında "
            "da kullanılabilir ve virgülle ayrılır: 'Whereas she loves the city, her husband prefers "
            "the countryside' da doğrudur."
        ),
    ),
    dict(
        word="accustomed to",
        meaning_en="familiar with something because you have done or experienced it many times (adjective + to + noun/-ing)",
        meaning_tr="-e alışkın (sıfat + to + isim/V-ing)",
        example_1_en="He is accustomed to working long hours.",
        example_1_tr="Uzun saatler çalışmaya alışkındır.",
        example_2_en="They are not accustomed to such cold weather.",
        example_2_tr="Böylesine soğuk havaya alışkın değiller.",
        grammar_note_tr=(
            "Buradaki 'to' bir edattır (preposition), 'to infinitive' yapısındaki 'to' DEĞİLDİR — bu "
            "yüzden ardından fiil gelecekse V-ing (gerund) gelir, 'to work' değil 'to working' doğrudur. "
            "'be used to', 'look forward to', 'object to' kalıplarında da 'to' aynı şekilde edattır ve "
            "V-ing ister — YDS'de en sık karıştırılan yapılardan biridir."
        ),
    ),
    dict(
        word="capable of",
        meaning_en="having the ability or qualities to do something (adjective + of + -ing)",
        meaning_tr="-e yetenekli, -ebilecek durumda (sıfat + of + V-ing)",
        example_1_en="She is capable of solving complex problems.",
        example_1_tr="Karmaşık problemleri çözebilecek yeteneğe sahiptir.",
        example_2_en="This engine is capable of reaching high speeds.",
        example_2_tr="Bu motor yüksek hızlara ulaşabilecek kapasitededir.",
        grammar_note_tr=(
            "'Capable' sıfatından sonra edat olarak her zaman 'of' gelir; 'of' bir edat olduğu için "
            "ardından fiil V-ing halinde kullanılır ('of solving', 'of reaching'). 'Capable to do' "
            "YANLIŞTIR — bunun yerine 'able to do' kullanılmalıdır (able + to + infinitive, capable + "
            "of + V-ing farkına dikkat)."
        ),
    ),
    dict(
        word="responsible for",
        meaning_en="having control and authority over something / being the cause of something (adjective + for + noun/-ing)",
        meaning_tr="-den sorumlu (sıfat + for + isim/V-ing)",
        example_1_en="The manager is responsible for training new staff.",
        example_1_tr="Müdür yeni personeli eğitmekten sorumludur.",
        example_2_en="Human activity is responsible for much of the pollution.",
        example_2_tr="İnsan faaliyeti kirliliğin büyük bir kısmından sorumludur.",
        grammar_note_tr=(
            "'Responsible' sıfatı 'for' edatıyla kullanılır (sıfat+edat kalıpları sınavlarda ezbere "
            "sorulur: responsible FOR, capable OF, accustomed/used TO, interested IN, aware OF). "
            "'For'dan sonra fiil gelirse V-ing kullanılır: 'responsible for training', 'to train' değil."
        ),
    ),
    dict(
        word="avoid",
        meaning_en="to stay away from or prevent something; ALWAYS followed by -ing, never by 'to + infinitive'",
        meaning_tr="kaçınmak, sakınmak (SADECE V-ing alır, 'to + fiil' ALMAZ)",
        example_1_en="You should avoid eating too much sugar.",
        example_1_tr="Çok fazla şeker yemekten kaçınmalısın.",
        example_2_en="He avoided answering the question directly.",
        example_2_tr="Soruyu doğrudan cevaplamaktan kaçındı.",
        grammar_note_tr=(
            "'Avoid' İngilizcede sadece gerund (V-ing) alan fiillerden biridir — 'avoid to eat' kesinlikle "
            "yanlıştır, doğrusu 'avoid eating'dir. Bu grupta 'enjoy, suggest, consider, postpone, deny, "
            "admit, finish, mind, risk' gibi fiiller de vardır — YDS'de bu fiil grubunu tanımak önemlidir."
        ),
    ),
    dict(
        word="postpone",
        meaning_en="to delay an event to a later time; followed by -ing or a noun, not 'to + infinitive'",
        meaning_tr="ertelemek (V-ing veya isim alır, 'to + fiil' almaz)",
        example_1_en="They postponed the meeting until next week.",
        example_1_tr="Toplantıyı gelecek haftaya ertelediler.",
        example_2_en="She postponed leaving because of the storm.",
        example_2_tr="Fırtına yüzünden ayrılmayı erteledi.",
        grammar_note_tr=(
            "'Postpone' de 'avoid' gibi V-ing alan fiiller grubundandır: 'postpone to leave' değil "
            "'postpone leaving' doğrudur. Anlamca yakın olan 'delay' fiili de aynı kurala uyar."
        ),
    ),
    dict(
        word="manage to",
        meaning_en="to succeed in doing something difficult (followed by 'to + infinitive')",
        meaning_tr="başarmak, becermek (ardından 'to + fiil' gelir)",
        example_1_en="She managed to finish the project on time.",
        example_1_tr="Projeyi zamanında bitirmeyi başardı.",
        example_2_en="We managed to find a solution eventually.",
        example_2_tr="Sonunda bir çözüm bulmayı başardık.",
        grammar_note_tr=(
            "'Manage' fiili 'to + infinitive' alan fiillerdendir (want, decide, hope, plan, afford, "
            "refuse, agree, manage gibi) — 'manage finding' YANLIŞ, 'manage to find' doğrudur. Ayrıca "
            "'manage' her zaman BAŞARIYLA sonuçlanan bir çabayı ima eder, sadece 'try' anlamına gelmez."
        ),
    ),
    dict(
        word="afford to",
        meaning_en="to have enough money, time, or resources to do something (followed by 'to + infinitive', usually with can/could)",
        meaning_tr="gücü yetmek, imkanı olmak (genelde can/could ile, ardından 'to + fiil' gelir)",
        example_1_en="We can't afford to buy a new car this year.",
        example_1_tr="Bu yıl yeni bir araba almaya gücümüz yetmiyor.",
        example_2_en="They couldn't afford to travel abroad.",
        example_2_tr="Yurt dışına seyahat etmeye güçleri yetmedi.",
        grammar_note_tr=(
            "'Afford' neredeyse her zaman 'can/could' ile birlikte kullanılır ve ardından 'to + "
            "infinitive' gelir: 'afford to buy', 'afford buying' değil. Sadece para için değil, zaman "
            "ve risk için de kullanılabilir: 'I can't afford to make a mistake.'"
        ),
    ),
    dict(
        word="suggest",
        meaning_en="to propose an idea; followed by -ing or a that-clause, NEVER by 'to + infinitive'",
        meaning_tr="önermek (V-ing veya that-cümlesi alır, 'to + fiil' ASLA alamaz)",
        example_1_en="I suggest taking the earlier train.",
        example_1_tr="Daha erken treni almanı öneririm.",
        example_2_en="The doctor suggested that she rest for a week.",
        example_2_tr="Doktor bir hafta dinlenmesini önerdi.",
        grammar_note_tr=(
            "'Suggest' YDS'nin klasik tuzaklarından biridir: 'suggest someone to do something' "
            "YANLIŞTIR. Doğru kullanım ya 'suggest V-ing' ya da 'suggest that + subject + (should) + "
            "verb (base form)' şeklindedir — ikinci örnekteki 'that she rest' bir subjunctive (dilek "
            "kipi) yapısıdır, 'rests' değil düz hal 'rest' kullanılır."
        ),
    ),
    dict(
        word="insist on",
        meaning_en="to demand something firmly; followed by 'on' + noun/-ing",
        meaning_tr="ısrar etmek (ardından 'on' + isim/V-ing gelir)",
        example_1_en="He insisted on paying for dinner.",
        example_1_tr="Akşam yemeğinin parasını ödemekte ısrar etti.",
        example_2_en="She insisted on seeing the manager.",
        example_2_tr="Müdürü görmekte ısrar etti.",
        grammar_note_tr=(
            "'Insist' fiilinden sonra bir isim ya da fiil gelecekse edat olarak 'on' kullanılır ve "
            "'on'dan sonra fiil V-ing halinde gelir ('insist on paying', 'to pay' değil). 'Insist that + "
            "clause' yapısı da mümkündür ve suggest'teki gibi subjunctive kullanılabilir: 'He insisted "
            "that she come.'"
        ),
    ),
    dict(
        word="look forward to",
        meaning_en="to feel excited about something that is going to happen; followed by a noun or -ing (the 'to' here is a preposition, not an infinitive marker)",
        meaning_tr="dört gözle beklemek (isim veya V-ing alır; buradaki 'to' bir edattır, infinitive'in 'to'su değildir)",
        example_1_en="I'm looking forward to seeing you next week.",
        example_1_tr="Seni gelecek hafta görmeyi dört gözle bekliyorum.",
        example_2_en="We look forward to hearing from you soon.",
        example_2_tr="Sizden yakında haber almayı dört gözle bekliyoruz.",
        grammar_note_tr=(
            "'Look forward to' YDS'de en sık sorulan kalıplardan biridir çünkü 'to' burada edat gibi "
            "davranır ve ardından FİİL gelecekse mutlaka V-ing kullanılır: 'look forward to see' değil "
            "'look forward to seeing' doğrudur. Resmi yazışmalarda ('We look forward to hearing from "
            "you') çok sık geçer."
        ),
    ),
    dict(
        word="used to",
        meaning_en="past habit that no longer happens (used to + base verb) — different from 'be used to' (accustomed to, + -ing)",
        meaning_tr="eskiden ...irdi (used to + fiil kök hali) — 'be used to' (alışkın olmak, + V-ing) ile karıştırılmamalı",
        example_1_en="I used to play football every weekend when I was a child.",
        example_1_tr="Çocukken her hafta sonu futbol oynardım.",
        example_2_en="She is used to getting up early now.",
        example_2_tr="Artık erken kalkmaya alışkın.",
        grammar_note_tr=(
            "İki farklı yapı burada karıştırılır: (1) 'used to + fiil KÖK hali' = geçmişte yapılan ama "
            "artık yapılmayan bir alışkanlık ('I used to play'); (2) 'be/get used to + isim/V-ing' = bir "
            "şeye ALIŞMAK, buradaki 'to' edattır ('She is used to getting up early'). YDS'de bu ikisi "
            "arasında geçiş yaptırılan sorular çok yaygındır."
        ),
    ),
    dict(
        word="so...that",
        meaning_en="used with an adjective or adverb to show a result (so + adj/adv + that + clause)",
        meaning_tr="o kadar ...ki (so + sıfat/zarf + that + cümle)",
        example_1_en="The exam was so difficult that many students failed.",
        example_1_tr="Sınav o kadar zordu ki birçok öğrenci kaldı.",
        example_2_en="He spoke so quietly that nobody could hear him.",
        example_2_tr="O kadar sessiz konuştu ki kimse onu duyamadı.",
        grammar_note_tr=(
            "'So' doğrudan bir SIFAT ya da ZARF ile kullanılır ('so difficult', 'so quietly'), asla "
            "doğrudan bir isimle kullanılmaz. İsimle sonuç cümlesi kurmak için 'such' kullanılır. Yapı: "
            "so + adj/adv + that + özne + fiil."
        ),
    ),
    dict(
        word="such...that",
        meaning_en="used with a noun (often with an adjective) to show a result (such + (a/an) + adj + noun + that + clause)",
        meaning_tr="öyle bir ...ki (such + (a/an) + sıfat + isim + that + cümle)",
        example_1_en="It was such a difficult exam that many students failed.",
        example_1_tr="Öyle zor bir sınavdı ki birçok öğrenci kaldı.",
        example_2_en="They are such good friends that they never argue.",
        example_2_tr="Öyle iyi arkadaşlar ki hiç tartışmazlar.",
        grammar_note_tr=(
            "'Such', 'so'nun aksine bir İSİM öbeği ile kullanılır: 'such + (a/an) + sıfat + isim'. Tekil "
            "sayılabilir isimlerde 'a/an' MUTLAKA kullanılır ('such A difficult exam'), çoğul veya "
            "sayılamayan isimlerde kullanılmaz ('such good friends'). Aynı anlamı 'so' ile ifade etmek "
            "için isim çıkarılır: 'The exam was so difficult'."
        ),
    ),
    dict(
        word="no sooner...than",
        meaning_en="used to say that one thing happened immediately after another; requires inversion and past perfect when it starts the sentence",
        meaning_tr="...er etmez (bir olay diğerinin hemen ardından olur; cümle başında devrik yapı ve past perfect gerektirir)",
        example_1_en="No sooner had she arrived than the phone rang.",
        example_1_tr="O gelir gelmez telefon çaldı.",
        example_2_en="No sooner had he sat down than someone knocked on the door.",
        example_2_tr="O oturur oturmaz biri kapıyı çaldı.",
        grammar_note_tr=(
            "'No sooner' cümle BAŞINDA kullanıldığında devrik (inverted) yapı zorunludur: normal 'she "
            "had arrived' yerine 'had she arrived' şeklinde yardımcı fiil özneden önce gelir. İlk eylem "
            "PAST PERFECT (had + V3), ikinci eylem past simple ile ifade edilir ve 'than' ile bağlanır — "
            "'no sooner...when' değil 'no sooner...than' kullanılır."
        ),
    ),
    dict(
        word="hardly...when",
        meaning_en="similar to 'no sooner...than'; also requires inversion and past perfect when the sentence starts with 'hardly'",
        meaning_tr="'no sooner...than' ile aynı anlamda; cümle 'hardly' ile başlarsa yine devrik yapı ve past perfect gerekir",
        example_1_en="Hardly had the film started when the lights went out.",
        example_1_tr="Film başlar başlamaz ışıklar söndü.",
        example_2_en="Hardly had we sat down when the waiter came.",
        example_2_tr="Biz oturur oturmaz garson geldi.",
        grammar_note_tr=(
            "'Hardly' + past perfect + 'when' yapısı, 'no sooner' + past perfect + 'than' ile birebir "
            "aynı anlamı taşır — tek fark bağlaç kelimesidir (no sooner→than, hardly/scarcely/"
            "barely→when). Bu kalıplar YDS'de sıkça birbirinin yerine kullandırılarak sorulur; hangisi "
            "kullanılırsa kullanılsın, cümle bu zarflarla BAŞLIYORSA devrik yapı şarttır."
        ),
    ),
    dict(
        word="as long as",
        meaning_en="on condition that; provided that (introduces a condition)",
        meaning_tr="-dığı sürece, yeter ki (koşul bildirir)",
        example_1_en="You can stay here as long as you keep quiet.",
        example_1_tr="Sessiz kaldığın sürece burada kalabilirsin.",
        example_2_en="As long as the price is reasonable, I'll buy it.",
        example_2_tr="Fiyat makul olduğu sürece onu satın alırım.",
        grammar_note_tr=(
            "'As long as', 'provided that' ve 'on condition that' ile eş anlamlıdır ve aynı kurala "
            "uyar: koşul bildiren bu bağlaçlardan sonra GELECEK ZAMAN (will) değil, ŞİMDİKİ ZAMAN "
            "(present simple) kullanılır — 'as long as the price IS reasonable' doğru, 'WILL BE' "
            "yanlıştır. Ana cümlede 'will'/emir kipi kullanılabilir."
        ),
    ),
    dict(
        word="even though",
        meaning_en="although (stronger contrast); followed by a full clause — different from 'even if' which expresses a hypothetical condition",
        meaning_tr="her ne kadar ...olsa da (although'dan daha vurgulu; cümle alır — varsayımsal 'even if'den farklıdır)",
        example_1_en="Even though it was expensive, she bought the dress.",
        example_1_tr="Pahalı olmasına rağmen elbiseyi satın aldı.",
        example_2_en="Even though he apologized, she was still angry.",
        example_2_tr="Özür dilemiş olmasına rağmen hâlâ kızgındı.",
        grammar_note_tr=(
            "'Even though', 'although' gibi bir bağlaçtır ve ardından özne+fiil içeren tam bir cümle "
            "alır — ama gerçekleşmiş, KESİN bir durumu vurgular. 'Even if' ise farklıdır: gerçekleşip "
            "gerçekleşmeyeceği belli olmayan VARSAYIMSAL bir durumu ifade eder ('Even if it rains, "
            "we'll go' — henüz yağmıyor, belirsiz). Bu ikisi sınavlarda sıkça karıştırılır."
        ),
    ),
    dict(
        word="in order to / so as to",
        meaning_en="used to express purpose; followed by 'to + infinitive'; negative form is 'in order not to' / 'so as not to'",
        meaning_tr="amacıyla, -mek için (ardından 'to + fiil' gelir; olumsuzu 'in order not to' / 'so as not to')",
        example_1_en="She left early in order to catch the train.",
        example_1_tr="Treni yakalamak için erken çıktı.",
        example_2_en="He spoke quietly so as not to wake the baby.",
        example_2_tr="Bebeği uyandırmamak için sessizce konuştu.",
        grammar_note_tr=(
            "'In order to' ve 'so as to', amaç bildiren 'to + infinitive' yapısının daha resmi/vurgulu "
            "biçimleridir. Olumsuz yapıldığında 'not' HER ZAMAN 'to'dan ÖNCE gelir: 'in order NOT TO "
            "wake', 'in order to not wake' değil. Sadece 'to' ile de amaç bildirilebilir ('She left "
            "early to catch the train') ama cümle başında amaç vurgulamak için 'in order to/so as to' "
            "tercih edilir."
        ),
    ),
    dict(
        word="deprive of",
        meaning_en="to prevent someone from having or enjoying something (verb + someone + of + noun)",
        meaning_tr="mahrum bırakmak (fiil + kişi + of + isim)",
        example_1_en="The war deprived thousands of people of their homes.",
        example_1_tr="Savaş binlerce insanı evlerinden mahrum bıraktı.",
        example_2_en="Lack of sleep can deprive you of energy.",
        example_2_tr="Uykusuzluk seni enerjiden mahrum bırakabilir.",
        grammar_note_tr=(
            "'Deprive' fiili 'deprive + kişi/şey + OF + isim' kalıbıyla kullanılır — edat olarak her "
            "zaman 'of' gelir, 'from' ya da başka bir edat YANLIŞTIR. Pasif yapıda da aynı edat "
            "korunur: 'They were deprived OF their rights' (haklarından mahrum bırakıldılar)."
        ),
    ),
    dict(
        word="resigned to",
        meaning_en="accepting something unpleasant because you cannot change it (adjective + to + noun/-ing)",
        meaning_tr="kabullenmiş, boyun eğmiş (sıfat + to + isim/V-ing)",
        example_1_en="He seems resigned to losing his job.",
        example_1_tr="İşini kaybetmeyi kabullenmiş görünüyor.",
        example_2_en="She is resigned to the fact that things will change.",
        example_2_tr="Her şeyin değişeceği gerçeğini kabullenmiş durumda.",
        grammar_note_tr=(
            "'Resigned' burada 'istifa etmiş' değil 'kabullenmiş, boyun eğmiş' anlamındadır. 'To' yine "
            "bir edattır, bu yüzden ardından fiil gelirse V-ing kullanılır: 'resigned to losing', "
            "'resigned to lose' değil — accustomed to, used to, look forward to ile aynı kalıp "
            "ailesindendir."
        ),
    ),
    dict(
        word="reluctant to",
        meaning_en="unwilling to do something; followed by 'to + infinitive'",
        meaning_tr="isteksiz, gönülsüz (ardından 'to + fiil' gelir)",
        example_1_en="He was reluctant to accept the offer.",
        example_1_tr="Teklifi kabul etmekte isteksizdi.",
        example_2_en="Many employees are reluctant to work overtime.",
        example_2_tr="Birçok çalışan fazla mesai yapmaya isteksiz.",
        grammar_note_tr=(
            "'Reluctant', 'willing/eager/ready' gibi ardından 'to + infinitive' alan sıfatlar "
            "grubundandır — buradaki 'to', 'to infinitive' yapısının parçasıdır (accustomed to/used "
            "to'daki edat 'to' ile KARIŞTIRILMAMALIDIR): 'reluctant to accept' doğru, 'reluctant to "
            "accepting' yanlıştır. Bu fark YDS'nin ileri seviye tuzaklarındandır."
        ),
    ),
]


def word_exists(word: str) -> bool:
    existing = (
        supabase_admin.table("daily_word_content")
        .select("id")
        .ilike("word", word)
        .execute()
    )
    return bool(existing.data)


def seed() -> None:
    inserted, skipped = 0, 0
    for row in WORDS:
        if word_exists(row["word"]):
            skipped += 1
            continue
        payload = {**row, "level": LEVEL}
        result = supabase_admin.table("daily_word_content").insert(payload).execute()
        if result.data:
            inserted += 1
            print(f"  [EKLENDI] {row['word']}")
        else:
            print(f"  [HATA] {row['word']} — insert başarısız")

    print(f"\nEklendi: {inserted}, zaten vardı (atlandı): {skipped}")


if __name__ == "__main__":
    seed()
