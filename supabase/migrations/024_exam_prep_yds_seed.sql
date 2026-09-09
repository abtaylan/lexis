-- Migration: Sınav Hazırlık Alanı — YDS soru bankası ilk seed (15 orijinal soru).
-- İçerik kaynağı kararı (bkz. 023_exam_prep.sql başlığı, devir notu §1.1.1):
-- telif riski nedeniyle GERÇEK geçmiş YDS soruları KULLANILMIYOR — bunlar
-- sınav formatına (cümlede boşluk doldurma / vocabulary-in-context) uygun,
-- orijinal olarak üretilmiş sorulardır. Her soru B2-C1 seviyesinde bir hedef
-- kelime öğretir; related_words alanı üzerinden kullanıcı bu kelimeyi tek
-- dokunuşla kendi kelime hazinesine ekleyebilir (bkz.
-- backend/app/api/routes/exams.py::add_word_from_question).
--
-- YÖKDİL/IELTS/TOEFL için soru bankası henüz boş (question_count=0 ->
-- available=false) — /exams/exam-types bunu otomatik yansıtır, istemci
-- "Yakında" olarak gösterir. Sırası gelince aynı desenle yeni seed
-- migration'ları eklenerek genişletilir.

INSERT INTO public.exam_questions (exam_type, question_text, options, correct_option, explanation, related_words, difficulty_level)
VALUES
('yds',
 'The committee was ------- to approve the new budget proposal without further review, given the significant financial risks involved.',
 '[{"id":"a","text":"reluctant"},{"id":"b","text":"enthusiastic"},{"id":"c","text":"indifferent"},{"id":"d","text":"obligated"}]',
 'a',
 'Cümlenin ikinci yarısında "önemli finansal riskler" vurgulanıyor, bu da komitenin onaylamaya isteksiz/çekingen (reluctant) olduğunu ima eder. "enthusiastic" (hevesli) ve "indifferent" (kayıtsız) bağlamla çelişir, "obligated" (zorunlu) anlam olarak uymaz.',
 '[{"word":"reluctant","meaning":"isteksiz, çekingen","example":"She was reluctant to sign the contract without reading it first."}]',
 'medium'),

('yds',
 'The auditor''s ------- examination of the financial records revealed several discrepancies that had gone unnoticed for years.',
 '[{"id":"a","text":"careless"},{"id":"b","text":"meticulous"},{"id":"c","text":"superficial"},{"id":"d","text":"hasty"}]',
 'b',
 'Yıllardır fark edilmeyen tutarsızlıkları ortaya çıkarması çok dikkatli, titiz bir inceleme gerektirir; bu nedenle "meticulous" (titiz) doğru cevaptır. Diğer seçenekler (dikkatsiz, yüzeysel, aceleci) bu sonuçla çelişir.',
 '[{"word":"meticulous","meaning":"titiz, çok dikkatli","example":"He is meticulous about keeping his workspace organized."}]',
 'medium'),

('yds',
 'The rapid spread of the technology led to an ------- transformation of the industry within just a few years.',
 '[{"id":"a","text":"unprecedented"},{"id":"b","text":"predictable"},{"id":"c","text":"gradual"},{"id":"d","text":"minor"}]',
 'a',
 '"Sadece birkaç yıl içinde" hızlı ve büyük bir dönüşüm ima ediliyor; bu, eşi görülmemiş/daha önce görülmemiş (unprecedented) anlamına en uygun seçenektir.',
 '[{"word":"unprecedented","meaning":"eşi görülmemiş, benzeri olmayan","example":"The pandemic caused unprecedented disruption to global supply chains."}]',
 'medium'),

('yds',
 'The negotiations were ultimately successful, ------- after several rounds of tense discussions between the two parties.',
 '[{"id":"a","text":"albeit"},{"id":"b","text":"despite"},{"id":"c","text":"unless"},{"id":"d","text":"whereas"}]',
 'a',
 '"Albeit" bir sıfat/zarf öbeğinden önce kullanılıp "her ne kadar ... olsa da" anlamı katan bir bağlaçtır; burada başarı ile gergin tartışmalar arasındaki zıtlığı bağlar. "despite" bir isim/fiil-ing gerektirir, cümle yapısına uymaz; "unless" ve "whereas" anlam olarak uymaz.',
 '[{"word":"albeit","meaning":"gerçi, her ne kadar ... olsa da","example":"The plan worked, albeit slowly."}]',
 'hard'),

('yds',
 'The lawyer presented such a ------- argument that even the skeptical jury members were persuaded.',
 '[{"id":"a","text":"compelling"},{"id":"b","text":"trivial"},{"id":"c","text":"irrelevant"},{"id":"d","text":"vague"}]',
 'a',
 'Şüpheci jüri üyelerinin bile ikna olması güçlü, ikna edici bir argümanı gerektirir; "compelling" bu anlamı verir.',
 '[{"word":"compelling","meaning":"ikna edici, çok güçlü","example":"She gave a compelling speech that changed many opinions."}]',
 'medium'),

('yds',
 'The wording of the contract was so ------- that both parties interpreted the clause differently.',
 '[{"id":"a","text":"ambiguous"},{"id":"b","text":"explicit"},{"id":"c","text":"straightforward"},{"id":"d","text":"concise"}]',
 'a',
 'İki tarafın maddeyi farklı yorumlaması belirsiz/çok anlamlı bir ifadeyi gösterir; "ambiguous" doğru cevaptır. "explicit" (açık), "straightforward" (dolaysız) ve "concise" (öz) bu sonuçla çelişir.',
 '[{"word":"ambiguous","meaning":"belirsiz, çok anlamlı","example":"His answer was ambiguous, leaving us unsure of his real opinion."}]',
 'medium'),

('yds',
 'Excessive use of pesticides can be ------- to the long-term health of the soil and surrounding ecosystem.',
 '[{"id":"a","text":"beneficial"},{"id":"b","text":"detrimental"},{"id":"c","text":"irrelevant"},{"id":"d","text":"negligible"}]',
 'b',
 'Aşırı kullanım olumsuz bir sonuca işaret eder; toprağın sağlığına zararlı (detrimental) olması bağlamla örtüşür.',
 '[{"word":"detrimental","meaning":"zararlı, zarar verici","example":"Smoking is detrimental to your health."}]',
 'easy'),

('yds',
 'Despite losing everything in the flood, the community proved remarkably ------- and rebuilt within a year.',
 '[{"id":"a","text":"fragile"},{"id":"b","text":"resilient"},{"id":"c","text":"indifferent"},{"id":"d","text":"reluctant"}]',
 'b',
 'Her şeyi kaybetmesine rağmen bir yıl içinde yeniden inşa etmesi toparlanma gücünü/dayanıklılığı gösterir; "resilient" doğru cevaptır.',
 '[{"word":"resilient","meaning":"dayanıklı, çabuk toparlanan","example":"Children are often remarkably resilient in the face of change."}]',
 'medium'),

('yds',
 'Employees complained that the new dress code was applied in an ------- manner, with no clear or consistent standard.',
 '[{"id":"a","text":"arbitrary"},{"id":"b","text":"systematic"},{"id":"c","text":"transparent"},{"id":"d","text":"justified"}]',
 'a',
 'Net veya tutarlı bir standart olmaması keyfi bir uygulamayı ifade eder; "arbitrary" doğru cevaptır.',
 '[{"word":"arbitrary","meaning":"keyfi, gelişigüzel","example":"The decision seemed arbitrary and lacked any clear justification."}]',
 'medium'),

('yds',
 'Although the witness''s account seemed ------- at first, further investigation revealed several inconsistencies.',
 '[{"id":"a","text":"implausible"},{"id":"b","text":"plausible"},{"id":"c","text":"irrelevant"},{"id":"d","text":"fabricated"}]',
 'b',
 '"İlk başta ... görünse de" ifadesi ile sonradan tutarsızlıklar ortaya çıkması bir zıtlık kurar; başlangıçta makul/akla yatkın (plausible) görünmesi gerekir.',
 '[{"word":"plausible","meaning":"makul, akla yatkın","example":"It sounds like a plausible explanation for the delay."}]',
 'hard'),

('yds',
 'The professor asked the students to submit a ------- essay in which each paragraph logically follows from the previous one.',
 '[{"id":"a","text":"coherent"},{"id":"b","text":"fragmented"},{"id":"c","text":"repetitive"},{"id":"d","text":"ambiguous"}]',
 'a',
 'Her paragrafın bir öncekinden mantıksal olarak takip etmesi tutarlı bir metni tanımlar; "coherent" doğru cevaptır.',
 '[{"word":"coherent","meaning":"tutarlı, mantıklı bağlantılı","example":"He gave a coherent explanation of the entire process."}]',
 'medium'),

('yds',
 'The initial meeting raised several concerns, which were addressed in ------- discussions over the following weeks.',
 '[{"id":"a","text":"previous"},{"id":"b","text":"subsequent"},{"id":"c","text":"simultaneous"},{"id":"d","text":"preliminary"}]',
 'b',
 '"Takip eden haftalarda" ifadesi ile uyumlu olan seçenek sonraki/takip eden (subsequent) tartışmalardır.',
 '[{"word":"subsequent","meaning":"sonraki, takip eden","example":"The subsequent chapters explain the theory in more detail."}]',
 'medium'),

('yds',
 'Given the company''s mounting debts and declining sales, bankruptcy seemed all but ------- .',
 '[{"id":"a","text":"avoidable"},{"id":"b","text":"inevitable"},{"id":"c","text":"optional"},{"id":"d","text":"unlikely"}]',
 'b',
 'Artan borçlar ve azalan satışlar kaçınılmaz bir sonucu işaret eder; "inevitable" doğru cevaptır.',
 '[{"word":"inevitable","meaning":"kaçınılmaz","example":"With the current trends, change seems inevitable."}]',
 'medium'),

('yds',
 'The politician''s ------- remarks about immigration policy sparked heated debate across the country.',
 '[{"id":"a","text":"uncontroversial"},{"id":"b","text":"controversial"},{"id":"c","text":"trivial"},{"id":"d","text":"unnoticed"}]',
 'b',
 'Ülke genelinde ateşli tartışma başlatması tartışmalı bir açıklamayı ima eder; "controversial" doğru cevaptır.',
 '[{"word":"controversial","meaning":"tartışmalı, ihtilaflı","example":"Climate change remains a controversial topic in some political circles."}]',
 'easy'),

('yds',
 '------- the heavy rain, thousands of fans gathered outside the stadium to watch the match on a big screen.',
 '[{"id":"a","text":"Notwithstanding"},{"id":"b","text":"Because of"},{"id":"c","text":"Due to"},{"id":"d","text":"As a result of"}]',
 'a',
 '"Notwithstanding" isim öbeğinden önce kullanılıp "rağmen/karşın" anlamı veren resmi bir edattır; ağır yağmura rağmen insanların toplanması zıtlık ifade eder. "Because of", "Due to" ve "As a result of" ise sebep-sonuç ifade eder, cümledeki zıtlıkla uyuşmaz.',
 '[{"word":"notwithstanding","meaning":"-e rağmen, karşın","example":"Notwithstanding the criticism, she continued with her plan."}]',
 'hard');
