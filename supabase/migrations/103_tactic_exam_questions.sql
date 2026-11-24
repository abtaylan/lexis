-- 102_tactic_exam_questions.sql
-- 24 Kasim 2026 -- Behcet'in kullanici istegi: haftalik/aylik taktik
-- sinavlarindaki sorularin 'sinav taktik bolumu icin hazirlanan
-- sorulardan' olusmasi icin, exam_tactics'teki 91 konu-etiketli
-- taktigin her biri icin 2'ser adet yeni MCQ sorusu (source_type='tactic').
-- Secim onceligi: app/services/study_program_service.py::_pick_topic_questions.

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a01qt$After sitting through the entire three-hour lecture on fiscal policy, most of the students admitted that they were thoroughly -------.$a01qt$,
  $a01op$[{"id":"a","text":"bored"},{"id":"b","text":"boring"},{"id":"c","text":"bore"},{"id":"d","text":"bores"}]$a01op$::jsonb,
  'a',
  $a01ex$Özne (öğrenciler) bir İNSAN olup bir duygudan bahsedildiği için -ed alan "bored" doğrudur; "boring" yanlıştır çünkü bu sıfat durumun kendi özelliğini anlatır, kişinin hissettiği duyguyu değil. "bore" ve "bores" ise sıfat değil fiil olduğundan "were" yüklemiyle sıfat tamlayıcısı göreviyle kullanılamaz.$a01ex$,
  'adjective-order-formation',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a02qt$She inherited a ------- chest from her grandmother, which still smells faintly of cedar after all these decades.$a02qt$,
  $a02op$[{"id":"a","text":"beautiful old wooden"},{"id":"b","text":"wooden old beautiful"},{"id":"c","text":"old beautiful wooden"},{"id":"d","text":"old wooden beautiful"}]$a02op$::jsonb,
  'a',
  $a02ex$İngilizce'de sıfat sıralaması görüş (beautiful) → yaş (old) → malzeme (wooden) şeklinde olmalıdır, bu yüzden "beautiful old wooden" doğrudur. Diğer şıklarda bu sıra ihlal edilerek malzeme veya yaş bildiren sıfat, görüş bildiren sıfattan önce getirildiği için YDS'de doğal/doğru kabul edilmez.$a02ex$,
  'adjective-order-formation',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a03qt$Many economists remain skeptical about the government's new proposal, insisting that the plan is simply not capable of ------- the rising unemployment rate within a year.$a03qt$,
  $a03op$[{"id":"a","text":"solving"},{"id":"b","text":"solve"},{"id":"c","text":"to solve"},{"id":"d","text":"solved"}]$a03op$::jsonb,
  'a',
  $a03ex$"capable of" sabit sıfat+edat kalıbından sonra gelen fiil mutlaka -ing (gerund) formunda olur, çünkü "of" bir edattır ve edattan sonra fiil her zaman -ing alır. "to solve" bu yüzden yanlıştır; sıfat+edattan hemen sonra "to + yalın fiil" görülmesi büyük ihtimalle yanlış olduğunun işaretidir.$a03ex$,
  'adjective-preposition-ing',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a04qt$Having worked night shifts for over a decade, the nurse was completely accustomed to ------- on only four hours of sleep.$a04qt$,
  $a04op$[{"id":"a","text":"functioning"},{"id":"b","text":"function"},{"id":"c","text":"functioned"},{"id":"d","text":"to function"}]$a04op$::jsonb,
  'a',
  $a04ex$"accustomed to" kalıbındaki "to" bir edattır, infinitive belirteci değildir, bu yüzden ardından -ing gelir ("accustomed to functioning"). "to function" yanlıştır çünkü bu kalıp, alışkanlık anlamındaki modal gibi davranan "used to + V1" yapısıyla karıştırılmamalıdır; "function" ve "functioned" ise edattan sonra gelemeyecek formlardır.$a04ex$,
  'adjective-preposition-ing',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a05qt$The staff at the clinic always greeted elderly patients -------, making them feel welcome from the moment they walked in.$a05qt$,
  $a05op$[{"id":"a","text":"friendly"},{"id":"b","text":"friendlily"},{"id":"c","text":"in a friendly way"},{"id":"d","text":"friendliness"}]$a05op$::jsonb,
  'c',
  $a05ex$"friendly" -ly ile bitse de kendisi zaten bir sıfattır ve bunun "-lyly" şeklinde ayrı bir zarf hali ("friendlily") yoktur. Burada bir fiil ("greeted") nitelendiği için doğru yol "in a friendly way/manner" gibi bir çevre ifade kullanmaktır; "friendliness" ise bir isim olduğundan zarf konumunda kullanılamaz.$a05ex$,
  'adjectives-ending-in-ly',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a06qt$Replacing the entire heating system turned out to be far more ------- than the committee had originally budgeted for.$a06qt$,
  $a06op$[{"id":"a","text":"costly"},{"id":"b","text":"costlily"},{"id":"c","text":"cost"},{"id":"d","text":"costing"}]$a06op$::jsonb,
  'a',
  $a06ex$"costly" -ly ile bitmesine rağmen kendisi zaten bir sıfattır ve "costlily" diye bir zarf yoktur; cümledeki "more ------- than" yapısı bir sıfat karşılaştırması gerektirdiğinden "costly" doğrudur. "cost" bir isim/fiil, "costing" ise bir fiilin -ing hali olduğundan bu sıfat konumuna uymaz.$a06ex$,
  'adjectives-ending-in-ly',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a07qt$The negotiations were ------- complicated that both delegations requested an additional week to review the draft agreement.$a07qt$,
  $a07op$[{"id":"a","text":"so"},{"id":"b","text":"such"},{"id":"c","text":"such a"},{"id":"d","text":"too"}]$a07op$::jsonb,
  'a',
  $a07ex$Boşluktan hemen sonra çıplak bir sıfat (complicated) gelmektedir, isim yoktur; bu durumda "so" kullanılır. "such" ve "such a" bir isim öbeği gerektirdiğinden, "too" ise farklı bir yapı (too...to) gerektirdiğinden buraya uymaz.$a07ex$,
  'adverbs-of-degree',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a08qt$The contract's terms were ------- ambiguous to be approved without further legal review, according to the firm's senior partner.$a08qt$,
  $a08op$[{"id":"a","text":"too"},{"id":"b","text":"so"},{"id":"c","text":"enough"},{"id":"d","text":"such"}]$a08op$::jsonb,
  'a',
  $a08ex$"too" sıfattan ÖNCE gelir ve genellikle ardından "to + fiil" ile olumsuz bir sonuç belirtir ("too ambiguous to be approved"); "enough" sıfattan SONRA gelmesi gerektiği için buraya yanlıştır, "so" ise tek başına "to+fiil" değil "that" cümleciği ister.$a08ex$,
  'adverbs-of-degree',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a09qt$The new regulations were introduced so abruptly that factory owners could ------- adjust their production schedules in time.$a09qt$,
  $a09op$[{"id":"a","text":"hardly"},{"id":"b","text":"hard"},{"id":"c","text":"harder"},{"id":"d","text":"hardily"}]$a09op$::jsonb,
  'a',
  $a09ex$"hardly" (neredeyse hiç, güçlükle) anlamı, cümledeki ani düzenleme ve yetişememe durumuna uyar. "hard" (çok/sıkı) buna zıt bir anlam katacağından yanlıştır; "harder" karşılaştırma gerektirir ki cümlede karşılaştırma yoktur, "hardily" ise bu anlamda kullanılan bir kelime değildir.$a09ex$,
  'adverbs-of-manner-formation',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a10qt$The committee has ------- noticed a sharp increase in complaints about the quality of customer service at the downtown branch.$a10qt$,
  $a10op$[{"id":"a","text":"lately"},{"id":"b","text":"late"},{"id":"c","text":"later"},{"id":"d","text":"latest"}]$a10op$::jsonb,
  'a',
  $a10ex$"lately" (son zamanlarda), present perfect zamanla birlikte yakın geçmişte süregelen bir gözlemi anlatır ve bu cümleye uyar; "late" (geç) tamamen farklı bir anlam taşıdığından yanlıştır, "later" ise "sonra" anlamıyla farklı bir zaman bağlacı gerektirir.$a10ex$,
  'adverbs-of-manner-formation',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a11qt$After reviewing the applications twice, the panel decided that ------- of the two candidates was qualified enough to be offered the senior position.$a11qt$,
  $a11op$[{"id":"a","text":"neither"},{"id":"b","text":"both"},{"id":"c","text":"all"},{"id":"d","text":"either"}]$a11op$::jsonb,
  'a',
  $a11ex$Tam olarak İKİ aday olduğu ve her ikisinin de uygun bulunmadığı anlatıldığı için, kendi içinde olumsuzluk taşıyan "neither" doğrudur. "both" anlamca terstir, "all" ikiden fazla öğe gerektirdiğinden, "either" ise burada tekil olumlu bir seçim anlamı taşıdığından cümlenin olumsuz anlamına uymaz.$a11ex$,
  'all-both-neither-either',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a12qt$------- of the five witnesses interviewed by the police gave consistent accounts of what had happened at the intersection that evening.$a12qt$,
  $a12op$[{"id":"a","text":"All"},{"id":"b","text":"Both"},{"id":"c","text":"Either"},{"id":"d","text":"Neither"}]$a12op$::jsonb,
  'a',
  $a12ex$Beş tanık söz konusu olduğundan (ikiden fazla) "all" doğrudur; "both" sadece tam olarak iki öğe için kullanılır, "either/neither" ise iki seçenek arasında bir tercih veya reddi ifade ettiğinden beş kişilik bu gruba uymaz.$a12ex$,
  'all-both-neither-either',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a13qt$By the time the auditors arrived at the factory, the manager had ------- removed all the damaged equipment from the inventory list.$a13qt$,
  $a13op$[{"id":"a","text":"already"},{"id":"b","text":"yet"},{"id":"c","text":"still"},{"id":"d","text":"anymore"}]$a13op$::jsonb,
  'a',
  $a13ex$Olumlu bir cümlede, beklenenden önce gerçekleşmiş bir eylemi vurgulamak için "already" yardımcı fiille ana fiil arasına yerleşir ("had already removed"). "yet" olumsuz/soru cümlelerinde kullanıldığından, "still" devam eden bir durumu belirttiğinden (burada eylem tamamlanmıştır) ve "anymore" olumsuz cümlelerde kullanıldığından buraya uymaz.$a13ex$,
  'already-yet-still',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a14qt$Despite several reminders from the HR department, many employees haven't submitted their annual health insurance forms -------.$a14qt$,
  $a14op$[{"id":"a","text":"yet"},{"id":"b","text":"still"},{"id":"c","text":"already"},{"id":"d","text":"just"}]$a14op$::jsonb,
  'a',
  $a14ex$Olumsuz bir cümlede "henüz" anlamını vermek için "yet" cümle SONUNDA kullanılır ("haven't submitted... yet"). "still" bu pozisyonda asla kullanılamaz çünkü her zaman yardımcı/ana fiilden önce gelmesi gereken bir zarftır ve cümle sonunda yer alamaz; "already" olumlu cümlelerde, "just" ise farklı bir zaman vurgusunda kullanılır.$a14ex$,
  'already-yet-still',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a15qt$Mount Everest is widely regarded as ------- most dangerous mountain to climb during the winter season, according to several mountaineering associations.$a15qt$,
  $a15op$[{"id":"a","text":"the"},{"id":"b","text":"a"},{"id":"c","text":"an"},{"id":"d","text":"(no article)"}]$a15op$::jsonb,
  'a',
  $a15ex$Üstünlük bildiren bir sıfattan ("most dangerous") önce mutlaka "the" kullanılır; bu artikelin unutulması ("a/an" veya hiç artikel kullanılmaması) YDS'nin klasik tuzaklarından biridir, çünkü üstünlük ifadeleri her zaman tek ve belirli bir öğeyi işaret eder.$a15ex$,
  'articles',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a16qt$------- elephants are known to display complex social behaviors, but the elephants kept in that particular sanctuary have shown unusually strong bonds with their caretakers.$a16qt$,
  $a16op$[{"id":"a","text":"(no article)"},{"id":"b","text":"The"},{"id":"c","text":"A"},{"id":"d","text":"An"}]$a16op$::jsonb,
  'a',
  $a16ex$Cümlenin ilk kısmında "elephants" bir kategoriyi bütün olarak temsil ettiğinden (genel ifade) hiç artikel kullanılmaz. Cümlenin ikinci kısmındaki "the elephants" ise belirli bir barınaktaki belirli bir grubu işaret ettiğinden "the" doğru kullanılmıştır; bu nedenle ilk boşlukta "the", "a" veya "an" kullanmak yanlıştır.$a16ex$,
  'articles',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a17qt$The committee concluded that the new proposal was not as ------- as the one submitted last year, despite its more modern presentation.$a17qt$,
  $a17op$[{"id":"a","text":"persuasive"},{"id":"b","text":"more persuasive"},{"id":"c","text":"most persuasive"},{"id":"d","text":"persuasively"}]$a17op$::jsonb,
  'a',
  $a17ex$"as...as" yapısında araya giren sıfat her zaman YALIN halde kalır, asla üstünlük eki almaz; bu yüzden "more persuasive" ve "most persuasive" yanlıştır. "persuasively" ise bir zarf olduğundan, "proposal" isim tamlayıcısı olarak sıfat gerektiren bu cümlede kullanılamaz.$a17ex$,
  'as-as-comparison',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a18qt$Negotiating with international suppliers is not as straightforward as ------- with local manufacturers, since customs regulations differ significantly between countries.$a18qt$,
  $a18op$[{"id":"a","text":"negotiating"},{"id":"b","text":"to negotiate"},{"id":"c","text":"negotiate"},{"id":"d","text":"negotiation"}]$a18op$::jsonb,
  'a',
  $a18ex$"as...as" yapısında karşılaştırılan iki öğe aynı gramatik yapıda (paralel) olmalıdır. Cümlenin öznesi "Negotiating" (gerund) olduğu için ikinci taraf da gerund olmalıdır; "to negotiate" ve "negotiate" paralelliği bozduğu için yanlıştır, "negotiation" ise anlamca uysa da yapısal paralelliği sağlamaz.$a18ex$,
  'as-as-comparison',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a19qt$The technician ------- restart the server when the entire building suddenly lost power.$a19qt$,
  $a19op$[{"id":"a","text":"was about to"},{"id":"b","text":"is about to"},{"id":"c","text":"will be about to"},{"id":"d","text":"has been about to"}]$a19op$::jsonb,
  'a',
  $a19ex$"was about to + fiil" kalıbı, bir eylem gerçekleşmek ÜZEREYKEN başka bir olay tarafından kesintiye uğradığını anlatır ve tipik olarak "when + ani bir geçmiş zaman olayı" ile birlikte gelir. Diğer şıklardaki zamanlar (is/will be/has been) cümledeki geçmiş zaman bağlamıyla ("suddenly lost power") uyuşmadığından yanlıştır.$a19ex$,
  'be-about-to',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a20qt$The space agency announced that the satellite ------- launched next spring, following more than a decade of research and testing.$a20qt$,
  $a20op$[{"id":"a","text":"is going to be"},{"id":"b","text":"is about to be"},{"id":"c","text":"was about to be"},{"id":"d","text":"has been about to be"}]$a20op$::jsonb,
  'a',
  $a20ex$Cümlede "next spring" gibi UZAK bir zaman ifadesi bulunduğu için "about to" kesinlikle elenir, çünkü bu yapı sadece ÇOK YAKIN, neredeyse anlık bir eylemi ifade eder. Uzak planlanmış bir niyet anlatılırken "going to" kullanılmalıdır, bu yüzden "is about to be" ve diğer "about to" şıkları yanlıştır.$a20ex$,
  'be-about-to',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a21qt$According to company policy, every incoming shipment ------- thoroughly inspected before it is cleared for storage in the warehouse.$a21qt$,
  $a21op$[{"id":"a","text":"is"},{"id":"b","text":"gets"},{"id":"c","text":"has got"},{"id":"d","text":"got"}]$a21op$::jsonb,
  'a',
  $a21ex$Burada anlatılan durum nötr, resmi ve süregelen bir kural olduğundan (şirket politikası) be passive ("is inspected") tercih edilir. "gets" ani, beklenmedik bir değişimi anlatan günlük dil yapılarında kullanıldığından bu resmi/rutin bağlama uymaz; "has got" ve "got" ise zaman ve anlam olarak cümleye uymaz.$a21ex$,
  'be-vs-get-passive',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a22qt$While she was walking home late at night, her bag ------- snatched by a man on a motorcycle before she even realized what was happening.$a22qt$,
  $a22op$[{"id":"a","text":"got"},{"id":"b","text":"is"},{"id":"c","text":"has been"},{"id":"d","text":"will be"}]$a22op$::jsonb,
  'a',
  $a22ex$Cümle ani, beklenmedik ve olumsuz bir olayı (çantanın kapılması) günlük bir anlatım içinde aktardığından get passive ("got snatched") doğaldır. "is" nötr/süregelen bir durumu anlattığından ve "was walking" ile kurulan geçmiş zaman bağlamına uymadığından yanlıştır; "has been" ve "will be" de cümledeki zaman diliminden farklıdır.$a22ex$,
  'be-vs-get-passive',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a23qt$The architects must finalize the blueprints ------- next Friday, since the construction crew is scheduled to begin work the following Monday.$a23qt$,
  $a23op$[{"id":"a","text":"by"},{"id":"b","text":"until"},{"id":"c","text":"since"},{"id":"d","text":"for"}]$a23op$::jsonb,
  'a',
  $a23ex$"finalize" tek seferlik, tamamlanması gereken bir eylem olduğundan ve cümlede bir son tarih (deadline) belirtildiğinden "by" doğrudur. "until" sürekli bir eylemin ne zamana kadar devam edeceğini anlattığından tamamlanma bildiren bu fiille uyumsuzdur; "since" ve "for" ise zaman ilişkisi bakımından buraya uymaz.$a23ex$,
  'by-until',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a24qt$The company did not announce the merger ------- all the regulatory approvals had been finalized, to avoid any legal complications.$a24qt$,
  $a24op$[{"id":"a","text":"until"},{"id":"b","text":"by"},{"id":"c","text":"when"},{"id":"d","text":"before"}]$a24op$::jsonb,
  'a',
  $a24ex$"not...until" kalıbı, bir şeyin belirtilen ana kadar gerçekleşmeyeceğini, ancak ondan sonra olacağını anlatır. "by" burada yanlıştır çünkü "not...by" farklı bir anlam taşır ve cümledeki bekleme/süreklilik mantığına uymaz; "when" ve "before" ise bu kalıbın gerektirdiği vurguyu vermez.$a24ex$,
  'by-until',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $a25qt$The ancient city walls were severely damaged ------- a powerful earthquake that struck the region in the fourteenth century.$a25qt$,
  $a25op$[{"id":"a","text":"by"},{"id":"b","text":"with"},{"id":"c","text":"from"},{"id":"d","text":"through"}]$a25op$::jsonb,
  'a',
  $a25ex$Cümlede edilgen eylemi gerçekleştiren, canlı bir fail niteliğindeki doğa gücü ("earthquake") belirtildiği için "by" doğrudur. "with" bir araç/alet belirttiğinden ve deprem bir araç değil bir fail olduğundan yanlıştır; "from" ve "through" ise bu edilgen yapı kalıbında fail belirtmek için kullanılmaz.$a25ex$,
  'by-with-agent-instrument',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $a26qt$The vandalized mural was eventually restored, after conservators carefully removed the graffiti ------- a specially formulated chemical solvent.$a26qt$,
  $a26op$[{"id":"a","text":"with"},{"id":"b","text":"by"},{"id":"c","text":"through"},{"id":"d","text":"from"}]$a26op$::jsonb,
  'a',
  $a26ex$Burada eylemi gerçekleştirmek için kullanılan cansız bir araç/madde ("a chemical solvent") belirtildiği için "with" doğrudur. "by" canlı bir faili belirttiğinden ve çözücü bir fail olmadığından yanlıştır; "through" ve "from" ise bu bağlamda araç belirtmek için kullanılmaz.$a26ex$,
  'by-with-agent-instrument',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b01qt$Because of the persistent leak, the homeowners decided to have their roof ------- by a professional contractor before the rainy season began.$b01qt$,
  $b01op$[{"id":"a","text":"repaired"},{"id":"b","text":"repair"},{"id":"c","text":"to repair"},{"id":"d","text":"repairing"}]$b01op$::jsonb,
  'a',
  $b01ex$Özne (homeowners) çatıyı kendisi tamir etmiyor, bir ustaya yaptırıyor; bu yüzden "have + nesne + V3" yapısı gerekir ve doğru cevap "repaired"tır. "Repair" yalın hâl olduğu için yanlıştır çünkü nesneden sonra asla V1 gelmez; "to repair" da aynı nedenle yanlıştır çünkü bu yapıda "to" kullanılmaz; "repairing" ise işin tamamlanmış hâlini değil süregelen bir eylemi ima ettiği için uygun değildir.$b01ex$,
  'causative-have-something-done',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b02qt$Many homeowners in coastal areas have their properties ------- against flood damage every few years as a precaution.$b02qt$,
  $b02op$[{"id":"a","text":"insured"},{"id":"b","text":"insure"},{"id":"c","text":"to insure"},{"id":"d","text":"insuring"}]$b02op$::jsonb,
  'a',
  $b02ex$Özne evini kendisi sigortalamıyor, bir sigorta şirketine yaptırıyor; bu nedenle "have + nesne + V3" yapısı gerekir ve doğru cevap "insured"tır. "Insure" yalın hâldir ve bu yapıda asla kullanılmaz; "to insure" yanlıştır çünkü nesneden sonra to-infinitive gelmez; "insuring" ise sürekli bir eylem anlamı katar, oysa burada işin yaptırılmış ve tamamlanmış hâli anlatılmaktadır.$b02ex$,
  'causative-have-something-done',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b03qt$Despite having less experience than her colleagues, she turned out to be a ------- negotiator than anyone else on the team.$b03qt$,
  $b03op$[{"id":"a","text":"better"},{"id":"b","text":"more better"},{"id":"c","text":"best"},{"id":"d","text":"good"}]$b03op$::jsonb,
  'a',
  $b03ex$Cümlede "than anyone else" karşılaştırma öğesi bulunduğu için comparative form gerekir; "good" düzensiz bir sıfattır ve comparative hâli "better"dır. "More better" çift karşılaştırma işareti (double comparative) hatasıdır çünkü "better" zaten comparative anlam taşır; "best" ise superlative olup "than" ile değil "in/of" gibi ifadelerle kullanılır; "good" ise hiçbir karşılaştırma işareti taşımadığı için "than" ile uyuşmaz.$b03ex$,
  'comparatives-superlatives',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b04qt$Of all the strategies proposed at the conference, the one suggested by the youngest delegate turned out to be the ------- effective in reducing carbon emissions.$b04qt$,
  $b04op$[{"id":"a","text":"most"},{"id":"b","text":"more"},{"id":"c","text":"much"},{"id":"d","text":"most more"}]$b04op$::jsonb,
  'a',
  $b04ex$"Effective" üç heceli bir sıfattır, bu yüzden -est değil "most" ile superlative yapılır. "Of all the strategies" ifadesi üç veya daha fazla şey arasında en üstünü belirttiği için superlative (most effective) gerekir; "more" sadece iki şeyi karşılaştırırken ve genellikle "than" ile kullanılır, burada "than" yoktur; "much" sıfat derecelendirmesinde bu şekilde kullanılmaz; "most more" ise çift işaretleme hatasıdır.$b04ex$,
  'comparatives-superlatives',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b05qt$The new shopping mall downtown features several ------- where children can safely ride bicycles and skateboards away from traffic.$b05qt$,
  $b05op$[{"id":"a","text":"bicycle lanes"},{"id":"b","text":"bicycles lanes"},{"id":"c","text":"bicycle laness"},{"id":"d","text":"bicycles lane"}]$b05op$::jsonb,
  'a',
  $b05ex$"Bicycle lane" bir birleşik isimdir (noun + noun) ve bu yapıda çoğul eki sadece SON kelimeye eklenir; ilk kelime sıfat gibi davranıp tekil kalır, bu yüzden doğru cevap "bicycle lanes"tir. "Bicycles lanes" yanlıştır çünkü ilk kelime çoğullanmamalıdır; "bicycle laness" geçersiz bir çift çoğul ek içerir; "bicycles lane" ise çoğulluk hiç taşımaması gereken kelimeye eklenip taşıması gereken kelimeye eklenmemiş, yani tam tersi bir hata içerir.$b05ex$,
  'compound-nouns',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b06qt$The charity event raised funds specifically for ------- children living in the refugee camps near the border, many of whom had never attended school.$b06qt$,
  $b06op$[{"id":"a","text":"five-year-old"},{"id":"b","text":"five-years-old"},{"id":"c","text":"five-year-olds"},{"id":"d","text":"five years old"}]$b06op$::jsonb,
  'a',
  $b06ex$Sayı + isim birleşik sıfat olarak başka bir isimden ("children") önce kullanıldığında, tire ile yazılan ilk kısım ("year") her zaman TEKİL kalır; bu yüzden doğru cevap "five-year-old"dur. "Five-years-old" yanlıştır çünkü sıfat öbeğinde çoğul eki kullanılmaz; "five-year-olds" bir isim olarak ("the five-year-olds") kullanılabilir ama burada "children" isminden önce sıfat gerektiği için uygun değildir; "five years old" tire içermediği için ancak yüklem konumunda ("they are five years old") kullanılabilir, isimden önce sıfat olarak gelemez.$b06ex$,
  'compound-nouns',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b07qt$------- heavy criticism from environmental groups, the government proceeded with the construction of the new coal plant.$b07qt$,
  $b07op$[{"id":"a","text":"Despite"},{"id":"b","text":"Although"},{"id":"c","text":"Even though"},{"id":"d","text":"Because"}]$b07op$::jsonb,
  'a',
  $b07ex$Boşluktan hemen sonra özne+yüklem içeren bir cümlecik değil, bir isim öbeği ("heavy criticism from environmental groups") geldiği için "despite" doğrudur. "Although/even though" bağlaçlarından sonra mutlaka özne+yüklem içeren tam bir cümlecik gelmesi gerekir, burada sadece isim öbeği olduğu için bu şıklar yanlıştır; "because" ise sebep-sonuç ilişkisi kurar, oysa cümlede zıtlık anlamı aranmaktadır.$b07ex$,
  'concession-connectors',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b08qt$------- the committee had reviewed every application carefully, several qualified candidates were still mistakenly rejected.$b08qt$,
  $b08op$[{"id":"a","text":"Although"},{"id":"b","text":"Despite"},{"id":"c","text":"In spite of"},{"id":"d","text":"However"}]$b08op$::jsonb,
  'a',
  $b08ex$Boşluktan hemen sonra "the committee had reviewed" yani özne+yüklem içeren tam bir cümlecik geldiği için "despite/in spite of" kullanılamaz, çünkü bu ikisi sadece isim ya da -ing yapısı alır. "However" bir bağlaç değil cümle zarfıdır ve doğrudan bir cümleciğin başına gelip onu diğerine bağlayamaz; doğru cevap bu yüzden "although"dur.$b08ex$,
  'concession-connectors',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b09qt$If the government ------- more transparent about its spending, public trust in state institutions would increase significantly.$b09qt$,
  $b09op$[{"id":"a","text":"were"},{"id":"b","text":"is"},{"id":"c","text":"will be"},{"id":"d","text":"had been"}]$b09op$::jsonb,
  'a',
  $b09ex$Cümle şimdiki zamanda gerçek olmayan hayali bir durumu anlattığı için Tip 2 koşul cümlesidir; bu yapıda "be" fiili için özne ne olursa olsun "were" tercih edilir. "Is" present simple olduğu için Tip 1'e aittir ve ana cümledeki "would" ile uyuşmaz; "will be" if cümleciğinde asla kullanılmaz; "had been" ise Tip 3'e ait past perfect yapıdır ve ana cümlede "would have increased" gerektirirdi.$b09ex$,
  'conditionals-second',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b10qt$If more companies ------- their employees' feedback seriously, workplace morale would improve across many industries.$b10qt$,
  $b10op$[{"id":"a","text":"took"},{"id":"b","text":"take"},{"id":"c","text":"will take"},{"id":"d","text":"have taken"}]$b10op$::jsonb,
  'a',
  $b10ex$Ana cümledeki "would improve" ifadesi Tip 2 koşul cümlesini işaret eder; bu yapıda if cümleciğinde fiil past simple formunda olmalıdır, bu yüzden doğru cevap "took"tur. "Take" present simple olup Tip 1 ile uyumludur ama ana cümle "would" içerdiği için elenir; "will take" if cümleciğinde asla kullanılmaz; "have taken" present perfect olup bu kalıpla uyuşmaz.$b10ex$,
  'conditionals-second',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b11qt$If the engineers ------- the structural flaws earlier, the bridge collapse could have been prevented.$b11qt$,
  $b11op$[{"id":"a","text":"had detected"},{"id":"b","text":"detected"},{"id":"c","text":"would have detected"},{"id":"d","text":"have detected"}]$b11op$::jsonb,
  'a',
  $b11ex$Ana cümledeki "could have been prevented" yapısı Tip 3 koşul cümlesine işaret eder ve bu durumda if cümleciğinde "had + V3" kullanılması gerekir, doğru cevap "had detected"tır. "Would have detected" if cümleciğinde asla kullanılmaz, bu kalıp sadece ana cümlede yer alır; "detected" past simple olduğu için Tip 2 ile karışır; "have detected" present perfect bu yapıyla uyumsuzdur.$b11ex$,
  'conditionals-third',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b12qt$Had she ------- the contract more carefully, she would never have agreed to such unfavorable terms.$b12qt$,
  $b12op$[{"id":"a","text":"read"},{"id":"b","text":"reads"},{"id":"c","text":"to read"},{"id":"d","text":"has read"}]$b12op$::jsonb,
  'a',
  $b12ex$"Had she..." yapısı if cümleciğinin devrik (inversion) hâlidir ve "if she had read" anlamına gelir; bu nedenle fiil mutlaka V3 formunda, yani "read" olmalıdır. "Reads" present simple olduğu için bu yapıyla uyuşmaz; "to read" infinitive bu kalıpta kullanılmaz; "has read" present perfect olup past perfect gerektiren Tip 3 yapısına uymaz.$b12ex$,
  'conditionals-third',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b13qt$If you ------- a metal spoon in a glass of boiling water, it quickly becomes too hot to touch.$b13qt$,
  $b13op$[{"id":"a","text":"place"},{"id":"b","text":"will place"},{"id":"c","text":"placed"},{"id":"d","text":"are placing"}]$b13op$::jsonb,
  'a',
  $b13ex$Bu cümle genel bir bilimsel/fiziksel gerçeği anlattığı için Tip 0 koşul cümlesidir ve her iki tarafta da present simple kullanılır, doğru cevap "place"tir. "Will place" if cümleciğinde kullanılmaz çünkü genel gerçeklerde "will" yer almaz; "placed" past simple bu yapıyla uyuşmaz; "are placing" present continuous genel bir gerçeği anlatmak için uygun değildir.$b13ex$,
  'conditionals-zero-first',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b14qt$If the shipment ------- on time tomorrow, the factory will have to halt production until the new parts arrive.$b14qt$,
  $b14op$[{"id":"a","text":"does not arrive"},{"id":"b","text":"will not arrive"},{"id":"c","text":"did not arrive"},{"id":"d","text":"is not arriving"}]$b14op$::jsonb,
  'a',
  $b14ex$"Tomorrow" ile gelecekte gerçekleşmesi olası bir durum anlatıldığı için bu Tip 1 koşul cümlesidir; if cümleciğinde present simple kullanılır, bu yüzden doğru cevap "does not arrive"tır. "Will" if cümleciğinde asla kullanılmaz, bu nedenle "will not arrive" yanlıştır; "did not arrive" past simple olduğu için gelecekteki bir olasılığı anlatamaz; "is not arriving" present continuous bu bağlamda ana cümledeki "will have to" ile tip uyuşmazlığı yaratır.$b14ex$,
  'conditionals-zero-first',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b15qt$The new regulations significantly increased production costs for small manufacturers; ------- many of them were forced to raise their prices or shut down entirely.$b15qt$,
  $b15op$[{"id":"a","text":"as a result"},{"id":"b","text":"however"},{"id":"c","text":"in addition"},{"id":"d","text":"although"}]$b15op$::jsonb,
  'a',
  $b15ex$İki cümle arasında net bir sebep-sonuç ilişkisi vardır (maliyetlerin artması, fiyat artışı veya kapanmaya yol açması), bu yüzden doğru cevap "as a result"tur. "However" zıtlık bildirir ve burada bir çelişki yoktur; "in addition" ekleme bağlacıdır ve sonuç ilişkisini karşılamaz; "although" bağlaç olarak cümle başına gelmesi gerekir, noktalı virgülden sonra bağımsız bir cümle zarfı aranmaktadır ve ayrıca zıtlık değil sonuç anlamı gerekmektedir.$b15ex$,
  'connectors-linking-words',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b16qt$The committee's report not only exposed serious flaws in the city's waste management system ------- proposed a detailed, cost-effective plan for reform.$b16qt$,
  $b16op$[{"id":"a","text":"but also"},{"id":"b","text":"however"},{"id":"c","text":"moreover"},{"id":"d","text":"therefore"}]$b16op$::jsonb,
  'a',
  $b16ex$Cümlenin başındaki "not only" ifadesi paralel yapı gereği mutlaka "but also" ile tamamlanmalıdır. "However" bağlaç değildir ve bu kalıba uymaz; "moreover/therefore" bağımsız cümle zarflarıdır ve "not only...but also" kalıbının bir parçası olamaz, bu yapıda sadece "but also" kullanılabilir.$b16ex$,
  'connectors-linking-words',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b17qt$The engineers admitted that they still lacked sufficient ------- about the chemical composition of the contaminated soil before approving the cleanup plan.$b17qt$,
  $b17op$[{"id":"a","text":"information"},{"id":"b","text":"an information"},{"id":"c","text":"informations"},{"id":"d","text":"few information"}]$b17op$::jsonb,
  'a',
  $b17ex$"Information" İngilizcede sayılamayan bir isimdir, bu yüzden "a/an" ile kullanılamaz ve çoğul eki alamaz; doğru kullanım yalın haliyle "information"dır. "An information" ve "informations" bu nedenle kesinlikle yanlıştır; "few" sayılabilir isimlerle kullanılır, sayılamayan bir isimle "little" gerekir, bu yüzden "few information" da yanlıştır.$b17ex$,
  'countable-uncountable-nouns',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b18qt$After months of searching, the couple finally found ------- that fit perfectly in their small apartment without overwhelming the living room.$b18qt$,
  $b18op$[{"id":"a","text":"a piece of furniture"},{"id":"b","text":"a furniture"},{"id":"c","text":"furnitures"},{"id":"d","text":"few furnitures"}]$b18op$::jsonb,
  'a',
  $b18ex$"Furniture" Türkçede çoğul hissettirse de İngilizcede sayılamayan bir isimdir, bu yüzden "a/an" ile veya çoğul ekiyle kullanılamaz; tekil bir mobilya parçasından bahsetmek için "a piece of furniture" gibi bölücü (partitive) bir ifade kullanılır. "A furniture" ve "furnitures" bu yüzden yanlıştır; "few furnitures" ise hem sayılamayan bir isme çoğul ek eklemiş hem de sayılabilir isimler için kullanılan "few"ı yanlış yerde kullanmıştır.$b18ex$,
  'countable-uncountable-nouns',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b19qt$The success of the entire harvest largely ------- the amount of rainfall the region receives during the spring months.$b19qt$,
  $b19op$[{"id":"a","text":"depends on"},{"id":"b","text":"depends of"},{"id":"c","text":"depends with"},{"id":"d","text":"depends to"}]$b19op$::jsonb,
  'a',
  $b19ex$"Depend" fiili sabit olarak "on" edatıyla kullanılır ("depend on"); bu, Türkçedeki "-e bağlı olmak" ifadesinin edat mantığıyla örtüşmediği için ezberden bilinmesi gereken bir kalıptır. "Depends of/with/to" İngilizcede kullanılmayan yanlış kombinasyonlar olduğu için kesinlikle yanlıştır.$b19ex$,
  'dependent-prepositions',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b20qt$Many students in the department are genuinely ------- the historical connections between ancient trade routes and modern economic patterns.$b20qt$,
  $b20op$[{"id":"a","text":"interested in"},{"id":"b","text":"interested with"},{"id":"c","text":"interested for"},{"id":"d","text":"interested about"}]$b20op$::jsonb,
  'a',
  $b20ex$"Interested" sıfatı sabit olarak "in" edatıyla kullanılır. Türkçede "ilgilenmek" fiili "ile" ekini çağrıştırdığı için öğrenciler genellikle "with" şıkkını seçme hatasına düşer, ancak doğru kalıp "interested IN"dir; "interested for/about" da İngilizcede kullanılmayan yanlış kombinasyonlardır.$b20ex$,
  'dependent-prepositions',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b21qt$------- the final stages of the negotiation, both delegations agreed to bring in an independent mediator to resolve the remaining disputes.$b21qt$,
  $b21op$[{"id":"a","text":"During"},{"id":"b","text":"While"},{"id":"c","text":"When they were"},{"id":"d","text":"For"}]$b21op$::jsonb,
  'a',
  $b21ex$Boşluktan hemen sonra "the final stages of the negotiation" gibi bir isim öbeği geldiği için doğru cevap "during"dir. "While" ardından özne+yüklem içeren tam bir cümlecik gelmesi gerekir, burada sadece isim öbeği vardır; "for" bir sürenin uzunluğunu belirtir, oysa burada bir zaman dilimi içinde gerçekleşme anlamı aranmaktadır; "when they were" fazladan özne-yüklem ekleyerek cümlenin yapısını bozar.$b21ex$,
  'during-while',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b22qt$------- the research team was analyzing the soil samples, they discovered traces of a previously unknown mineral compound.$b22qt$,
  $b22op$[{"id":"a","text":"While"},{"id":"b","text":"During"},{"id":"c","text":"For"},{"id":"d","text":"In spite of"}]$b22op$::jsonb,
  'a',
  $b22ex$Boşluktan hemen sonra "the research team was analyzing" yani özne+yüklem içeren tam bir cümlecik geldiği için doğru cevap "while"dır. "During" ardından sadece isim ya da isim öbeği gelebilir, tam bir cümlecik alamaz; "for" süre uzunluğu belirtir ve burada uygun değildir; "in spite of" zıtlık bildirir, oysa bu cümlede zamansal eşzamanlılık anlatılmaktadır.$b22ex$,
  'during-while',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b23qt$------- of the two finalists delivered a compelling presentation, making it extremely difficult for the judges to choose a winner.$b23qt$,
  $b23op$[{"id":"a","text":"Each"},{"id":"b","text":"Every"},{"id":"c","text":"Every one"},{"id":"d","text":"All"}]$b23op$::jsonb,
  'a',
  $b23ex$"Each", iki üyeli bir grupla bile kullanılabilir ve üyeleri tek tek, birey birey ele alır, bu yüzden "of the two finalists" ifadesiyle uyumludur. "Every" en az üç üyeli bir grup gerektirir ve ayrıca asla "of" ile kullanılmaz, bu yüzden "every"/"every one" bu kalıpta yer alamaz; "all" ise çoğul bir isim öbeğiyle gramer olarak kurulabilse de iki kişilik bir grup için doğal değildir ve cümledeki "her biri ayrı ayrı" vurgusunu karşılamaz.$b23ex$,
  'each-every-difference',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b24qt$The clinic requires ------- patient to complete a detailed medical history form before their first appointment, regardless of the reason for the visit.$b24qt$,
  $b24op$[{"id":"a","text":"every"},{"id":"b","text":"each of"},{"id":"c","text":"all"},{"id":"d","text":"every of"}]$b24op$::jsonb,
  'a',
  $b24ex$"Every" bir grubu bütün olarak genellemek için kullanılır ve doğrudan tekil bir isimle birleşir ("every patient"); burada en az üç kişilik bir hasta grubu genellendiği için "every" doğrudur. "Each of" tek başına bir isimle değil "each of the patients" gibi "of + çoğul isim" kalıbıyla kullanılır, burada "patient" tekil geldiği için uyumsuzdur; "all" çoğul bir isimle kullanılır, tekil "patient" ile kullanılamaz; "every of" ise kesinlikle yanlıştır çünkü "every" asla "of" ile kullanılmaz.$b24ex$,
  'each-every-difference',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $b25qt$The archaeological excavation has continued ------- nearly a decade, yet researchers still have not uncovered the tomb's main chamber.$b25qt$,
  $b25op$[{"id":"a","text":"for"},{"id":"b","text":"since"},{"id":"c","text":"during"},{"id":"d","text":"while"}]$b25op$::jsonb,
  'a',
  $b25ex$Boşluktan sonra "nearly a decade" gibi bir SÜRE ifadesi geldiği için doğru cevap "for"dur. "Since" bir başlangıç noktası gerektirir, burada bir zaman noktası değil süre belirtilmektedir; "during" ardından isim öbeği gelse de bir sürenin uzunluğunu değil bir zaman dilimi içinde gerçekleşmeyi belirtir ve "how long" sorusuna cevap olamaz; "while" ardından özne+yüklem içeren bir cümlecik gerektirir.$b25ex$,
  'for-since-how-long',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $b26qt$The organization has provided free legal counsel to refugees ------- it was founded by a group of human rights lawyers in the aftermath of the civil war.$b26qt$,
  $b26op$[{"id":"a","text":"since"},{"id":"b","text":"for"},{"id":"c","text":"during"},{"id":"d","text":"when"}]$b26op$::jsonb,
  'a',
  $b26ex$Boşluktan sonra "it was founded..." yani bir başlangıç noktası ifade eden bir cümlecik geldiği için doğru cevap "since"tir; ana cümledeki "has provided" present perfect yapısı da bu noktadan bugüne süren bir durumu anlattığı için "since" ile uyumludur. "For" bir süre ifadesiyle kullanılır, burada bir başlangıç noktası vardır; "during" isim öbeği ister, burada özne+yüklem içeren bir cümlecik vardır; "when" zaman belirtse de present perfect ile birlikte bu şekilde kullanılmaz.$b26ex$,
  'for-since-how-long',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c01qt$At 8 o'clock tomorrow evening, the delegation ------- (fly) over the Atlantic on their way to the summit in Washington.$c01qt$,
  $c01op$[{"id":"a","text":"flies"},{"id":"b","text":"is flying"},{"id":"c","text":"will be flying"},{"id":"d","text":"will have flown"}]$c01op$::jsonb,
  'c',
  $c01ex$"At 8 o'clock tomorrow evening" belirli bir ana işaret ettiği ve o anda eylemin hâlâ sürmekte olacağı anlatıldığı için doğru cevap future continuous "will be flying"dir. "will have flown" yanlıştır çünkü bu yapı eylemin o andan önce tamamlanmış olacağını anlatır, oysa cümlede delegasyonun tam o saatte uçakta olduğu vurgulanıyor.$c01ex$,
  'future-continuous-perfect',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c02qt$By the time the new regulations come into effect next March, most companies ------- (adapt) their reporting systems accordingly.$c02qt$,
  $c02op$[{"id":"a","text":"are adapting"},{"id":"b","text":"adapt"},{"id":"c","text":"will be adapting"},{"id":"d","text":"will have adapted"}]$c02op$::jsonb,
  'd',
  $c02ex$"By the time + present simple" kalıbı YDS'nin klasik future perfect tetikleyicisidir ve eylemin o tarihten önce tamamlanmış olacağını anlatır, bu yüzden "will have adapted" doğrudur. "will be adapting" yanlıştır çünkü bu yapı o anda eylemin hâlâ sürdüğünü ima eder, oysa cümle uyum sürecinin bitmiş olacağını vurgular.$c02ex$,
  'future-continuous-perfect',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c03qt$We ------- (launch) the new product line next month; the marketing team has already booked venues and printed the brochures.$c03qt$,
  $c03op$[{"id":"a","text":"will launch"},{"id":"b","text":"are going to launch"},{"id":"c","text":"launch"},{"id":"d","text":"would launch"}]$c03op$::jsonb,
  'b',
  $c03ex$"has already booked...and printed" konuşmadan önce kurulmuş somut bir planın kanıtı olduğu için doğru cevap "are going to launch"tır. "will launch" yanlıştır çünkü will, anlık kararı ya da kişisel tahmini anlatır, oysa burada önceden hazırlanmış kesin bir plandan söz edilmektedir.$c03ex$,
  'future-going-to-will',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c04qt$I ------- (call) you back as soon as the meeting ends; I just noticed I have three missed calls from you.$c04qt$,
  $c04op$[{"id":"a","text":"am going to call"},{"id":"b","text":"call"},{"id":"c","text":"will call"},{"id":"d","text":"am calling"}]$c04op$::jsonb,
  'c',
  $c04ex$"I just noticed" konuşma anında verilen spontane bir kararı gösterdiği için doğru cevap "will call"dır. "am going to call" yanlıştır çünkü bu yapı önceden kurulmuş bir niyeti gerektirir, oysa karar burada telefonları gördüğü anda, aniden verilmiştir.$c04ex$,
  'future-going-to-will',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c05qt$She ------- (meet) her supervisor at the airport at 6 a.m. on Monday to discuss the details of the overseas assignment.$c05qt$,
  $c05op$[{"id":"a","text":"will meet"},{"id":"b","text":"meets"},{"id":"c","text":"is meeting"},{"id":"d","text":"has met"}]$c05op$::jsonb,
  'c',
  $c05ex$"at 6 a.m. on Monday" gibi kesin bir zaman/yer detayı ve "meet" gibi randevu bildiren bir fiil bir arada olduğu için bu önceden ayarlanmış bir düzenlemedir, bu yüzden present continuous "is meeting" doğrudur. "will meet" yanlıştır çünkü will daha çok belirsiz bir tahmini anlatır, oysa burada zaten takvime bağlanmış somut bir plan söz konusudur.$c05ex$,
  'future-present-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c06qt$The research team ------- (fly) to Geneva next Thursday, since they have already arranged accommodation and confirmed their conference passes.$c06qt$,
  $c06op$[{"id":"a","text":"flies"},{"id":"b","text":"would fly"},{"id":"c","text":"will fly"},{"id":"d","text":"is flying"}]$c06op$::jsonb,
  'd',
  $c06ex$"have already arranged accommodation and confirmed...passes" cümlenin önceden düzenlenmiş, takvime bağlı bir seyahati anlattığını gösterir, bu yüzden present continuous "is flying" doğrudur. "will fly" yanlıştır çünkü will burada sadece bir tahmin izlenimi verir, oysa seyahat zaten kesinleşmiş bir düzenlemedir.$c06ex$,
  'future-present-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c07qt$------- the annual financial statements accurately is a legal obligation that every publicly traded company must fulfill without exception.$c07qt$,
  $c07op$[{"id":"a","text":"Prepare"},{"id":"b","text":"To preparing"},{"id":"c","text":"Prepared"},{"id":"d","text":"Preparing"}]$c07op$::jsonb,
  'd',
  $c07ex$Boşluk cümlenin başında, özne konumunda ve tekil fiil "is" ile kullanıldığı için -ing formu isim gibi davranan bir gerund olmalıdır, bu yüzden "Preparing" doğrudur. "To preparing" gramer olarak hiç var olmayan bir yapıdır çünkü infinitive ya "to prepare" ya da gerund "preparing" şeklinde olur, ikisinin karışımı kurulamaz.$c07ex$,
  'gerund-as-subject-object',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c08qt$The inspector refused to approve the building after ------- several structural cracks in the foundation during his visit.$c08qt$,
  $c08op$[{"id":"a","text":"notice"},{"id":"b","text":"to notice"},{"id":"c","text":"noticed"},{"id":"d","text":"noticing"}]$c08op$::jsonb,
  'd',
  $c08ex$Edat "after"tan sonra gelen fiil her zaman -ing (gerund) formunda olur çünkü edatlardan sonra isim soylu bir yapı gelmesi gerekir, bu yüzden "noticing" doğrudur. "to notice" yanlıştır çünkü edattan sonra to-infinitive asla kullanılmaz, edatlar yalnızca isim veya gerund alır.$c08ex$,
  'gerund-as-subject-object',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c09qt$Despite the chaos of the move, she clearly remembers ------- the front door before leaving the house that morning.$c09qt$,
  $c09op$[{"id":"a","text":"to lock"},{"id":"b","text":"lock"},{"id":"c","text":"locking"},{"id":"d","text":"having lock"}]$c09op$::jsonb,
  'c',
  $c09ex$"remember doing" geçmişte yapılmış bir eylemi hatırlamak anlamına gelir ve "clearly remembers" ifadesi geçmişte yaşanmış bir anıyı anlattığı için doğru cevap "locking"tir. "to lock" yanlıştır çünkü "remember to do" henüz yapılacak, unutulmaması gereken bir görevi anlatır, oysa burada kapıyı kilitleme eylemi zaten gerçekleşmiş ve hatırlanmaktadır.$c09ex$,
  'gerund-vs-infinitive',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c10qt$After months of deliberation, the city council finally agreed ------- the old stadium rather than demolish it entirely.$c10qt$,
  $c10op$[{"id":"a","text":"renovating"},{"id":"b","text":"to renovate"},{"id":"c","text":"renovate"},{"id":"d","text":"having renovated"}]$c10op$::jsonb,
  'b',
  $c10ex$"agree" fiili henüz gerçekleşmemiş, geleceğe yönelik bir niyeti anlattığı için to-infinitive alır, bu yüzden doğru cevap "to renovate"tir. "renovating" yanlıştır çünkü agree gibi niyet bildiren fiiller gerund değil mutlaka to-infinitive ile kullanılır.$c10ex$,
  'gerund-vs-infinitive',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c11qt$Mr. Harrison isn't in his office right now; he ------- to the bank to sort out a problem with the company account.$c11qt$,
  $c11op$[{"id":"a","text":"went"},{"id":"b","text":"has been"},{"id":"c","text":"has gone"},{"id":"d","text":"had gone"}]$c11op$::jsonb,
  'c',
  $c11ex$"isn't in his office right now" onun hâlâ ofiste olmadığını, yani gittiği yerden henüz dönmediğini gösterdiği için doğru cevap "has gone"dur. "has been" yanlıştır çünkü bu yapı kişinin gidip geri döndüğünü ima eder, oysa cümle onun şu anda hâlâ dışarıda olduğunu açıkça belirtmektedir.$c11ex$,
  'gone-vs-been',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c12qt$According to her passport stamps, Elena ------- to more than fifteen countries across three continents over the past decade.$c12qt$,
  $c12op$[{"id":"a","text":"has gone"},{"id":"b","text":"went"},{"id":"c","text":"had gone"},{"id":"d","text":"has been"}]$c12op$::jsonb,
  'd',
  $c12ex$"more than fifteen countries" bir deneyim/sayı belirteci olduğu ve Elena'nın bu ülkelere gidip geri döndüğü anlaşıldığı için doğru cevap "has been"dir. "has gone" yanlıştır çünkü bu yapı öznenin hâlâ o yerde olduğunu anlatır, oysa burada geçmişte yaşanmış, tamamlanmış bir seyahat deneyiminden söz edilmektedir.$c12ex$,
  'gone-vs-been',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c13qt$Although the surgeon operated under enormous pressure that night, she performed the complicated procedure remarkably -------.$c13qt$,
  $c13op$[{"id":"a","text":"good"},{"id":"b","text":"best"},{"id":"c","text":"well"},{"id":"d","text":"better"}]$c13op$::jsonb,
  'c',
  $c13ex$Boşluk "performed" fiilini nitelediği için zarf olan "well" doğru cevaptır. "good" yanlıştır çünkü good bir sıfattır ve yalnızca isimleri niteler, burada ise nitelenen şey bir isim değil bir fiildir.$c13ex$,
  'good-well-difference',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c14qt$Ever since she caught the flu last week, Aunt Nermin hasn't been feeling ------- enough to leave her bed.$c14qt$,
  $c14op$[{"id":"a","text":"good"},{"id":"b","text":"well"},{"id":"c","text":"best"},{"id":"d","text":"nicely"}]$c14op$::jsonb,
  'b',
  $c14ex$"feel" bir bağlantı (linking) fiildir ve cümle "caught the flu" ile açıkça bir sağlık durumundan bahsettiği için "well" burada istisnai olarak sıfat gibi kullanılır ve "sağlıklı/iyi hissetmek" anlamı verir. "good" yanlıştır çünkü sağlık bağlamında "feel" fiilinden sonra İngilizcede tercih edilen kelime "well"dir, "good" bu özel bağlamda doğal değildir.$c14ex$,
  'good-well-difference',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c15qt$You ------- finish the report before the deadline, or the client will cancel the contract immediately.$c15qt$,
  $c15op$[{"id":"a","text":"would rather"},{"id":"b","text":"had better to"},{"id":"c","text":"would rather to"},{"id":"d","text":"had better"}]$c15op$::jsonb,
  'd',
  $c15ex$Cümlede "or" ile devam eden ve yapılmazsa kötü bir sonucun doğacağı bir uyarı olduğu için doğru yapı "had better"dır. "had better to" ve "would rather to" şıkları kesinlikle yanlıştır çünkü had better ve would rather'dan sonra asla "to" kullanılmaz, doğrudan fiilin yalın hâli gelir.$c15ex$,
  'had-better-would-rather',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c16qt$I'd rather you ------- me before making any changes to the shared project files; it caused real confusion last time.$c16qt$,
  $c16op$[{"id":"a","text":"tell"},{"id":"b","text":"would tell"},{"id":"c","text":"told"},{"id":"d","text":"had told"}]$c16op$::jsonb,
  'c',
  $c16ex$Tercih başka bir kişinin eylemiyle ilgili olduğu için "would rather + özne + past simple" kalıbı kullanılır; şu an için bile fiil geçmiş zaman formuna döner, bu yüzden doğru cevap "told"dur. "tell" yanlıştır çünkü would rather + özne yapısında fiil asla yalın hâlde kalmaz, bu YDS'nin klasik tuzağıdır.$c16ex$,
  'had-better-would-rather',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c17qt$The flight will be delayed ------- the technical fault is repaired before the scheduled departure time this evening.$c17qt$,
  $c17op$[{"id":"a","text":"if"},{"id":"b","text":"unless not"},{"id":"c","text":"in case"},{"id":"d","text":"unless"}]$c17op$::jsonb,
  'd',
  $c17ex$"unless" "if...not" ile aynı anlamı taşıdığı için "eğer arıza giderilmezse uçuş gecikecek" anlamını tek başına verir, bu yüzden doğru cevap "unless"tir. "unless not" şıkkı çift olumsuzluk hatasıdır ve kesinlikle yanlıştır çünkü unless zaten içinde olumsuzluk anlamı barındırır.$c17ex$,
  'if-unless-in-case',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c18qt$Take a copy of all the original documents with you ------- the immigration officer asks for additional proof of your enrollment.$c18qt$,
  $c18op$[{"id":"a","text":"if"},{"id":"b","text":"in case"},{"id":"c","text":"unless"},{"id":"d","text":"as if"}]$c18op$::jsonb,
  'b',
  $c18ex$Cümle, belgenin istenme ihtimaline karşı önceden alınan bir tedbirden bahsediyor, bir koşuldan değil; bu yüzden doğru cevap "in case"tir. "if" yanlıştır çünkü if, gerçekleşirse bir sonucun ortaya çıkacağı bir koşulu anlatır, oysa burada belgeleri yanına alma eylemi istenip istenmeyeceğinden bağımsız olarak zaten önceden yapılmaktadır.$c18ex$,
  'if-unless-in-case',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c19qt$The selection criteria used by the admissions committee ------- far stricter this year than they were in the previous application cycle.$c19qt$,
  $c19op$[{"id":"a","text":"is"},{"id":"b","text":"was"},{"id":"c","text":"are"},{"id":"d","text":"has been"}]$c19op$::jsonb,
  'c',
  $c19ex$"criteria" kelimesi "criterion"ın çoğulu olduğu için çoğul bir isimdir ve özne-yüklem uyumu gereği fiil de çoğul olmalıdır, bu yüzden doğru cevap "are"dır. "is" ve "has been" yanlıştır çünkü bu şıklar "criteria"yı yanlışlıkla tekil bir isim gibi değerlendirmektedir.$c19ex$,
  'irregular-plurals',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c20qt$Several rare ------- of orchid have recently been discovered in the remote rainforests of the region by the research expedition.$c20qt$,
  $c20op$[{"id":"a","text":"specie"},{"id":"b","text":"speciess"},{"id":"c","text":"species's"},{"id":"d","text":"species"}]$c20op$::jsonb,
  'd',
  $c20ex$"species" hem tekil hem çoğul olarak aynı şekilde kullanılan düzensiz bir isimdir, bu yüzden "several rare species" ifadesinde ekstra bir çoğul eki almadan doğrudan kullanılır. "speciess" gibi fazladan çoğul eki eklenmiş bir şık kesinlikle yanlıştır çünkü bu isim zaten değişmeden çoğul anlam taşır.$c20ex$,
  'irregular-plurals',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c21qt$If she ------- harder for the certification exam last year, she would be working as a licensed engineer right now instead of an intern.$c21qt$,
  $c21op$[{"id":"a","text":"studied"},{"id":"b","text":"would study"},{"id":"c","text":"had studied"},{"id":"d","text":"has studied"}]$c21op$::jsonb,
  'c',
  $c21ex$Cümlede "last year" geçmişteki belirli bir olayı, "right now" ise şimdiki sonucu gösterdiği için bu bir karma şart cümlesidir ve if cümleciği past perfect alır, bu yüzden doğru cevap "had studied"tir. "studied" yanlıştır çünkü düz past simple geçmişteki olayla şimdiki sonuç arasındaki bu özel karma yapıyı kuramaz; if tarafı mutlaka had + V3 olmalıdır.$c21ex$,
  'mixed-conditionals',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c22qt$If he weren't so stubborn about asking for help, he ------- the deadline last month instead of submitting the project three weeks late.$c22qt$,
  $c22op$[{"id":"a","text":"met"},{"id":"b","text":"had met"},{"id":"c","text":"would meet"},{"id":"d","text":"would have met"}]$c22op$::jsonb,
  'd',
  $c22ex$"weren't" şimdiki/sürekli bir kişilik özelliğini, "last month" ise geçmişteki bir sonucu anlattığı için bu karma şartta if cümleciği past simple, sonuç cümleciği ise "would have met" (would have + V3) olmalıdır. "would meet" yanlıştır çünkü bu, standart tip 2 şart cümlesine ait bir sonuç yapısıdır ve şimdiki hayali bir durumu anlatır, geçmişteki belirli bir sonucu değil.$c22ex$,
  'mixed-conditionals',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c23qt$Despite the sudden power outage during the final exam, the technicians ------- restore the server within fifteen minutes.$c23qt$,
  $c23op$[{"id":"a","text":"were able"},{"id":"b","text":"could"},{"id":"c","text":"can"},{"id":"d","text":"were able to"}]$c23op$::jsonb,
  'd',
  $c23ex$Cümle geçmişte tek seferlik, belirli bir başarıyı anlattığı için doğru cevap "were able to"dur. "could" yanlıştır çünkü could genel/sürekli bir yeteneği anlatır, oysa burada belirli bir olayda elde edilmiş özel bir başarı söz konusudur ve bu YDS'de tipik bir yanlış şık tuzağıdır.$c23ex$,
  'modals-ability',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c24qt$When my grandfather lived in the countryside as a boy, he ------- identify every bird species by its call alone.$c24qt$,
  $c24op$[{"id":"a","text":"is able to"},{"id":"b","text":"was able to"},{"id":"c","text":"could"},{"id":"d","text":"has been able to"}]$c24op$::jsonb,
  'c',
  $c24ex$Cümle çocukluğunda edinilmiş genel ve sürekli bir yeteneği anlattığı için doğru cevap "could"dur. "was able to" yanlıştır çünkü bu yapı tek seferlik, belirli bir başarıyı anlatmak için kullanılır, oysa burada yıllar boyunca süren genel bir beceriden söz edilmektedir.$c24ex$,
  'modals-ability',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $c25qt$He ------- be the author of that anonymous letter, because he was attending a conference in another country when it was sent.$c25qt$,
  $c25op$[{"id":"a","text":"mustn't"},{"id":"b","text":"may not"},{"id":"c","text":"can't"},{"id":"d","text":"shouldn't"}]$c25op$::jsonb,
  'c',
  $c25ex$Olumsuz kesinlikte "must not" değil "can't/couldn't" kullanılır, bu yüzden "was attending a conference in another country" gibi kesin bir kanıta dayanan bu güçlü olumsuz çıkarımda doğru cevap "can't"tır. "mustn't" yanlıştır çünkü bu yapı yasaklama anlamı taşır, olumsuz kesinlik/çıkarım anlamını veremez; bu YDS'de en sık karıştırılan noktadır.$c25ex$,
  'modals-deduction',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $c26qt$The lights were still on and the laptop was still running when I got home, so my son ------- (forget) to turn them off before leaving for school.$c26qt$,
  $c26op$[{"id":"a","text":"can have forgotten"},{"id":"b","text":"should have forgotten"},{"id":"c","text":"must forget"},{"id":"d","text":"must have forgotten"}]$c26op$::jsonb,
  'd',
  $c26ex$Cümlede "lights were still on" somut kanıtına dayanarak geçmişe yönelik güçlü bir çıkarım yapıldığı için doğru kalıp modal perfect olan "must have forgotten"dır. "should have forgotten" yanlıştır çünkü bu yapı pişmanlık duyulan, yapılması gerekip de yapılmayan bir eylemi anlatır, güçlü bir çıkarımı değil; ayrıca "must forget" yanlıştır çünkü geçmişe dönük çıkarımda modal + HAVE + V3 kalıbı zorunludur.$c26ex$,
  'modals-deduction',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d01qt$Since passengers at this airport ------- show a valid passport at every checkpoint, no exceptions are made even for diplomats or senior officials.$d01qt$,
  $d01op$[{"id":"a","text":"must"},{"id":"b","text":"have to"},{"id":"c","text":"don't have to"},{"id":"d","text":"mustn't"}]$d01op$::jsonb,
  'b',
  $d01ex$"no exceptions are made even for diplomats" ifadesi zorunluluğun dışarıdan gelen bir KURALDAN kaynaklandığını gösterir, bu yüzden doğru cevap "have to"dur. "must" yanlıştır çünkü konuşmacının kişisel kararını değil, havaalanı yönetmeliğini anlatıyoruz; "don't have to" ve "mustn't" ise tamamen farklı anlamlar (gereksizlik/yasak) taşıdığından bağlama uymaz.$d01ex$,
  'modals-obligation-advice',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d02qt$You ------- hand in the assignment tomorrow; the deadline has been extended to next Friday, so there is no rush at all.$d02qt$,
  $d02op$[{"id":"a","text":"must not"},{"id":"b","text":"don't have to"},{"id":"c","text":"shouldn't"},{"id":"d","text":"mustn't"}]$d02op$::jsonb,
  'b',
  $d02ex$"the deadline has been extended... no rush" ifadesi bir şeyin yapılmasının GEREKMEDİĞİNİ ama serbest olduğunu gösterir, bu yüzden doğru cevap "don't have to"dur. "must not" ve "mustn't" YASAK anlamı taşıdığından anlamca tamamen ters düşer; "shouldn't" ise tavsiye bildirir, zorunluluk ayrımıyla ilgisizdir.$d02ex$,
  'modals-obligation-advice',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d03qt$------- you kindly explain the registration procedure once more? I didn't quite follow it the first time you described it.$d03qt$,
  $d03op$[{"id":"a","text":"Could"},{"id":"b","text":"May"},{"id":"c","text":"Can"},{"id":"d","text":"Must"}]$d03op$::jsonb,
  'a',
  $d03ex$Burada bir eylemin tekrar açıklanması için KİBAR BİR RİCA söz konusudur, izin istenmemektedir; bu yüzden doğru cevap "Could"tur. "May" yanlıştır çünkü izin sorma işlevi görür, oysa cümlede izin değil rica vardır; "Can" ise burada daha gayri resmi ve ricadan çok yetenek/izin çağrışımı yapar.$d03ex$,
  'modals-permission-requests',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d04qt$Students who submit their coursework after the official deadline ------- request a short extension from the course coordinator, provided they have a documented reason.$d04qt$,
  $d04op$[{"id":"a","text":"may"},{"id":"b","text":"could"},{"id":"c","text":"can"},{"id":"d","text":"must"}]$d04op$::jsonb,
  'a',
  $d04ex$Akademik ve resmî bir metinde izin bildirmek için "may" tercih edilir, bu yüzden doğru cevap "may"dir. "could" burada izin değil kibar rica anlamı taşıdığından metnin resmî kural bildiren yapısına uymaz; "can" günlük konuşma diline aittir; "must" ise zorunluluk bildirir, izinle ilgisizdir.$d04ex$,
  'modals-permission-requests',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d05qt$------- environmental scientists agree that immediate international action is required to slow down the rate of global warming.$d05qt$,
  $d05op$[{"id":"a","text":"Most"},{"id":"b","text":"Most of"},{"id":"c","text":"Most of the"},{"id":"d","text":"The most of"}]$d05op$::jsonb,
  'a',
  $d05ex$Boşluktan sonra "environmental scientists" çıplak bir çoğul isim geldiği ve belirli bir gruptan değil genel olarak bilim insanlarından söz edildiği için doğru cevap "Most"tur. "Most of" ve "Most of the" yanlıştır çünkü "of" yapısı ancak the/this/my gibi bir belirleyiciyle birlikte BELİRLİ bir grubu işaret ederken kullanılır; burada böyle bir belirleyici yoktur.$d05ex$,
  'most-most-of',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d06qt$------- the committee members who attended last month's conference later submitted detailed feedback reports to the board.$d06qt$,
  $d06op$[{"id":"a","text":"Most"},{"id":"b","text":"Most of"},{"id":"c","text":"Most the"},{"id":"d","text":"Almost the"}]$d06op$::jsonb,
  'b',
  $d06ex$Boşluktan sonra "the committee members" gibi BELİRLİ bir grup geldiği için doğru cevap "Most of"tur. "Most the" kesinlikle yanlıştır çünkü "the" her zaman "of"tan sonra gelmelidir, "most" ile isim arasına doğrudan giremez; "Almost the" ise anlamca farklı bir yapı olup burada uygun değildir.$d06ex$,
  'most-most-of',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d07qt$When the flight was cancelled unexpectedly due to the storm, all passengers ------- wait at the terminal for nearly ten hours until a replacement plane arrived.$d07qt$,
  $d07op$[{"id":"a","text":"must"},{"id":"b","text":"had to"},{"id":"c","text":"have to"},{"id":"d","text":"should"}]$d07op$::jsonb,
  'b',
  $d07ex$Cümle geçmiş zamanda anlatıldığı ve zorunluluk dışarıdan gelen bir durumdan (uçağın iptali) kaynaklandığı için doğru cevap "had to"dur. "must" geçmiş zamanda KULLANILAMAZ, bu yüzden kesinlikle yanlıştır; "have to" zaman uyumsuzluğu nedeniyle, "should" ise zorunluluk değil tavsiye bildirdiğinden elenir.$d07ex$,
  'must-vs-have-to',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d08qt$Visitors to the laboratory ------- touch any of the chemical samples on display, as doing so could pose a serious safety risk to everyone present.$d08qt$,
  $d08op$[{"id":"a","text":"mustn't"},{"id":"b","text":"don't have to"},{"id":"c","text":"didn't have to"},{"id":"d","text":"shouldn't have"}]$d08op$::jsonb,
  'a',
  $d08ex$"could pose a serious safety risk" ifadesi bir eylemin KESİNLİKLE YASAK olduğunu gösterir, bu yüzden doğru cevap "mustn't"tür. "don't have to" yanlıştır çünkü GEREKSİZLİK anlamı taşır, yasaklama değil; "didn't have to" zaman uyumsuzluğu nedeniyle, "shouldn't have" ise geçmişte yapılmış bir hatayı eleştirdiğinden bu bağlama uymaz.$d08ex$,
  'must-vs-have-to',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d09qt$You ------- bring your own laptop to the training session; the organizers will provide one for every participant free of charge.$d09qt$,
  $d09op$[{"id":"a","text":"needn't"},{"id":"b","text":"mustn't"},{"id":"c","text":"shouldn't"},{"id":"d","text":"can't"}]$d09op$::jsonb,
  'a',
  $d09ex$"the organizers will provide one... free of charge" ifadesi bir eylemin yapılmasının GEREKMEDİĞİNİ ama istenirse yapılabileceğini gösterir, bu yüzden doğru cevap "needn't"tür. "mustn't" yanlıştır çünkü YASAK anlamı taşır, oysa burada yasaklama yoktur; "shouldn't" ve "can't" ise ne gereksizlik ne de izin/yasak ayrımını doğru şekilde karşılamaz.$d09ex$,
  'neednt-vs-mustnt',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d10qt$She ------- rushed to finish the quarterly report last night, since the deadline was postponed by a full week this morning.$d10qt$,
  $d10op$[{"id":"a","text":"needn't have"},{"id":"b","text":"mustn't have"},{"id":"c","text":"didn't need to"},{"id":"d","text":"shouldn't have"}]$d10op$::jsonb,
  'a',
  $d10ex$Geçmişte yapılan ama sonradan GEREKSİZ olduğu anlaşılan bir çabadan söz edildiği için doğru cevap "needn't have"tır (needn't have + V3). "mustn't have" anlamca uygun değildir çünkü bir şeyin yapılmamış OLMASI gerektiğine dair bir çıkarım bildirir; "didn't need to" biçimsel olarak "rushed" ile uyuşmaz; "shouldn't have" ise hata/pişmanlık ifade eder, oysa burada sadece gereksiz bir çaba söz konusudur.$d10ex$,
  'neednt-vs-mustnt',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d11qt$Despite the heavy traffic across the city, the express train from Ankara arrived ------- at the central station, exactly as scheduled.$d11qt$,
  $d11op$[{"id":"a","text":"on time"},{"id":"b","text":"in time"},{"id":"c","text":"in time for"},{"id":"d","text":"on the time"}]$d11op$::jsonb,
  'a',
  $d11ex$"exactly as scheduled" ifadesi planlanan TAM SAATİ vurguladığı için doğru cevap "on time"dır. "in time" ve "in time for" yanlıştır çünkü bunlar bir şeyi KAÇIRMAMAK/yetişmek anlamı taşır, burada ise sabit bir tarifeye uyma söz konusudur; "on the time" ise dilbilgisel olarak hatalı bir kalıptır.$d11ex$,
  'on-time-in-time',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d12qt$We left home nearly an hour earlier than usual so that we would arrive at the airport ------- to check in before the gates closed.$d12qt$,
  $d12op$[{"id":"a","text":"in time"},{"id":"b","text":"on time"},{"id":"c","text":"in good time of"},{"id":"d","text":"on times"}]$d12op$::jsonb,
  'a',
  $d12ex$"to check in before the gates closed" ifadesi bir şeyi KAÇIRMADAN yetişme anlamı taşıdığı için doğru cevap "in time"dır. "on time" yanlıştır çünkü sabit bir programa uymaktan değil, son ana yetişmekten bahsedilmektedir; diğer seçenekler ise dilbilgisel olarak geçersiz kalıplardır.$d12ex$,
  'on-time-in-time',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d13qt$I lost my old calculator on the way to school yesterday, so I need to buy a new ------- before the final exam next week.$d13qt$,
  $d13op$[{"id":"a","text":"one"},{"id":"b","text":"it"},{"id":"c","text":"ones"},{"id":"d","text":"the one"}]$d13op$::jsonb,
  'a',
  $d13ex$Burada kaybedilen AYNI nesne değil, aynı kategoriden YENİ bir nesneden söz edildiği için doğru cevap "one"dur ("calculator" sayılabilen tekil isim). "it" yanlıştır çünkü "it" nesnenin KENDİSİNİ, yani kaybedilen aynı hesap makinesini işaret eder; "ones" ise çoğul olduğu için tekil bağlamla uyuşmaz.$d13ex$,
  'one-ones-substitution',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d14qt$Among all the smartphones on display at the store, most customers seemed to prefer the cheaper ------- over the premium models with advanced cameras.$d14qt$,
  $d14op$[{"id":"a","text":"ones"},{"id":"b","text":"one"},{"id":"c","text":"them"},{"id":"d","text":"it"}]$d14op$::jsonb,
  'a',
  $d14ex$Daha önce geçen "smartphones" çoğul sayılabilen ismi tekrar etmemek için ve sıfatla ("cheaper") birlikte kullanıldığı için doğru cevap "ones"tur. "one" tekil olduğundan çoğul bağlamla uyuşmaz; "them" ve "it" ise nesnenin KENDİSİNİ işaret ettiğinden, farklı modelleri genel olarak belirten one/ones yapısının yerini tutamaz.$d14ex$,
  'one-ones-substitution',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d15qt$If the warning signs had been taken seriously by the plant's management, the factory explosion ------- entirely, according to the safety investigation report.$d15qt$,
  $d15op$[{"id":"a","text":"could have been avoided"},{"id":"b","text":"could have avoided been"},{"id":"c","text":"could be have avoided"},{"id":"d","text":"could been have avoided"}]$d15op$::jsonb,
  'a',
  $d15ex$Hem modal (could) hem perfect (have) hem de edilgen (been + V3) yapısı bir arada kullanıldığında sıralama her zaman MODAL + HAVE + BEEN + V3 şeklindedir, bu yüzden doğru cevap "could have been avoided"dır. Diğer seçeneklerin tümü bu sabit sırayı bozduğu için dilbilgisel olarak hatalıdır.$d15ex$,
  'passive-modals-perfect',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d16qt$Critics argue that the bridge's structural flaws ------- long before the collapse, given the numerous inspection reports that had already warned of visible cracks.$d16qt$,
  $d16op$[{"id":"a","text":"should have been identified"},{"id":"b","text":"should be have identified"},{"id":"c","text":"should have identified been"},{"id":"d","text":"should having been identified"}]$d16op$::jsonb,
  'a',
  $d16ex$Modal (should) + perfect (have) + edilgen (been + V3) birleştiğinde doğru sıralama MODAL + HAVE + BEEN + V3'tür, bu yüzden doğru cevap "should have been identified"dir. Diğer seçenekler "have", "been" ve V3'ün yerini değiştirerek bu kritik sırayı bozduğundan yanlıştır.$d16ex$,
  'passive-modals-perfect',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d17qt$The ancient fortress overlooking the harbor ------- by Byzantine engineers more than a thousand years ago, according to recently uncovered historical records.$d17qt$,
  $d17op$[{"id":"a","text":"was built"},{"id":"b","text":"built"},{"id":"c","text":"has built"},{"id":"d","text":"was building"}]$d17op$::jsonb,
  'a',
  $d17ex$Cümlede "by Byzantine engineers" ifadesiyle EYLEMİ YAPAN fail belirtildiği ve özne olan kale eylemi kendisi yapmadığı için edilgen çatı gerekir, bu yüzden doğru cevap "was built"tir. "built" aktif çatıda olduğundan özne eylemi kendisi yapmış gibi okunur ve hemen elenir; "has built" ve "was building" ise hem çatı hem anlam olarak bağlama uymaz.$d17ex$,
  'passive-present-past',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d18qt$The annual budget proposal ------- by the finance committee next Monday, before being submitted to the board of directors for final approval.$d18qt$,
  $d18op$[{"id":"a","text":"will be reviewed"},{"id":"b","text":"will review"},{"id":"c","text":"is reviewing"},{"id":"d","text":"will have review"}]$d18op$::jsonb,
  'a',
  $d18ex$"by the finance committee" ifadesi eylemi yapan faili belirttiği ve özne olan "proposal" eylemi kendisi gerçekleştiremeyeceği için edilgen çatı gerekir, bu yüzden doğru cevap "will be reviewed"dir. "will review" aktif çatıda olduğundan özneyle anlam çelişkisi yaratır; "is reviewing" ve "will have review" ise hem zaman hem yapı bakımından hatalıdır.$d18ex$,
  'passive-present-past',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d19qt$By the time the fire department finally arrived at the scene, the flames ------- most of the warehouse's roof structure.$d19qt$,
  $d19op$[{"id":"a","text":"had already destroyed"},{"id":"b","text":"already destroyed"},{"id":"c","text":"have already destroyed"},{"id":"d","text":"were already destroying"}]$d19op$::jsonb,
  'a',
  $d19ex$"By the time" ifadesi iki geçmiş eylemden birinin DİĞERİNDEN ÖNCE tamamlandığını gösterir; itfaiyenin gelişinden ÖNCE gerçekleşen eylem olduğu için doğru cevap "had already destroyed"tır (Past Perfect). "already destroyed" ve "have already destroyed" zaman uyumsuzluğu nedeniyle, "were already destroying" ise süreç vurgusu gerektirmediğinden yanlıştır.$d19ex$,
  'past-perfect',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d20qt$When auditors finally reviewed the company's accounts in detail, they discovered that the former treasurer ------- more than two million dollars over the previous five years.$d20qt$,
  $d20op$[{"id":"a","text":"had embezzled"},{"id":"b","text":"embezzled"},{"id":"c","text":"has embezzled"},{"id":"d","text":"was embezzling"}]$d20op$::jsonb,
  'a',
  $d20ex$Zimmete geçirme eylemi, denetçilerin bunu KEŞFETMESİNDEN (discovered - Past Simple) daha ÖNCE gerçekleştiği için doğru cevap "had embezzled"tır (Past Perfect). "embezzled" iki eylem arasındaki önce-sonra ilişkisini göstermediğinden, "has embezzled" ve "was embezzling" ise zaman ve görünüş uyumsuzluğu nedeniyle yanlıştır.$d20ex$,
  'past-perfect',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d21qt$The workers ------- the old bridge for nearly eight months when the regional government finally allocated additional funding to complete the project.$d21qt$,
  $d21op$[{"id":"a","text":"had been repairing"},{"id":"b","text":"had repaired"},{"id":"c","text":"repaired"},{"id":"d","text":"have been repairing"}]$d21op$::jsonb,
  'a',
  $d21ex$"for nearly eight months" ifadesi geçmişte belirli bir ANDAN ÖNCE başlayıp DEVAM ETMİŞ bir eylemin SÜRESİNİ vurguladığı için doğru cevap "had been repairing"dir (Past Perfect Continuous). "had repaired" sadece tamamlanmış sonucu vurgular, süreci değil; "repaired" ve "have been repairing" ise zaman uyumu bakımından cümledeki geçmiş çerçeveyle çelişir.$d21ex$,
  'past-perfect-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d22qt$She ------- French since her early twenties, so she had little difficulty understanding most of the conversation during her recent trip to Paris.$d22qt$,
  $d22op$[{"id":"a","text":"had been studying"},{"id":"b","text":"had studied"},{"id":"c","text":"studied"},{"id":"d","text":"has been studying"}]$d22op$::jsonb,
  'a',
  $d22ex$"since her early twenties" ifadesi, geçmişteki bir an (Paris gezisi) ÖNCESİNDE başlayıp devam eden bir sürecin SÜRESİNİ vurguladığı için doğru cevap "had been studying"dir. "had studied" yalnızca eylemin tamamlandığını belirtir, süreyi vurgulamaz; "studied" ve "has been studying" ise zaman uyumsuzluğu nedeniyle yanlıştır.$d22ex$,
  'past-perfect-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d23qt$While the technicians ------- the server system for scheduled maintenance, an unexpected power surge suddenly damaged several critical components.$d23qt$,
  $d23op$[{"id":"a","text":"were upgrading"},{"id":"b","text":"upgraded"},{"id":"c","text":"had upgraded"},{"id":"d","text":"upgrade"}]$d23op$::jsonb,
  'a',
  $d23ex$"while" kelimesi arka planda DEVAM EDEN bir eylemi işaret eder ve bu eylemi "suddenly" ile ANİDEN KESEN başka bir eylem (damaged) cümlede bulunur, bu yüzden doğru cevap "were upgrading"dir (Past Continuous). "upgraded" ve "had upgraded" süreç değil tamamlanmış/önceki eylem bildirdiğinden, "upgrade" ise zaman uyumsuzluğu nedeniyle yanlıştır.$d23ex$,
  'past-simple-vs-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d24qt$The manager reviewed the quarterly report, signed the necessary documents, and then ------- the meeting room to prepare for the board presentation.$d24qt$,
  $d24op$[{"id":"a","text":"left"},{"id":"b","text":"was leaving"},{"id":"c","text":"had been leaving"},{"id":"d","text":"leaves"}]$d24op$::jsonb,
  'a',
  $d24ex$Cümlede eylemler birbiri BİTTİKTEN SONRA sırayla gerçekleştiği (reviewed, signed, then left) için her üçü de Past Simple alır, bu yüzden doğru cevap "left"tir. "was leaving" yanlıştır çünkü past continuous arka planda süren bir eylemi gerektirir, oysa burada sıralı tamamlanmış eylemler vardır; "had been leaving" ve "leaves" ise zaman çerçevesine hiç uymaz.$d24ex$,
  'past-simple-vs-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $d25qt$After three unsuccessful attempts to pass the certification exam, he finally decided to ------- and pursue a completely different career path instead.$d25qt$,
  $d25op$[{"id":"a","text":"give up"},{"id":"b","text":"give in"},{"id":"c","text":"give away"},{"id":"d","text":"give out"}]$d25op$::jsonb,
  'a',
  $d25ex$Bağlamdaki sonuç "farklı bir kariyer yoluna yönelme" olduğu için buradaki phrasal verb "vazgeçmek" anlamına gelen "give up" olmalıdır; kelime kelime çeviri yerine SONUCA bakılmalıdır. "give in" (teslim olmak/boyun eğmek), "give away" (ifşa etmek/bağışlamak) ve "give out" (dağıtmak/tükenmek) aynı fiilin farklı parçacıklarla TAMAMEN farklı anlamlara geldiğini gösterir ve bu bağlama uymaz.$d25ex$,
  'phrasal-verbs',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $d26qt$Due to severe and unexpected budget cuts, the city council had no choice but to ------- construction of the new public library until further notice.$d26qt$,
  $d26op$[{"id":"a","text":"put off"},{"id":"b","text":"put up"},{"id":"c","text":"put down"},{"id":"d","text":"put across"}]$d26op$::jsonb,
  'a',
  $d26ex$Cümledeki sonuç "inşaatın ertelenmesi" olduğu için bu phrasal verb'ün tek kelimelik eş anlamlısı "postpone" yani "put off"tur. "put up" (asmak/katlanmak), "put down" (yere koymak/bastırmak) ve "put across" (bir fikri anlatmak/iletmek) aynı fiilin farklı parçacıklarla bağlamla ilgisiz anlamlar taşıdığını gösterir, bu yüzden hepsi elenir.$d26ex$,
  'phrasal-verbs',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e01qt$Although she was new to the department, the manager encouraged her to ------- the discussion during the weekly planning meeting and share her ideas confidently.$e01qt$,
  $e01op$[{"id":"a","text":"join in"},{"id":"b","text":"check in"},{"id":"c","text":"hand out"},{"id":"d","text":"run out"}]$e01op$::jsonb,
  'a',
  $e01ex$"join in" doğru cevaptır çünkü "in" parçacığı burada bir tartışmaya KATILMA/DAHİL OLMA anlamı taşır. "check in" yanlıştır çünkü bu fiil genellikle bir otele veya uçuşa giriş yapma bağlamında kullanılır, bir tartışmaya katılmayı anlatmaz. "hand out" ve "run out" ise "out" parçacığı taşıdığı için sırasıyla DAĞITMA ve TÜKENME anlamı verir, cümledeki katılma yönüyle ters düşer.$e01ex$,
  'phrasal-verbs-in-out',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e02qt$Due to unexpected budget cuts, the company had to ------- of the funds reserved for employee training long before the fiscal year ended.$e02qt$,
  $e02op$[{"id":"a","text":"run out"},{"id":"b","text":"hand in"},{"id":"c","text":"fit in"},{"id":"d","text":"join in"}]$e02op$::jsonb,
  'a',
  $e02ex$"run out of" doğru cevaptır çünkü "out" parçacığı burada bir kaynağın TÜKENMESİ anlamını taşır ve "long before the fiscal year ended" ifadesi bu tükenmeyi destekler. "hand in", "fit in" ve "join in" ise "in" parçacığı taşıdığı için sırasıyla TESLİM ETME, UYUM SAĞLAMA ve KATILMA anlamı verir, tükenme anlamıyla yönü ters olduğu için buraya uymaz.$e02ex$,
  'phrasal-verbs-in-out',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e03qt$Despite strong objections from environmental groups, the local authorities decided to ------- with the highway expansion project regardless of the opposition.$e03qt$,
  $e03op$[{"id":"a","text":"go on"},{"id":"b","text":"call off"},{"id":"c","text":"turn off"},{"id":"d","text":"take off"}]$e03op$::jsonb,
  'a',
  $e03ex$"go on" doğru cevaptır çünkü "on" parçacığı burada bir eylemin DEVAM ETMESİ anlamını taşır ve "regardless of the opposition" ifadesi bu devamlılığı destekler. "call off" yanlıştır çünkü "off" parçacığı İPTAL ETME anlamı taşır ve cümlenin anlamıyla tam tersidir; "turn off" ve "take off" ise sırasıyla bir cihazı kapatma ve çıkarma/kalkış anlamı taşıdığı için bağlama uymaz.$e03ex$,
  'phrasal-verbs-on-off',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e04qt$Organizers were forced to ------- the outdoor music festival at the last minute when meteorologists issued a severe storm warning for the entire coastal region.$e04qt$,
  $e04op$[{"id":"a","text":"call off"},{"id":"b","text":"carry on"},{"id":"c","text":"put on"},{"id":"d","text":"turn on"}]$e04op$::jsonb,
  'a',
  $e04ex$"call off" doğru cevaptır çünkü "off" parçacığı burada bir etkinliğin İPTAL EDİLMESİ anlamını taşır ve "severe storm warning" bu olumsuz sonucu açıklar. "carry on" yanlıştır çünkü "on" parçacığı DEVAM ETME anlamı taşır ve iptal durumuyla çelişir; "put on" ve "turn on" ise giyinme ve bir cihazı açma anlamları taşıdığı için bağlamla ilgisizdir.$e04ex$,
  'phrasal-verbs-on-off',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e05qt$After missing three consecutive job interviews without any explanation, the candidate finally ------- at the recruitment office looking embarrassed and apologetic.$e05qt$,
  $e05op$[{"id":"a","text":"showed up"},{"id":"b","text":"broke down"},{"id":"c","text":"let down"},{"id":"d","text":"slowed down"}]$e05op$::jsonb,
  'a',
  $e05ex$"showed up" doğru cevaptır çünkü "up" parçacığı burada bir kişinin ORTAYA ÇIKMASI/gelmesi anlamını taşır. "broke down" yanlıştır çünkü bu ifade genellikle bir cihazın arızalanması ya da bir kişinin duygusal çöküşü için kullanılır, buradaki bağlama uymaz; "let down" (hayal kırıklığına uğratmak) ve "slowed down" (yavaşlamak) de anlamca cümleyle örtüşmez.$e05ex$,
  'phrasal-verbs-up-down',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e06qt$After months of tense negotiations, the merger talks between the two rival companies finally ------- when neither side was willing to compromise on the terms.$e06qt$,
  $e06op$[{"id":"a","text":"broke down"},{"id":"b","text":"broke up"},{"id":"c","text":"gave up"},{"id":"d","text":"picked up"}]$e06op$::jsonb,
  'a',
  $e06ex$"broke down" doğru cevaptır çünkü özne "merger talks" yani RESMİ BİR GÖRÜŞME olduğundan çökme/sonuçsuz kalma anlamı için "break down" kullanılır. "broke up" yanlıştır çünkü bu ifade genellikle bir İLİŞKİNİN ya da GRUBUN dağılması için kullanılır, resmi görüşmeler için uygun değildir; "gave up" (vazgeçmek) ve "picked up" (toparlanmak) ise cümlenin anlamıyla uyuşmaz.$e06ex$,
  'phrasal-verbs-up-down',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e07qt$Nearly every student in the lecture hall was impressed by ------- ability to explain such a complex theory in such simple, accessible terms.$e07qt$,
  $e07op$[{"id":"a","text":"the professor's"},{"id":"b","text":"the professor of"},{"id":"c","text":"of the professor"},{"id":"d","text":"professor of"}]$e07op$::jsonb,
  'a',
  $e07ex$Sahip olan varlık "the professor" yani İNSAN olduğu için iyelik 's tercih edilir ve doğru cevap "the professor's"tır. "of the professor" ve "the professor of" gibi yapılar yanlıştır çünkü "of" yapısında sahip olunan isim ÖNCE, sahip olan isim SONRA gelmelidir ("the ability of the professor"), bu sıralama boşluğun konumuna uymamaktadır.$e07ex$,
  'possessive-s-vs-of',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e08qt$Since my brother and sister-in-law run the family bakery together, ------- business plan for next year focuses on opening a second branch downtown.$e08qt$,
  $e08op$[{"id":"a","text":"my brother and sister-in-law's"},{"id":"b","text":"my brother's and sister-in-law's"},{"id":"c","text":"my brother's and sister-in-law"},{"id":"d","text":"brother and sister-in-law's"}]$e08op$::jsonb,
  'a',
  $e08ex$Burada tek bir ORTAK iş planından söz edildiği için ("the family bakery together") iki isim art arda geldiğinde sona SADECE BİR 's eklenir: "my brother and sister-in-law's business plan". "my brother's and sister-in-law's" yanlıştır çünkü bu yapı AYRI AYRI iki plan olduğunu ima eder, oysa cümlede ortak bir plandan bahsedilmektedir.$e08ex$,
  'possessive-s-vs-of',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e09qt$Panicked by the sudden fire alarm, the employees rushed ------- the stairwell instead of waiting anxiously for the crowded elevator.$e09qt$,
  $e09op$[{"id":"a","text":"into"},{"id":"b","text":"onto"},{"id":"c","text":"across"},{"id":"d","text":"through"}]$e09op$::jsonb,
  'a',
  $e09ex$"into" doğru cevaptır çünkü burada kapalı bir alanın İÇİNE giriş eylemi anlatılmaktadır. "onto" yanlıştır çünkü bu edat düz bir YÜZEYİN ÜSTÜNE çıkışı ifade eder, merdiven boşluğuna giriş için uygun değildir; "across" ve "through" ise sırasıyla bir alanı karşıdan karşıya geçme ve bir şeyin içinden geçme anlamı taşıdığı için buradaki basit giriş eylemini karşılamaz.$e09ex$,
  'prepositions-of-movement',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e10qt$The lifeguard watched anxiously as the exhausted swimmer struggled to make his way ------- the choppy river in order to reach the opposite bank.$e10qt$,
  $e10op$[{"id":"a","text":"across"},{"id":"b","text":"into"},{"id":"c","text":"onto"},{"id":"d","text":"through"}]$e10op$::jsonb,
  'a',
  $e10ex$"across" doğru cevaptır çünkü burada bir yüzeyin (nehrin) BİR KIYISINDAN DİĞERİNE geçiş eylemi anlatılmaktadır. "into" yanlıştır çünkü bu edat kapalı bir alanın içine girişi ifade eder, nehri karşıdan karşıya geçmeyi anlatmaz; "onto" ve "through" da sırasıyla bir yüzeye çıkma ve bir şeyin içinden geçme anlamı taşıdığı için bağlama uymaz.$e10ex$,
  'prepositions-of-movement',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e11qt$The two old friends agreed to meet ------- the entrance of the museum before joining the guided tour scheduled for ten o'clock.$e11qt$,
  $e11op$[{"id":"a","text":"at"},{"id":"b","text":"on"},{"id":"c","text":"in"},{"id":"d","text":"to"}]$e11op$::jsonb,
  'a',
  $e11ex$"at" doğru cevaptır çünkü "the entrance" burada bir NOKTA/konum olarak düşünülmektedir. "on" yanlıştır çünkü bu edat bir YÜZEY için kullanılır; "in" bir HACİM/kapalı alan belirtir ki giriş noktası bir hacim değildir; "to" ise sadece genel bir yönelimi belirtir, buluşma noktasını tam olarak ifade etmez.$e11ex$,
  'prepositions-place',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e12qt$Because the fire drill was still in progress, all visitors were asked to wait ------- the school building until it was officially declared safe to enter.$e12qt$,
  $e12op$[{"id":"a","text":"in"},{"id":"b","text":"at"},{"id":"c","text":"on"},{"id":"d","text":"to"}]$e12op$::jsonb,
  'a',
  $e12ex$"in" doğru cevaptır çünkü burada "the school building" fiziksel bir HACİM/kapalı alan olarak kastedilmektedir ve "until it was officially declared safe to enter" ifadesi binanın fiziksel içini işaret eder. "at school" kullanılsaydı eğitim faaliyetini genel olarak ifade ederdi; "on" bir yüzeyi, "to" ise sadece bir yönelimi belirttiği için buraya uymaz.$e12ex$,
  'prepositions-place',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e13qt$The historic peace agreement between the two neighboring nations was officially signed ------- the fifteenth of November, drawing widespread international media attention.$e13qt$,
  $e13op$[{"id":"a","text":"on"},{"id":"b","text":"in"},{"id":"c","text":"at"},{"id":"d","text":"by"}]$e13op$::jsonb,
  'a',
  $e13ex$"on" doğru cevaptır çünkü belirli bir TARİH söz konusu olduğunda "on" kullanılır. "in" yanlıştır çünkü bu edat daha UZUN DÖNEMLER (ay, yıl, mevsim) için kullanılır; "at" NOKTASAL anlar için, "by" ise bir son tarihi/sınırı belirttiği için burada anlamca uygun değildir.$e13ex$,
  'prepositions-time',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e14qt$Industrial production across the region expanded rapidly ------- the nineteenth century, gradually transforming small farming towns into major manufacturing centers.$e14qt$,
  $e14op$[{"id":"a","text":"in"},{"id":"b","text":"on"},{"id":"c","text":"at"},{"id":"d","text":"since"}]$e14op$::jsonb,
  'a',
  $e14ex$"in" doğru cevaptır çünkü "the nineteenth century" bir YÜZYIL, yani uzun bir dönem belirtir. "on" yanlıştır çünkü bu edat belirli GÜN ve tarihlerle kullanılır; "at" NOKTASAL anlar için kullanılır; "since" ise bir başlangıç noktasını belirten farklı bir zaman ifadesi kategorisine ait olduğu için burada uygun değildir.$e14ex$,
  'prepositions-time',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e15qt$Her hands are covered in paint and there are brushes scattered all over the floor — she ------- (paint) the mural in the hallway since early this morning.$e15qt$,
  $e15op$[{"id":"a","text":"has been painting"},{"id":"b","text":"has painted"},{"id":"c","text":"paints"},{"id":"d","text":"is painting"}]$e15op$::jsonb,
  'a',
  $e15ex$"has been painting" doğru cevaptır çünkü "since early this morning" ifadesi SÜREKLİLİĞİ vurgular ve görünür kanıtlar (boya lekeleri, saçılmış fırçalar) eylemin HÂLÂ etkisinin sürdüğünü gösterir. "has painted" yanlıştır çünkü bu yapı eylemin TAMAMLANDIĞINI ve sonucunu vurgular, oysa burada süreç devam etmektedir; "paints" ve "is painting" ise "since" ile birlikte kullanılamaz.$e15ex$,
  'present-perfect-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e16qt$The negotiators look utterly exhausted and the meeting room is littered with empty coffee cups — they ------- (negotiate) the trade deal for over ten hours without a single break.$e16qt$,
  $e16op$[{"id":"a","text":"have been negotiating"},{"id":"b","text":"have negotiated"},{"id":"c","text":"negotiate"},{"id":"d","text":"are negotiating"}]$e16op$::jsonb,
  'a',
  $e16ex$"have been negotiating" doğru cevaptır çünkü "for over ten hours" süre belirteci ve görünür yorgunluk KANITI eylemin SÜREKLİLİĞİNİ gösterir. "have negotiated" yanlıştır çünkü bu yapı tamamlanmış bir sonucu/sayıyı vurgular, burada ise sadece ne kadar sürdüğü önemlidir; "negotiate" ve "are negotiating" ise geçmişten bugüne uzanan süreyi ifade edemez.$e16ex$,
  'present-perfect-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e17qt$The quality control department ------- (inspect) over two hundred units since the start of the month to ensure they meet the new safety regulations.$e17qt$,
  $e17op$[{"id":"a","text":"has inspected"},{"id":"b","text":"has been inspecting"},{"id":"c","text":"inspects"},{"id":"d","text":"is inspecting"}]$e17op$::jsonb,
  'a',
  $e17ex$"has inspected" doğru cevaptır çünkü cümlede bir SAYI ("over two hundred units") vurgulanmaktadır ve present perfect simple tamamlanmış sonucu/miktarı anlatır. "has been inspecting" yanlıştır çünkü bu yapı SÜREYİ vurgular, kaç tane tamamlandığını değil; "inspects" ve "is inspecting" ise "since" ile uyumlu değildir.$e17ex$,
  'present-perfect-simple-vs-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e18qt$Even though she ------- (know) the family for over twenty years, she was still surprised by how drastically their circumstances had changed.$e18qt$,
  $e18op$[{"id":"a","text":"has known"},{"id":"b","text":"has been knowing"},{"id":"c","text":"knows"},{"id":"d","text":"is knowing"}]$e18op$::jsonb,
  'a',
  $e18ex$"has known" doğru cevaptır çünkü "know" bir DURUM FİİLİDİR ve "for over twenty years" ile birlikte present perfect simple kullanılır; durum fiilleri asla continuous formda kullanılmaz. "has been knowing" bu yüzden yanlıştır; "knows" ve "is knowing" ise "for" ile başlayan süre ifadesiyle bağlantıyı kuramaz.$e18ex$,
  'present-perfect-simple-vs-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e19qt$The committee ------- (announce) the results of the essay competition three days ago, yet many participants still have not checked the official website.$e19qt$,
  $e19op$[{"id":"a","text":"announced"},{"id":"b","text":"has announced"},{"id":"c","text":"have announced"},{"id":"d","text":"has been announcing"}]$e19op$::jsonb,
  'a',
  $e19ex$"announced" doğru cevaptır çünkü "three days ago" KESİN bir geçmiş zaman belirtecidir ve bu tür belirteçlerle her zaman past simple kullanılır. "has announced" ve "have announced" yanlıştır çünkü present perfect, "ago" gibi kesin geçmiş zaman belirteçleriyle asla kullanılmaz; "has been announcing" ise anlamca da bağlama uymamaktadır.$e19ex$,
  'present-perfect-vs-past-simple',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e20qt$Relations between the two rival companies ------- (improve) significantly since the new CEO took charge of the merger process last January.$e20qt$,
  $e20op$[{"id":"a","text":"have improved"},{"id":"b","text":"improved"},{"id":"c","text":"had improved"},{"id":"d","text":"will improve"}]$e20op$::jsonb,
  'a',
  $e20ex$"have improved" doğru cevaptır çünkü "since + başlangıç noktası" (since last January) geçmişte başlayıp şimdiye bağlanan bir durumu işaret eder ve present perfect gerektirir. "improved" yanlıştır çünkü past simple belirli bir geçmiş zaman diliminde kalmış, şimdiyle bağlantısı olmayan eylemler için kullanılır; "had improved" daha önceki bir geçmiş noktası gerektirir, "will improve" ise gelecek zaman anlamı taşıdığı için uygun değildir.$e20ex$,
  'present-perfect-vs-past-simple',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e21qt$Residents of this low-lying coastal town ------- (experience) frequent flooding every winter because of rising sea levels and the outdated drainage system.$e21qt$,
  $e21op$[{"id":"a","text":"experience"},{"id":"b","text":"are experiencing"},{"id":"c","text":"experienced"},{"id":"d","text":"have experienced"}]$e21op$::jsonb,
  'a',
  $e21ex$"experience" doğru cevaptır çünkü "every winter" ifadesi DÜZENLİ TEKRARLANAN bir durumu işaret eder ve present simple gerektirir. "are experiencing" yanlıştır çünkü present continuous yalnızca konuşma anında veya geçici bir dönemde süren eylemler için kullanılır, bir alışkanlığı anlatmaz; "experienced" ve "have experienced" ise zaman uyumu açısından "every winter" ile örtüşmez.$e21ex$,
  'present-simple-vs-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e22qt$She ------- (believe) that the new workplace policy will significantly benefit small business owners, even though she rarely discusses it in public.$e22qt$,
  $e22op$[{"id":"a","text":"believes"},{"id":"b","text":"is believing"},{"id":"c","text":"has been believing"},{"id":"d","text":"was believing"}]$e22op$::jsonb,
  'a',
  $e22ex$"believe" bir DURUM/DÜŞÜNCE fiili olduğu için -ing almaz ve her zaman present simple ile kullanılır; bu yüzden doğru cevap "believes"tir. "is believing", "has been believing" ve "was believing" gibi continuous formların tamamı yanlıştır çünkü durum fiilleri sürekli olsalar bile asla -ing formunda kullanılmaz.$e22ex$,
  'present-simple-vs-continuous',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e23qt$The flight to Istanbul was delayed for nearly four hours ------- the severe thunderstorm that struck the region late in the evening.$e23qt$,
  $e23op$[{"id":"a","text":"because of"},{"id":"b","text":"because"},{"id":"c","text":"so that"},{"id":"d","text":"in order to"}]$e23op$::jsonb,
  'a',
  $e23ex$"because of" doğru cevaptır çünkü boşluktan sonra bir İSİM ÖBEĞİ ("the severe thunderstorm") gelmektedir ve bu yapı because of ile kullanılır. "because" yanlıştır çünkü ondan sonra ÖZNE+YÜKLEM içeren tam bir cümlecik gelmelidir; "so that" ve "in order to" ise sebep değil AMAÇ bildirdiği için cümlenin anlamına uymaz.$e23ex$,
  'purpose-reason-connectors',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e24qt$The engineers reinforced the century-old bridge with steel cables ------- it could safely support the increased weight of modern traffic.$e24qt$,
  $e24op$[{"id":"a","text":"so that"},{"id":"b","text":"in order to"},{"id":"c","text":"because"},{"id":"d","text":"so"}]$e24op$::jsonb,
  'a',
  $e24ex$"so that" doğru cevaptır çünkü bir AMAÇ bildirilmektedir ve ardından ÖZNE+could yapısı ("it could support") gelmektedir. "in order to" yanlıştır çünkü ondan sonra fiilin yalın hâli gelmelidir, özne+could gelemez; "because" sebep bildirdiği için amaç anlamıyla uyuşmaz, "so" ise resmi yazı dilinde bu yapı yerine tercih edilmez.$e24ex$,
  'purpose-reason-connectors',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $e25qt$Despite ------- evidence presented by the prosecution during the trial, the jury ultimately remained unconvinced of the defendant's guilt.$e25qt$,
  $e25op$[{"id":"a","text":"much"},{"id":"b","text":"many"},{"id":"c","text":"few"},{"id":"d","text":"a few"}]$e25op$::jsonb,
  'a',
  $e25ex$"much" doğru cevaptır çünkü "evidence" sayılamayan bir isimdir ve sayılamayan isimlerle "much" kullanılır. "many" yanlıştır çünkü sayılabilir çoğul isimlerle kullanılır; "few" ve "a few" de sayılabilir isimlerle kullanıldığı için "evidence" ile birlikte gramer olarak uygun değildir.$e25ex$,
  'quantifiers-much-many-few-little',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $e26qt$Although the professor warned that ------- students actually manage to complete the entire reading list before the final exam, she still assigned it every semester.$e26qt$,
  $e26op$[{"id":"a","text":"few"},{"id":"b","text":"a few"},{"id":"c","text":"little"},{"id":"d","text":"much"}]$e26op$::jsonb,
  'a',
  $e26ex$"few" doğru cevaptır çünkü burada OLUMSUZ bir anlam ("neredeyse hiç kimse tamamlayamıyor") vurgulanmaktadır ve "students" sayılabilir çoğul bir isimdir. "a few" yanlıştır çünkü OLUMLU bir anlam taşır ("birkaç tane var, yeterli"), cümledeki uyarı tonuyla çelişir; "little" ve "much" ise sayılamayan isimlerle kullanıldığı için "students" ile uyuşmaz.$e26ex$,
  'quantifiers-much-many-few-little',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f01qt$The new environmental regulations have already taken effect in most member states, ------- ?$f01qt$,
  $f01op$[{"id":"a","text":"haven't they"},{"id":"b","text":"have they"},{"id":"c","text":"didn't they"},{"id":"d","text":"don't they"}]$f01op$::jsonb,
  'a',
  $f01ex$Ana cümle olumlu ve yardımcı fiil "have" olduğu için etiket zıtlık kuralı gereği olumsuz ve aynı yardımcı fiille kurulmalıdır, bu yüzden doğru cevap "haven't they"dir. "have they" yanlıştır çünkü olumlu-olumlu eşleşme zıtlık kuralını bozar; "didn't they" ve "don't they" ise ana cümledeki "have" yerine do/does/did kullandığı için yardımcı fiil eşleşmesini bozar.$f01ex$,
  'question-tags',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f02qt$There aren't enough qualified translators available for the international summit next week, ------- ?$f02qt$,
  $f02op$[{"id":"a","text":"are there"},{"id":"b","text":"aren't there"},{"id":"c","text":"is there"},{"id":"d","text":"isn't there"}]$f02op$::jsonb,
  'a',
  $f02ex$Ana cümle olumsuz ("aren't") olduğu için zıtlık kuralı gereği etiket olumlu olmalı, ayrıca "there is/are" yapısında özne yerine "there" tekrar edildiği için doğru cevap "are there"dir. "aren't there" yanlıştır çünkü olumsuz-olumsuz eşleşmesi zıtlık kuralını ihlal eder; "is there/isn't there" ise çoğul "aren't" yerine tekil "is" kullandığı için yardımcı fiil uyuşmazlığı yaratır.$f02ex$,
  'question-tags',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f03qt$I have no idea ------- the flight to Istanbul was delayed for nearly six hours yesterday evening.$f03qt$,
  $f03op$[{"id":"a","text":"why was the flight"},{"id":"b","text":"why the flight was"},{"id":"c","text":"why did the flight"},{"id":"d","text":"why the flight did"}]$f03op$::jsonb,
  'b',
  $f03ex$"I have no idea" bir dolaylı/gömülü soru başlattığı için cümlecik düz cümle sırasına (özne + yüklem) döner, bu yüzden doğru cevap "why the flight was"tır. "why was the flight" yanlıştır çünkü doğrudan soru sırasını korur; "why did the flight" yanlıştır çünkü gömülü soruda do-support tamamen düşer; "why the flight did" ise anlamsız bir sıralama hatasıdır.$f03ex$,
  'question-word-order',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f04qt$I still wonder ------- such a minor technical glitch during the live broadcast that was watched by millions.$f04qt$,
  $f04op$[{"id":"a","text":"why did the network ignore"},{"id":"b","text":"why the network ignored"},{"id":"c","text":"why ignored the network"},{"id":"d","text":"why the network did ignore"}]$f04op$::jsonb,
  'b',
  $f04ex$"I wonder" ifadesinden sonra gelen gömülü soruda kelime sırası özne+yüklem olmalı ve do/does/did tamamen düşmelidir, bu yüzden doğru cevap "why the network ignored"dır. "why did the network ignore" yanlıştır çünkü gereksiz biçimde do-support korunmuş; "why ignored the network" ters çevrilmiş bir yapı olduğu için yanlıştır; "why the network did ignore" ise gereksiz vurgulu "did" eklediği için doğal yapıyı bozar.$f04ex$,
  'question-word-order',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f05qt$Given the number of eyewitnesses who identified the suspect at the scene, the prosecutor seemed ------- certain that the jury would return a guilty verdict.$f05qt$,
  $f05op$[{"id":"a","text":"fairly"},{"id":"b","text":"rather"},{"id":"c","text":"very"},{"id":"d","text":"quite"}]$f05op$::jsonb,
  'd',
  $f05ex$"certain" burada mutlak/derecelenemeyen bir sıfat gibi kullanıldığından "quite" "tamamen" anlamına gelir ve doğru cevap budur. "fairly" ve "rather" sadece derecelenebilen sıfatlarla orta/yüksek yoğunluk belirttiği için mutlak bir kesinlik ifadesiyle uyuşmaz; "very" ise bu bağlamda beklenen "tamamen emin" vurgusunu "quite" kadar net vermez.$f05ex$,
  'quite-rather-fairly',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f06qt$Despite the tight schedule, the new interns adapted to the hospital's procedures ------- quickly, impressing even the senior staff.$f06qt$,
  $f06op$[{"id":"a","text":"quite"},{"id":"b","text":"utterly"},{"id":"c","text":"absolutely"},{"id":"d","text":"totally"}]$f06op$::jsonb,
  'a',
  $f06ex$"quickly" derecelenebilen bir zarf olduğu için "oldukça" anlamında "quite" ile kullanılır ve doğru cevap budur. "utterly", "absolutely" ve "totally" ise mutlak/derecelenemeyen sıfat ve zarflarla kullanılan "tamamen" anlamlı güçlendiricilerdir, derecelenebilen "quickly" ile doğal bir eşleşme oluşturmazlar.$f06ex$,
  'quite-rather-fairly',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f07qt$After losing his balance on the icy pavement outside the station, the elderly man accidentally hurt ------- quite badly.$f07qt$,
  $f07op$[{"id":"a","text":"him"},{"id":"b","text":"himself"},{"id":"c","text":"he"},{"id":"d","text":"his own"}]$f07op$::jsonb,
  'b',
  $f07ex$Cümlede düşen ve yaralanan kişi aynı kişi (yaşlı adam) olduğu için özne=nesne testi dönüşlü zamir gerektirir, doğru cevap "himself"tir. "him" yanlıştır çünkü başka birini yaraladığı anlamına gelir; "he" özne konumunda kullanılamaz; "his own" sahiplik bildirir, bu bağlamda anlamsızdır.$f07ex$,
  'reflexive-pronouns',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f08qt$Rather than delegating the task to a deputy, the ambassador insisted on signing the historic agreement ------- in front of the international press.$f08qt$,
  $f08op$[{"id":"a","text":"himself"},{"id":"b","text":"him"},{"id":"c","text":"his self"},{"id":"d","text":"itself"}]$f08op$::jsonb,
  'a',
  $f08ex$Burada dönüşlü zamir "bizzat, kendisi" anlamında vurgu amacıyla kullanılmıştır, bu yapıda zamir gramatik olarak zorunlu değildir ama "kendisi yaptı" vurgusunu verir, doğru cevap "himself"tir. "him" nesne zamiridir ve vurgu işlevi taşımaz; "his self" İngilizcede var olmayan hatalı bir biçimdir; "itself" cansız varlıklar için kullanılır, büyükelçi için uygun değildir.$f08ex$,
  'reflexive-pronouns',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f09qt$The engineer ------- designed the suspension bridge was awarded a national prize for innovation in structural safety.$f09qt$,
  $f09op$[{"id":"a","text":"which"},{"id":"b","text":"whom"},{"id":"c","text":"who"},{"id":"d","text":"whose"}]$f09op$::jsonb,
  'c',
  $f09ex$Boşluktan önceki isim "the engineer" bir insan olduğu ve boşluktan hemen sonra yüklem ("designed") geldiği için zamir özne konumundadır, doğru cevap "who"dur. "which" insan için kullanılmaz; "whom" nesne konumu içindir, burada özne gerekir; "whose" ardından bir isim gelmesini gerektirir, burada doğrudan fiil gelmektedir.$f09ex$,
  'relative-clauses-defining',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f10qt$The theory ------- the professor based his entire argument has recently been challenged by new data from independent laboratories.$f10qt$,
  $f10op$[{"id":"a","text":"on which"},{"id":"b","text":"that"},{"id":"c","text":"which"},{"id":"d","text":"on that"}]$f10op$::jsonb,
  'a',
  $f10ex$"based ... on" fiil kalıbındaki edat ilgi zamiriyle birlikte cümle başına taşındığı için doğru cevap "on which"tir. "that" yanlıştır çünkü edattan sonra asla "that" kullanılamaz; sadece "which" yanlıştır çünkü edat olmadan cümle "based his entire argument" eksik kalır; "on that" ise aynı nedenle, edatla birlikte "that" hiçbir zaman kullanılamadığı için yanlıştır.$f10ex$,
  'relative-clauses-defining',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f11qt$The central bank unexpectedly lowered interest rates last month, ------- caught many economists completely off guard.$f11qt$,
  $f11op$[{"id":"a","text":"that"},{"id":"b","text":"which"},{"id":"c","text":"who"},{"id":"d","text":"what"}]$f11op$::jsonb,
  'b',
  $f11ex$Virgülden sonra gelen bu zamir, önceki isim yerine bir önceki cümlenin TAMAMINI nitelediği için doğru cevap "which"tir. "that" yanlıştır çünkü virgülden sonra asla "that" kullanılamaz; "who" insan için kullanılır, burada bir olay nitelenmektedir; "what" ilgi zamiri olarak böyle bir yapıda kullanılmaz.$f11ex$,
  'relative-clauses-non-defining',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f12qt$The newly renovated library, ------- houses over two million rare manuscripts, attracts researchers from all over the world.$f12qt$,
  $f12op$[{"id":"a","text":"that"},{"id":"b","text":"which"},{"id":"c","text":"who"},{"id":"d","text":"it"}]$f12op$::jsonb,
  'b',
  $f12ex$Boşluktan önce virgül bulunduğu için cümlecik non-defining'dir ve bu durumda "that" kesinlikle kullanılamaz, doğru cevap "which"tir. "that" bu yüzden yanlıştır; "who" insan dışı bir varlık (kütüphane) için kullanılamaz; "it" kişi zamiridir, ilgi zamiri yerine geçemez ve zamir non-defining clause'da asla atılamaz.$f12ex$,
  'relative-clauses-non-defining',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f13qt$Many of the strategies ------- in the pilot study failed completely when applied to a much larger population.$f13qt$,
  $f13op$[{"id":"a","text":"that proved effective"},{"id":"b","text":"proved effective"},{"id":"c","text":"which they proved effective"},{"id":"d","text":"did prove effective"}]$f13op$::jsonb,
  'a',
  $f13ex$Zamir burada özne konumundadır (ardından doğrudan "proved" yüklemi gelir), bu yüzden atılamaz ve doğru cevap "that proved effective"tir. "proved effective" yanlıştır çünkü özne konumundaki zamir atılınca cümlenin asıl öznesi belirsizleşir; "which they proved effective" fazladan özne ("they") eklediği için hatalıdır; "did prove effective" gömülü yapıda gereksiz vurgulu yardımcı fiil kullanır.$f13ex$,
  'relative-clauses-omission',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f14qt$The recommendations ------- before the final exam turned out to be extremely helpful for most of the students.$f14qt$,
  $f14op$[{"id":"a","text":"our supervisor gave us"},{"id":"b","text":"which gave our supervisor"},{"id":"c","text":"our supervisor gave them"},{"id":"d","text":"did our supervisor give"}]$f14op$::jsonb,
  'a',
  $f14ex$Zamir burada nesne konumundadır (önce özne+yüklem "our supervisor gave" gelir) ve cümlecik defining olduğu için zamir atılabilir, doğru cevap "our supervisor gave us"tur. "which gave our supervisor" özne-nesne sırasını tersine çevirdiği için yanlıştır; "our supervisor gave them" gereksiz bir tekrar nesne zamiri ekler; "did our supervisor give" gömülü yapıda gereksiz devrik/do-support yapısı kurar.$f14ex$,
  'relative-clauses-omission',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f15qt$The man ------- the stolen vehicle near the border was arrested within hours by the local police.$f15qt$,
  $f15op$[{"id":"a","text":"driving"},{"id":"b","text":"driven"},{"id":"c","text":"who driving"},{"id":"d","text":"having driven"}]$f15op$::jsonb,
  'a',
  $f15ex$Cümlecik özne konumunda ve fiil aktif olduğu için "who was driving" kısaltılıp sadece "-ing" formu kalır, doğru cevap "driving"dir. "driven" edilgen bir yapı önerdiği için yanlıştır, oysa adam arabayı kendisi kullanmaktadır; "who driving" zamir atılmış ama "be" fiili de atıldığı için gramer dışıdır; "having driven" ana eylemden önce tamamlanmış bir eylemi belirtir, burada ise eylem yakalandığı anda devam etmektedir.$f15ex$,
  'relative-clauses-participle-reduction',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f16qt$------- all the necessary documents well before the deadline, the applicant was finally granted an interview with the admissions committee.$f16qt$,
  $f16op$[{"id":"a","text":"Having submitted"},{"id":"b","text":"Submitting"},{"id":"c","text":"Submitted"},{"id":"d","text":"Having been submitted"}]$f16op$::jsonb,
  'a',
  $f16ex$Belgelerin teslimi, görüşmenin verilmesinden ÖNCE tamamlanmış bir eylem olduğu için "having + V3" (perfect participle) kullanılmalıdır, doğru cevap "Having submitted"tır. "Submitting" eş zamanlılık anlamı verir, oysa burada önceki bir eylem vurgulanmaktadır; "Submitted" ve "Having been submitted" edilgen yapılardır, oysa başvuru sahibi belgeleri aktif olarak kendisi teslim etmiştir.$f16ex$,
  'relative-clauses-participle-reduction',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f17qt$The historian ------- latest book examines the fall of the Byzantine Empire has been invited to speak at several international conferences.$f17qt$,
  $f17op$[{"id":"a","text":"whose"},{"id":"b","text":"which"},{"id":"c","text":"who"},{"id":"d","text":"where"}]$f17op$::jsonb,
  'a',
  $f17ex$Boşluktan hemen sonra bir isim ("latest book") geldiği ve bu isim tarihçiye ait olduğu için aitlik bildiren "whose" doğru cevaptır. "which" ve "who" ardından doğrudan isim değil yüklem beklediği için yanlıştır; "where" bir yer ismi değil, insan ve aitlik ilişkisi söz konusu olduğu için uygun değildir.$f17ex$,
  'relative-clauses-whose-where',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f18qt$The small coastal village ------- my grandparents were born has changed dramatically over the past five decades because of tourism.$f18qt$,
  $f18op$[{"id":"a","text":"where"},{"id":"b","text":"which"},{"id":"c","text":"that"},{"id":"d","text":"whose"}]$f18op$::jsonb,
  'a',
  $f18ex$Boşluktan önce bir yer ismi ("village") geldiği ve ardından öznesi eksik olmayan tam bir cümle ("my grandparents were born") geldiği için doğru cevap "where"dir. "which" ve "that" bu konumda edat olmadan kullanılamaz çünkü cümle zaten tamdır ve bir edat eksikliği doğurur; "whose" ardından bir isim gelmesini gerektirdiği için burada uygun değildir.$f18ex$,
  'relative-clauses-whose-where',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f19qt$After reviewing the proposal in detail, the board ------- the merger until the next fiscal quarter.$f19qt$,
  $f19op$[{"id":"a","text":"suggested postponing"},{"id":"b","text":"suggested to postpone"},{"id":"c","text":"suggested postpone"},{"id":"d","text":"suggested that postpone"}]$f19op$::jsonb,
  'a',
  $f19ex$"suggest" fiili asla "to + fiil" kalıbını almaz, bunun yerine "+ V-ing" veya "that + özne + should" kalıbı kullanılır, bu yüzden doğru cevap "suggested postponing"tir. "suggested to postpone" klasik bir tuzaktır ve yanlıştır; "suggested postpone" çıplak mastar kullandığı için yanlıştır; "suggested that postpone" ise "that" kalıbında zorunlu olan özneyi atladığı için eksiktir.$f19ex$,
  'reported-commands-requests',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f20qt$The spokesperson ------- to reporters that the merger negotiations had been finalized only after months of private discussions.$f20qt$,
  $f20op$[{"id":"a","text":"said"},{"id":"b","text":"told"},{"id":"c","text":"tells"},{"id":"d","text":"was telling"}]$f20op$::jsonb,
  'a',
  $f20ex$"say" fiili kişi almaz ve kişiden önce mutlaka "to" edatı gerekir, bu yüzden "to reporters" ile uyumlu doğru cevap "said"dir. "told" yanlıştır çünkü "tell" asla "to" ile kullanılmaz, kişiyi doğrudan nesne olarak alır; "tells" ve "was telling" de aynı "tell+to" hatasını taşıdığı için, zaman uyumu bir yana, yapısal olarak yanlıştır.$f20ex$,
  'reported-commands-requests',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f21qt$The engineer informed the client that the repairs ------- completed by Friday if the necessary parts arrived on time.$f21qt$,
  $f21op$[{"id":"a","text":"could be"},{"id":"b","text":"can be"},{"id":"c","text":"could have been"},{"id":"d","text":"can have been"}]$f21op$::jsonb,
  'a',
  $f21ex$Reporting fiil "informed" geçmiş zamanda olduğu için zaman bir basamak geriye kaydırılır ve modal "can" "could"a döner, doğru cevap "could be"dir. "can be" yanlıştır çünkü hiç kaydırma yapılmamıştır; "could have been" ve "can have been" ise cümleye var olmayan bir tamamlanmışlık/geçmişe dönük anlam katarak orijinal anlamı bozar.$f21ex$,
  'reported-speech-statements-questions',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f22qt$The journalist asked the minister ------- the government intended to address the sharply rising inflation rate.$f22qt$,
  $f22op$[{"id":"a","text":"how the government intended to address"},{"id":"b","text":"how did the government intend to address"},{"id":"c","text":"how intended the government to address"},{"id":"d","text":"how does the government intend to address"}]$f22op$::jsonb,
  'a',
  $f22ex$"asked" fiili dolaylı bir soru başlattığı için kelime sırası özne+yüklem olmalı, ayrıca present simple geçmiş zamana kaydırılarak "intended" olmalıdır, doğru cevap bu nedenle "how the government intended to address"tir. "how did the government intend" gömülü soruda gereksiz biçimde do-support korur; "how intended the government" ters çevrilmiş bir yapıdır; "how does the government intend" ise hem do-support hem de zaman kaydırma eksikliği taşır.$f22ex$,
  'reported-speech-statements-questions',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f23qt$The ancient manuscript ------- to have been written by a monk several centuries before the invention of the printing press.$f23qt$,
  $f23op$[{"id":"a","text":"is believed"},{"id":"b","text":"is believing"},{"id":"c","text":"believes"},{"id":"d","text":"is said that"}]$f23op$::jsonb,
  'a',
  $f23ex$Kaynağı belirtilmeyen bir inanışı aktarmak için "özne + be + believed + to + fiil" kalıbı kullanılır ve eylem ana bildirimden önce gerçekleştiği için "to have been written" ile uyumlu doğru cevap "is believed"tir. "is believing" edilgen yapıda bu şekilde kullanılamayacağı için yanlıştır; "believes" özneyi (elyazması) eylemi yapan biri gibi gösterdiği için anlamsızdır; "is said that" ise "to" kalıbıyla "that" kalıbını yanlış biçimde karıştırır.$f23ex$,
  'reporting-passive',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f24qt$It is widely ------- that the ancient trade route had already fallen into disuse long before the empire's final collapse.$f24qt$,
  $f24op$[{"id":"a","text":"believed"},{"id":"b","text":"believed to"},{"id":"c","text":"believing"},{"id":"d","text":"belief"}]$f24op$::jsonb,
  'a',
  $f24ex$"It is + believed/said/thought + that" kalıbında "that" asla atılamaz ve fiil edilgen geçmiş zaman (V3) formunda olmalıdır, bu yüzden doğru cevap "believed"tir. "believed to" yanlıştır çünkü "to" kalıbı "that" ile birlikte kullanılmaz, bu iki yapı birbirinin yerine geçmez; "believing" yanlış formdur; "belief" bir isimdir, yüklem konumunda kullanılamaz.$f24ex$,
  'reporting-passive',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $f25qt$From the control room, the engineers watched the rocket ------- off the launch pad and disappear into the clouds within seconds.$f25qt$,
  $f25op$[{"id":"a","text":"lift"},{"id":"b","text":"lifting"},{"id":"c","text":"lifted"},{"id":"d","text":"to lift"}]$f25op$::jsonb,
  'a',
  $f25ex$Cümlede "and disappear" ile eylemin baştan sona tamamı anlatıldığı için algı fiilinden sonra çıplak mastar (bare infinitive) kullanılır, doğru cevap "lift"tir. "lifting" yanlıştır çünkü bu form eylemi yarım, süren bir anda yakaladığımızı ima eder, oysa burada tam bir sonuç verilmiştir; "lifted" edilgen bir yapı önerdiği için anlamsızdır; "to lift" ise algı fiillerinden sonra "to"lu mastar alınmadığı için yanlıştır.$f25ex$,
  'see-someone-do-vs-doing',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $f26qt$As she walked past the office late at night, she noticed her colleague still ------- at his desk, apparently unaware of the time.$f26qt$,
  $f26op$[{"id":"a","text":"working"},{"id":"b","text":"work"},{"id":"c","text":"worked"},{"id":"d","text":"to work"}]$f26op$::jsonb,
  'a',
  $f26ex$"As she walked past" ifadesi kısa bir anlık geçiş anını belirttiği için algı fiilinden sonra eylemin yarım/süren hâlini gösteren "-ing" formu kullanılır, doğru cevap "working"dir. "work" çıplak mastar eylemin baştan sona tamamının görüldüğünü ima eder, oysa burada sadece anlık bir kare yakalanmıştır; "worked" edilgen/yanlış formdur; "to work" ise algı fiillerinden sonra kullanılmaz.$f26ex$,
  'see-someone-do-vs-doing',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g01qt$The city had planned a large outdoor concert for Saturday night, but when a severe storm warning was issued, officials decided to ------- only a few hours before it was scheduled to start.$g01qt$,
  $g01op$[{"id":"a","text":"call it off"},{"id":"b","text":"call off it"},{"id":"c","text":"call the off it"},{"id":"d","text":"off call it"}]$g01op$::jsonb,
  'a',
  $g01ex$Cümlede nesne olan "the concert" kavramı zamirle ("it") karşılanmaktadır ve "call off" ayrılabilir bir phrasal verb olduğu için nesne zamir olduğunda fiil ile parçacık arasına girmek ZORUNDADIR, bu yüzden doğru cevap "call it off"tur. "call off it" yanlıştır çünkü ayrılabilir phrasal verb'lerde nesne zamir olduğunda asla fiil+parçacık grubunun sonuna atılamaz; "off call it" ve "call the off it" ise sözcük sırası açısından İngilizce'de hiç var olmayan yapılardır.$g01ex$,
  'separable-inseparable-phrasal-verbs',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g02qt$Whenever her parents travel abroad for work, Elif's grandmother is the one who ------- , making sure she gets to school on time and finishes her homework every evening.$g02qt$,
  $g02op$[{"id":"a","text":"looks after her"},{"id":"b","text":"looks her after"},{"id":"c","text":"her looks after"},{"id":"d","text":"after looks her"}]$g02op$::jsonb,
  'a',
  $g02ex$"look after" ayrılamaz bir phrasal verb'dür, bu yüzden nesne (her = Elif) ister isim ister zamir olsun HER ZAMAN fiil+parçacık grubunun sonrasına gelir; doğru cevap "looks after her"dır. "looks her after" yanlıştır çünkü ayrılamaz phrasal verb'lerde zamir dahi araya giremez; "her looks after" ve "after looks her" ise sözcük dizilimini tamamen bozduğu için anlamsızdır.$g02ex$,
  'separable-inseparable-phrasal-verbs',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g03qt$Fatma has always been fascinated by ancient civilizations, and ------- her younger brother, who spends hours reading about Egyptian pyramids.$g03qt$,
  $g03op$[{"id":"a","text":"so has"},{"id":"b","text":"so does"},{"id":"c","text":"neither has"},{"id":"d","text":"so he has"}]$g03op$::jsonb,
  'a',
  $g03ex$Önceki cümle olumlu olduğu ("has always been") ve aynı fikirde/durumda olunduğu belirtildiği için "so + yardımcı fiil + özne" kalıbı kullanılır; yardımcı fiil önceki cümledeki "has"e uymalıdır, bu yüzden doğru cevap "so has"tır. "so does" yanlıştır çünkü yardımcı fiil önceki cümleyle uyuşmuyor; "neither has" olumlu bir cümleden sonra çelişki yaratır; "so he has" ise devrik yapı kurallı değildir, özne yardımcı fiilden sonra gelmelidir.$g03ex$,
  'so-neither-agreement',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g04qt$The new intern hasn't mastered the accounting software yet, and ------- most of her colleagues who joined the firm around the same time.$g04qt$,
  $g04op$[{"id":"a","text":"neither have"},{"id":"b","text":"so have"},{"id":"c","text":"neither they have"},{"id":"d","text":"have neither"}]$g04op$::jsonb,
  'a',
  $g04ex$Önceki cümle olumsuz olduğu ("hasn't mastered") için "neither/nor + yardımcı fiil + özne" devrik kalıbı kullanılır ve yardımcı fiil "has/have"e uymalıdır; özne çoğul ("most of her colleagues") olduğundan doğru cevap "neither have"dir. "so have" yanlıştır çünkü olumsuz bir cümleden sonra "so" kullanmak anlam çelişkisi yaratır; "neither they have" ve "have neither" ise devrik yapıyı bozduğu için yanlıştır, doğru sırada yardımcı fiil özneden önce gelmelidir.$g04ex$,
  'so-neither-agreement',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g05qt$The lecture on quantum mechanics was ------- that even the most advanced physics students struggled to follow the professor's reasoning.$g05qt$,
  $g05op$[{"id":"a","text":"so complicated"},{"id":"b","text":"such complicated"},{"id":"c","text":"such a complicated"},{"id":"d","text":"so a complicated"}]$g05op$::jsonb,
  'a',
  $g05ex$Boşluktan hemen sonra çıplak bir sıfat ("complicated") gelmekte, araya herhangi bir isim girmemektedir; bu yüzden doğru cevap "so complicated"dır. "such complicated" yanlıştır çünkü "such" bir isim öbeği gerektirir, tek başına sıfattan önce kullanılmaz; "such a complicated" ve "so a complicated" ise cümlede bir isim bulunmadığı halde article eklediği için yapısal olarak hatalıdır.$g05ex$,
  'so-that-such-that',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g06qt$------- many tourists visited the historic old town last summer that local authorities had to introduce timed entry tickets to prevent overcrowding.$g06qt$,
  $g06op$[{"id":"a","text":"So"},{"id":"b","text":"Such"},{"id":"c","text":"So much"},{"id":"d","text":"Such a"}]$g06op$::jsonb,
  'a',
  $g06ex$"many" bir miktar belirteci olup sonrasında çoğul bir isim (tourists) geldiğinde istisna kuralı devreye girer ve "so" kullanılır, bu yüzden doğru cevap "So"dur. "Such" bu istisnada kullanılmaz; "So much" yanlıştır çünkü "tourists" sayılabilir bir isim olduğundan "much" değil "many" ile uyumlu "so" gerekir; "Such a" ise hem kuralı hem de çoğul isimle tekil article kullanımını ihlal eder.$g06ex$,
  'so-that-such-that',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g07qt$Although the negotiations had collapsed twice before, the mediator politely asked the delegates, "Would you like ------- more time to reconsider your position before we adjourn?"$g07qt$,
  $g07op$[{"id":"a","text":"some"},{"id":"b","text":"any"},{"id":"c","text":"no"},{"id":"d","text":"none"}]$g07op$::jsonb,
  'a',
  $g07ex$Cümle soru formunda olsa da bir teklif/rica anlamı taşıdığı ve olumlu bir cevap beklendiği için istisna kuralı gereği "some" kullanılır, doğru cevap "some"dur. "any" normal soru cümlelerinde kullanılır ama burada teklif söz konusu olduğundan uygun değildir; "no" ve "none" ise hem anlamsal hem de yapısal olarak bu bağlama uymaz.$g07ex$,
  'some-any-no-none',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g08qt$The inspector insisted that he hadn't received ------- complaints about the factory's safety standards before the accident occurred.$g08qt$,
  $g08op$[{"id":"a","text":"any"},{"id":"b","text":"no"},{"id":"c","text":"none"},{"id":"d","text":"some"}]$g08op$::jsonb,
  'a',
  $g08ex$Cümle "hadn't received" ile zaten olumsuz olduğu için doğru cevap "any"dir; "no" kullanmak cümleyi çifte olumsuz yaparak YDS'nin klasik tuzağına düşürür ve yanlıştır. "none" bir isim grubunun yerini tutmak için kullanılır, doğrudan isimden önce bu şekilde gelemez; "some" ise olumsuz cümlede kullanılmaz.$g08ex$,
  'some-any-no-none',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g09qt$The news that reached the small fishing village early this morning ------- (suggest) that the fragile ceasefire might collapse within days.$g09qt$,
  $g09op$[{"id":"a","text":"suggests"},{"id":"b","text":"suggest"},{"id":"c","text":"are suggesting"},{"id":"d","text":"have suggested"}]$g09op$::jsonb,
  'a',
  $g09ex$"news" sonunda -s olsa da sayılamayan bir isimdir ve her zaman tekil fiil alır, bu yüzden doğru cevap "suggests"tir. "suggest", "are suggesting" ve "have suggested" hepsi çoğul özneye göre çekimlendiği için yanlıştır; isimin -s ile bitmesi onu çoğul yapmaz, bu YDS'nin klasik görünüş tuzağıdır.$g09ex$,
  'subject-verb-agreement-nouns',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g10qt$The director, as well as several senior engineers, ------- (be) scheduled to attend the safety inspection next Monday.$g10qt$,
  $g10op$[{"id":"a","text":"is"},{"id":"b","text":"are"},{"id":"c","text":"were"},{"id":"d","text":"have been"}]$g10op$::jsonb,
  'a',
  $g10ex$Asıl özne tekil olan "The director"dır; araya giren "as well as several senior engineers" ifadesi özneyi çoğullaştırmaz, bu yüzden fiil asıl özneye göre tekil olmalı ve doğru cevap "is"tir. "are" bu yapıdaki en sık yapılan hatadır çünkü araya giren ifadeyi özneye dahil ederek yanlışlıkla çoğul fiil seçtirir; "were" ve "have been" ise hem sayı hem de zaman açısından uygun değildir.$g10ex$,
  'subject-verb-agreement-nouns',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g11qt$A stray dog was found wandering near the construction site every morning last week, and ------- dog turned out to belong to one of the site workers who had been searching for it for days.$g11qt$,
  $g11op$[{"id":"a","text":"the"},{"id":"b","text":"a"},{"id":"c","text":"an"},{"id":"d","text":"some"}]$g11op$::jsonb,
  'a',
  $g11ex$İsim ilk cümlede "a stray dog" ile tanıtılmış ve artık karşılıklı bilinen/tanımlanmış bir varlık haline gelmiştir, bu yüzden ikinci bahsedilişinde "the" alır ve doğru cevap "the"dir. "a" ve "an" yanlıştır çünkü bu belirsiz artikeller ancak ilk kez bahsedilen, tanımlanmamış isimlerle kullanılır; "some" ise tekil sayılabilir bir isimle bu şekilde kullanılmaz.$g11ex$,
  'the-specific-vs-general',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g12qt$Stretching for over 6,850 kilometers, ------- Nile remains one of the most economically vital rivers on the African continent.$g12qt$,
  $g12op$[{"id":"a","text":"the"},{"id":"b","text":"a"},{"id":"c","text":"an"},{"id":"d","text":"that"}]$g12op$::jsonb,
  'a',
  $g12ex$Nehir isimleri gibi sabit coğrafi isimler her zaman "the" ile kullanılır; bu, ezberlenmesi gereken bir istisnadır ve doğru cevap "the"dir. "a" ve "an" özel/tekil coğrafi isimlerle kullanılmaz; "that" ise burada gereksiz bir işaret sıfatı ekleyerek doğal akışı bozar ve bu tür özel isimlerle standart kullanım değildir.$g12ex$,
  'the-specific-vs-general',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g13qt$The engineers will not release the bridge for public use until independent inspectors ------- (confirm) that every structural component meets the required safety standards.$g13qt$,
  $g13op$[{"id":"a","text":"confirm"},{"id":"b","text":"will confirm"},{"id":"c","text":"confirmed"},{"id":"d","text":"are confirming"}]$g13op$::jsonb,
  'a',
  $g13ex$"until" ile kurulan bir zaman cümleciği olduğu için olay gelecekte gerçekleşecek olsa bile "will" kullanılmaz; tek seferlik bir eylem anlatıldığından Present Simple kullanılır ve doğru cevap "confirm"dür. "will confirm" zaman cümleciğinde asla kullanılamayacağı için YDS'nin klasik tuzağıdır; "confirmed" geçmiş zaman anlamı taşıdığından, "are confirming" ise süreklilik vurgusu yanlış olduğundan uygun değildir.$g13ex$,
  'time-clauses-future-meaning',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g14qt$After the committee ------- (review) all the submitted proposals, it will announce the winner at the award ceremony next month.$g14qt$,
  $g14op$[{"id":"a","text":"has reviewed"},{"id":"b","text":"will review"},{"id":"c","text":"reviews"},{"id":"d","text":"is reviewing"}]$g14op$::jsonb,
  'a',
  $g14ex$"after" ile kurulan zaman cümleciğinde, ana cümledeki eylemden (announce) ÖNCE tamamlanmış olacak bir eylem anlatıldığı için Present Perfect kullanılır, doğru cevap "has reviewed"dir. "will review" zaman cümleciğinde kesinlikle kullanılamaz; "reviews" tamamlanmışlık vurgusunu taşımadığı için zayıf bir seçenektir; "is reviewing" ise süreklilik anlamı verdiğinden tamamlanmış bir eylemi ifade edemez.$g14ex$,
  'time-clauses-future-meaning',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g15qt$Before the factory installed automated machinery, workers ------- (sort) the products by hand, a process that took several hours each day.$g15qt$,
  $g15op$[{"id":"a","text":"used to sort"},{"id":"b","text":"are used to sorting"},{"id":"c","text":"used to sorting"},{"id":"d","text":"get used to sort"}]$g15op$::jsonb,
  'a',
  $g15ex$Cümle geçmişte yapılıp artık yapılmayan bir alışkanlığı anlattığı ("before... installed automated machinery") ve "used to" sonrası yalın fiil geldiği için doğru cevap "used to sort"tur. "are used to sorting" yanlıştır çünkü bu kalıp şu anki bir alışkanlığı anlatır, geçmiş bağlamla çelişir; "used to sorting" ve "get used to sort" ise bu üç yapının kurallarını birbirine karıştıran klasik karışık (hibrit) hatalardır.$g15ex$,
  'used-to-be-used-to',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g16qt$Having lived in Istanbul's chaotic traffic for over a decade, Elif ------- (drive) through narrow, congested streets during rush hour.$g16qt$,
  $g16op$[{"id":"a","text":"is used to driving"},{"id":"b","text":"used to drive"},{"id":"c","text":"is used to drive"},{"id":"d","text":"get used to driving"}]$g16op$::jsonb,
  'a',
  $g16ex$On yılı aşkın süredir bu duruma hâlâ alışkın olduğu anlatıldığı için "be used to + -ing" kalıbı gerekir ve doğru cevap "is used to driving"dir. "used to drive" yanlıştır çünkü bu kalıp artık geçerli olmayan bir geçmiş alışkanlığı anlatır, oysa cümlede durum hâlâ devam etmektedir; "is used to drive" kalıptan sonra yalın fiil kullandığı için, "get used to driving" ise özne-fiil uyumsuzluğu içerdiği için yanlıştır.$g16ex$,
  'used-to-be-used-to',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g17qt$Mert clearly remembers ------- (lock) the safe before he left the office, which is why the break-in came as such a shock to him.$g17qt$,
  $g17op$[{"id":"a","text":"locking"},{"id":"b","text":"to lock"},{"id":"c","text":"having to lock"},{"id":"d","text":"lock"}]$g17op$::jsonb,
  'a',
  $g17ex$Mert'in geçmişte yaptığı bir eylemi (kasayı kilitlemesini) hatırladığı anlatıldığı için "remember + -ing" kalıbı kullanılır, doğru cevap "locking"dir. "to lock" yanlıştır çünkü bu kalıp henüz yapılmamış bir görevi unutmamayı anlatır, oysa burada eylem zaten gerçekleşmiştir; "having to lock" ve "lock" ise bu fiilden sonra gelen standart tamamlayıcı yapılar değildir.$g17ex$,
  'verb-ing-infinitive-meaning-change',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g18qt$During the long drive to Ankara, the exhausted truck driver ------- (rest) for twenty minutes at a service station before continuing his journey.$g18qt$,
  $g18op$[{"id":"a","text":"to rest"},{"id":"b","text":"resting"},{"id":"c","text":"having rested"},{"id":"d","text":"rest"}]$g18op$::jsonb,
  'a',
  $g18ex$Sürücünün yolculuğu (sürmeyi) durdurup BAŞKA bir eylem (dinlenmek) yapmak için durduğu anlatıldığından "stop + to-infinitive" kalıbı kullanılır, doğru cevap "to rest"tir. "resting" yanlıştır çünkü bu kalıp dinlenme eyleminin kendisini durdurmayı anlatır ki bu cümlenin anlamıyla çelişir; "having rested" ve "rest" ise bu fiilden sonra gelen tanınan tamamlayıcı yapılar değildir.$g18ex$,
  'verb-ing-infinitive-meaning-change',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g19qt$The new policy ------- (encourage) employees to report any safety concerns directly to management without fear of retaliation.$g19qt$,
  $g19op$[{"id":"a","text":"encourages employees to report"},{"id":"b","text":"encourages to report employees"},{"id":"c","text":"encourages that employees report"},{"id":"d","text":"encourages employees report"}]$g19op$::jsonb,
  'a',
  $g19ex$"encourage" gibi fiillerden sonra NESNE (employees) + to-infinitive kalıbı kullanılır ve nesne mutlaka fiil ile to-infinitive arasına girmelidir, bu yüzden doğru cevap "encourages employees to report"tur. "encourages to report employees" sözcük sırasını bozduğu için, "encourages that employees report" bu fiille kullanılmayan bir yapı olduğu için, "encourages employees report" ise "to" eksikliği nedeniyle yanlıştır.$g19ex$,
  'verb-object-infinitive',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g20qt$Given the recent budget cuts, the finance director ------- that the company postpone all non-essential travel until next quarter.$g20qt$,
  $g20op$[{"id":"a","text":"suggested"},{"id":"b","text":"wanted"},{"id":"c","text":"told"},{"id":"d","text":"encouraged"}]$g20op$::jsonb,
  'a',
  $g20ex$Cümledeki "that the company postpone" yapısı nesne+to-infinitive değil, bir "that" cümleciğidir; "want", "tell" ve "encourage" gibi fiiller bu yapıyla değil mutlaka nesne+to-infinitive ile kullanılır, bu yüzden bu şıklar cümleye uymaz. "suggest" ise nesne+to-infinitive kalıbına UYMAYAN istisnai bir fiildir ve doğrudan "that" cümleciğiyle kullanılabildiği için doğru cevap "suggested"dır.$g20ex$,
  'verb-object-infinitive',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g21qt$Despite repeated warnings from environmental groups, the corporation remains firmly opposed ------- (change) its manufacturing process to reduce carbon emissions.$g21qt$,
  $g21op$[{"id":"a","text":"to changing"},{"id":"b","text":"to change"},{"id":"c","text":"changing"},{"id":"d","text":"for changing"}]$g21op$::jsonb,
  'a',
  $g21ex$"opposed to" kalıbındaki "to" bir infinitive belirteci değil bir EDATTIR, bu yüzden ardından -ing gelir ve doğru cevap "to changing"dir. "to change" klasik tuzaktır çünkü "to"yu infinitive belirteci sanıp yalın fiil getirir; "changing" edatı atladığı için, "for changing" ise yanlış edat kullandığı için uygun değildir.$g21ex$,
  'verb-preposition-ing',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g22qt$After years of preparation, the young diplomat is finally looking forward ------- (present) her proposal to the United Nations General Assembly next week.$g22qt$,
  $g22op$[{"id":"a","text":"to presenting"},{"id":"b","text":"to present"},{"id":"c","text":"for presenting"},{"id":"d","text":"presenting"}]$g22op$::jsonb,
  'a',
  $g22ex$"look forward to" kalıbındaki "to" bir edattır ve ardından her zaman -ing gelir, bu yüzden doğru cevap "to presenting"dir. "to present" sınavın en sık tekrarlanan tuzaklarından biridir çünkü "to"yu infinitive belirteci zannettirir; "for presenting" yanlış edat, "presenting" ise gerekli edatı atladığı için yanlıştır.$g22ex$,
  'verb-preposition-ing',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g23qt$I wish I ------- (be) more confident during job interviews instead of freezing up every time a difficult question comes up.$g23qt$,
  $g23op$[{"id":"a","text":"were"},{"id":"b","text":"am"},{"id":"c","text":"had been"},{"id":"d","text":"will be"}]$g23op$::jsonb,
  'a',
  $g23ex$Şu anki bir durumdan (mülakatlarda özgüvensiz olmaktan) memnuniyetsizlik dile getirildiği için "wish + Past Simple" kullanılır ve "be" fiili için özneden bağımsız olarak "were" kullanılır, doğru cevap "were"dir. "am" yanlıştır çünkü wish'ten sonra gerçek şimdiki zaman kullanılmaz; "had been" geçmişe dönük bir pişmanlığı anlatır ki burada durum hâlâ devam etmektedir; "will be" ise wish'ten hemen sonra asla kullanılmaz.$g23ex$,
  'wish-if-only',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g24qt$The residents of the apartment building wish their new neighbor ------- loud music late at night, since several people have complained about not getting any sleep.$g24qt$,
  $g24op$[{"id":"a","text":"would stop playing"},{"id":"b","text":"stopped playing"},{"id":"c","text":"will stop playing"},{"id":"d","text":"stop playing"}]$g24op$::jsonb,
  'a',
  $g24ex$Sakinlerin komşunun tekrarlayan davranışından RAHATSIZLIK duyduğu ve bu davranışın gelecekte değişmesini dilediği anlatıldığı için "wish + would" kalıbı kullanılır, doğru cevap "would stop playing"dir. "stopped playing" şimdiki bir durumdan memnuniyetsizliği anlatan farklı bir kalıptır ve buradaki rahatsızlık/davranış vurgusunu karşılamaz; "will stop playing" ve "stop playing" ise wish'ten sonra asla bu şekilde kullanılmaz.$g24ex$,
  'wish-if-only',
  'tactic',
  'approved',
  true,
  'en',
  'hard',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yds',
  $g25qt$The committee's decision to cut funding for the research program sparked considerable ------- among the scientists, many of whom threatened to resign.$g25qt$,
  $g25op$[{"id":"a","text":"frustration"},{"id":"b","text":"frustrated"},{"id":"c","text":"frustrating"},{"id":"d","text":"frustrate"}]$g25op$::jsonb,
  'a',
  $g25ex$Boşluk "considerable" sıfatından sonra bir İSİM konumundadır (özne/nesne görevinde), bu yüzden isim yapan "-tion" eki almış hali olan "frustration" doğru cevaptır. "frustrated" ve "frustrating" sıfat olduğu için bu konuma uymaz; "frustrate" ise yalın fiil formudur ve isim gereken bir yere fiil getirilemez.$g25ex$,
  'word-formation-collocations',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, topic_tag, source_type, status, is_active, learning_lang, difficulty_level, related_words)
VALUES (
  'yokdil',
  $g26qt$Before launching the new product, the marketing team decided to ------- a thorough analysis of consumer preferences across different age groups.$g26qt$,
  $g26op$[{"id":"a","text":"conduct"},{"id":"b","text":"make"},{"id":"c","text":"do"},{"id":"d","text":"build"}]$g26op$::jsonb,
  'a',
  $g26ex$İngilizce'de "analysis" kelimesiyle doğal olarak eşleşen (collocation) fiil "conduct"tur ("conduct an analysis"), bu yüzden doğru cevap "conduct"tur. "make" ve "do" anlamca yakın görünse de bu isimle birlikte doğal kullanılmaz, tıpkı "do a decision" yerine "make a decision" denmesi gibi bu bir gramer kuralı değil yerleşik bir alışkanlıktır; "build" ise bu isimle hiç eşleşmeyen bir fiildir.$g26ex$,
  'word-formation-collocations',
  'tactic',
  'approved',
  true,
  'en',
  'medium',
  '[]'::jsonb
);

