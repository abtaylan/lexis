-- ============================================================
-- LEXIS — Görev haritası v2: gerçek içerik (dünyalar/parçalar/görevler)
-- Migration: 059_quest_map_v2_content.sql
-- ============================================================
-- Migration 049 SADECE şemayı ekledi (quest_worlds/quest_parts +
-- quest_nodes.world_id/part_id/content_type/content_ref/difficulty_index)
-- ve mevcut 5 görevi "Dünya 1 / Bölüm 1"e taşıdı — asıl İÇERİK (kullanıcı
-- isteği: "içeriği tamamen değişecek") bu migration'da geliyor.
--
-- content_type -> content_ref sözleşmesi (backend routes/quests.py
-- _evaluate_requirement ile BİRLİKTE okunmalı):
--   'aggregate'         -> content_ref YOK, sadece arka planda canlı
--                          kontrol (xp_total/duel_wins) — v1 davranışı.
--   'game'               -> content_ref={"game_mode": <games.py GameMode
--                          değeri>}, requirement_type='game_sessions_count'
--                          (o mode'da tamamlanmış game_sessions sayısı).
--   'flashcard'          -> content_ref={"study_type":"flashcard"},
--                          requirement_type='study_sessions_count'.
--   'grammar_topic'      -> content_ref={"grammar_topic_slug": <grammar_
--                          topics.slug>}, requirement_type=
--                          'exam_topic_practice_count' (o topic_tag'e
--                          eşleşen exam_attempts sayısı — "bu konudan
--                          pratik yap" akışı, exams.py'de zaten var).
--   'quiz'                -> content_ref={"exam_type": <exam_type>},
--                          requirement_type='exam_questions_answered_count'
--                          (o exam_type'ta cevaplanan soru sayısı, mock
--                          DEĞİL — serbest pratik).
--   'question_practice'  -> content_ref={"exam_type": <exam_type>},
--                          requirement_type='exam_mock_completed_count'
--                          (o exam_type'ta tamamlanmış timed_mock sayısı).
--   'duel'                -> content_ref YOK, requirement_type='duel_wins'
--                          (aggregate ile aynı mekanik, sadece frontend'e
--                          "düello sekmesine git" ikonu/CTA'sı vermek için
--                          ayrı bir content_type).
--
-- Frontend (web+mobile) bu content_type'a göre "bu düğüme dokununca nereye
-- git" kararını verir (bkz. exam-grammar/page.tsx harita deseni) — ayrı
-- bir adımda uygulanacak.
-- ============================================================

INSERT INTO public.quest_worlds (slug, title_tr, title_en, order_index) VALUES
  ('world-2', 'Gramer Yolculuğu', 'Grammar Journey', 2),
  ('world-3', 'Şampiyonluk Arenası', 'Champion''s Arena', 3);

INSERT INTO public.quest_parts (world_id, part_index, title_tr, title_en)
SELECT id, 2, 'Bölüm 2', 'Part 2' FROM public.quest_worlds WHERE slug = 'world-1'
UNION ALL
SELECT id, 1, 'Temeller', 'Foundations' FROM public.quest_worlds WHERE slug = 'world-2'
UNION ALL
SELECT id, 2, 'İleri Gramer', 'Advanced Grammar' FROM public.quest_worlds WHERE slug = 'world-2'
UNION ALL
SELECT id, 1, 'Arenaya Giriş', 'Entering the Arena' FROM public.quest_worlds WHERE slug = 'world-3'
UNION ALL
SELECT id, 2, 'Zirve', 'The Summit' FROM public.quest_worlds WHERE slug = 'world-3';

-- Dünya 1'in başlığı da "içerik tamamen değişecek" ruhuyla güncellendi
-- (nötr "Dünya 1" yerine tematik bir isim).
UPDATE public.quest_worlds SET title_tr = 'Başlangıç', title_en = 'Beginnings' WHERE slug = 'world-1';

-- ---- Dünya 1 / Bölüm 2 (order_index 6-9) ----
INSERT INTO public.quest_nodes
  (slug, title_tr, title_en, description_tr, description_en, requirement_type, requirement_count, order_index, world_id, part_id, content_type, content_ref, difficulty_index, reward_xp)
SELECT
  'game-multiple-choice-1', 'İlk Sınav', 'First Quiz',
  'Çoktan seçmeli modda bir oyun tamamla.', 'Complete one Multiple Choice game.',
  'game_sessions_count', 1, 6,
  qw.id, qp.id, 'game', '{"game_mode":"multiple_choice"}'::jsonb, 2, 20
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-1'
UNION ALL
SELECT
  'flashcard-3', 'Kart Ustası', 'Card Master',
  '3 kelime kartı tekrar oturumu tamamla.', 'Complete 3 flashcard review sessions.',
  'study_sessions_count', 3, 7,
  qw.id, qp.id, 'flashcard', '{"study_type":"flashcard"}'::jsonb, 2, 25
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-1'
UNION ALL
SELECT
  'game-wordle-1', 'Kelime Bulmaca', 'Word Puzzle',
  'Kelime bulmaca modunda bir oyun tamamla.', 'Complete one word puzzle game.',
  'game_sessions_count', 1, 8,
  qw.id, qp.id, 'game', '{"game_mode":"wordle"}'::jsonb, 2, 20
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-1'
UNION ALL
SELECT
  'xp-2000', 'Yükselen Yıldız', 'Rising Star',
  'Toplam 2000 XP kazan.', 'Earn a total of 2000 XP.',
  'xp_total', 2000, 9,
  qw.id, qp.id, 'aggregate', NULL, 2, 50
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-1';

-- ---- Dünya 2 / Bölüm 1 — Temeller (order_index 10-13) ----
INSERT INTO public.quest_nodes
  (slug, title_tr, title_en, description_tr, description_en, requirement_type, requirement_count, order_index, world_id, part_id, content_type, content_ref, difficulty_index, reward_xp)
SELECT
  'grammar-tenses-1', 'Zamanları Keşfet', 'Discover Tenses',
  '"Geniş Zaman vs Şimdiki Zaman" konusundan pratik yap.', 'Practice the "Present Simple vs Continuous" topic.',
  'exam_topic_practice_count', 1, 10,
  qw.id, qp.id, 'grammar_topic', '{"grammar_topic_slug":"present-simple-vs-continuous","topic_tag":"present-simple-vs-continuous"}'::jsonb, 2, 20
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 1
WHERE qw.slug = 'world-2'
UNION ALL
SELECT
  'grammar-articles-1', 'Tanımlıkların Sırrı', 'The Secret of Articles',
  '"Tanımlıklar (a/an/the)" konusundan pratik yap.', 'Practice the "Articles (a/an/the)" topic.',
  'exam_topic_practice_count', 1, 11,
  qw.id, qp.id, 'grammar_topic', '{"grammar_topic_slug":"articles","topic_tag":"articles"}'::jsonb, 2, 20
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 1
WHERE qw.slug = 'world-2'
UNION ALL
SELECT
  'grammar-modals-1', 'Zorunluluklar', 'Obligations',
  '"Zorunluluk/Tavsiye Kipleri" konusundan pratik yap.', 'Practice the "Obligation/Advice Modals" topic.',
  'exam_topic_practice_count', 1, 12,
  qw.id, qp.id, 'grammar_topic', '{"grammar_topic_slug":"modals-obligation-advice","topic_tag":"modals-obligation-advice"}'::jsonb, 2, 20
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 1
WHERE qw.slug = 'world-2'
UNION ALL
SELECT
  'quiz-yds-10', 'YDS Isınma Turu', 'YDS Warm-up',
  'YDS alanında 10 soru cevapla.', 'Answer 10 questions in the YDS area.',
  'exam_questions_answered_count', 10, 13,
  qw.id, qp.id, 'quiz', '{"exam_type":"yds"}'::jsonb, 2, 30
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 1
WHERE qw.slug = 'world-2';

-- ---- Dünya 2 / Bölüm 2 — İleri Gramer (order_index 14-17) ----
INSERT INTO public.quest_nodes
  (slug, title_tr, title_en, description_tr, description_en, requirement_type, requirement_count, order_index, world_id, part_id, content_type, content_ref, difficulty_index, reward_xp)
SELECT
  'grammar-conditionals-1', 'Eğer Öyle Olsaydı', 'If That Were So',
  '"Sıfır ve Birinci Koşul Cümleleri" konusundan pratik yap.', 'Practice the "Zero and First Conditionals" topic.',
  'exam_topic_practice_count', 1, 14,
  qw.id, qp.id, 'grammar_topic', '{"grammar_topic_slug":"conditionals-zero-first","topic_tag":"conditionals-zero-first"}'::jsonb, 3, 25
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-2'
UNION ALL
SELECT
  'grammar-questions-1', 'Doğru Soruyu Sor', 'Ask the Right Question',
  '"Soru Sözcük Sırası" konusundan pratik yap.', 'Practice the "Question Word Order" topic.',
  'exam_topic_practice_count', 1, 15,
  qw.id, qp.id, 'grammar_topic', '{"grammar_topic_slug":"question-word-order","topic_tag":"question-word-order"}'::jsonb, 3, 25
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-2'
UNION ALL
SELECT
  'grammar-phrasal-1', 'Deyimsel Fiiller', 'Phrasal Verbs',
  '"Deyimsel Fiiller" konusundan pratik yap.', 'Practice the "Phrasal Verbs" topic.',
  'exam_topic_practice_count', 1, 16,
  qw.id, qp.id, 'grammar_topic', '{"grammar_topic_slug":"phrasal-verbs","topic_tag":"phrasal-verbs"}'::jsonb, 3, 25
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-2'
UNION ALL
SELECT
  'exam-mock-yds-1', 'İlk Deneme', 'First Mock Exam',
  'YDS alanında bir tam deneme sınavı tamamla.', 'Complete one full timed mock exam in the YDS area.',
  'exam_mock_completed_count', 1, 17,
  qw.id, qp.id, 'question_practice', '{"exam_type":"yds"}'::jsonb, 3, 50
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-2';

-- ---- Dünya 3 / Bölüm 1 — Arenaya Giriş (order_index 18-21) ----
INSERT INTO public.quest_nodes
  (slug, title_tr, title_en, description_tr, description_en, requirement_type, requirement_count, order_index, world_id, part_id, content_type, content_ref, difficulty_index, reward_xp)
SELECT
  'game-sprint-1', 'Hız Turu', 'Speed Round',
  'Hız modunda bir oyun tamamla.', 'Complete one Sprint mode game.',
  'game_sessions_count', 1, 18,
  qw.id, qp.id, 'game', '{"game_mode":"sprint"}'::jsonb, 3, 25
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 1
WHERE qw.slug = 'world-3'
UNION ALL
SELECT
  'game-listening-1', 'İyi Dinleyici', 'Good Listener',
  'Dinleme modunda bir oyun tamamla.', 'Complete one Listening mode game.',
  'game_sessions_count', 1, 19,
  qw.id, qp.id, 'game', '{"game_mode":"listening"}'::jsonb, 3, 25
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 1
WHERE qw.slug = 'world-3'
UNION ALL
SELECT
  'game-matching-1', 'Eşleştirme Ustası', 'Matching Master',
  'Eşleştirme modunda bir oyun tamamla.', 'Complete one Matching mode game.',
  'game_sessions_count', 1, 20,
  qw.id, qp.id, 'game', '{"game_mode":"matching"}'::jsonb, 3, 25
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 1
WHERE qw.slug = 'world-3'
UNION ALL
SELECT
  'duel-5', 'Arena Savaşçısı', 'Arena Warrior',
  '5 düello kazan.', 'Win 5 duels.',
  'duel_wins', 5, 21,
  qw.id, qp.id, 'duel', NULL, 3, 40
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 1
WHERE qw.slug = 'world-3';

-- ---- Dünya 3 / Bölüm 2 — Zirve (order_index 22-25) ----
INSERT INTO public.quest_nodes
  (slug, title_tr, title_en, description_tr, description_en, requirement_type, requirement_count, order_index, world_id, part_id, content_type, content_ref, difficulty_index, reward_xp)
SELECT
  'game-typing-1', 'Hızlı Parmaklar', 'Fast Fingers',
  'Yazma modunda bir oyun tamamla.', 'Complete one Typing mode game.',
  'game_sessions_count', 1, 22,
  qw.id, qp.id, 'game', '{"game_mode":"typing"}'::jsonb, 4, 25
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-3'
UNION ALL
SELECT
  'flashcard-10', 'Kart Şampiyonu', 'Card Champion',
  '10 kelime kartı tekrar oturumu tamamla.', 'Complete 10 flashcard review sessions.',
  'study_sessions_count', 10, 23,
  qw.id, qp.id, 'flashcard', '{"study_type":"flashcard"}'::jsonb, 4, 40
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-3'
UNION ALL
SELECT
  'duel-10', 'Arena Şampiyonu', 'Arena Champion',
  '10 düello kazan.', 'Win 10 duels.',
  'duel_wins', 10, 24,
  qw.id, qp.id, 'duel', NULL, 4, 75
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-3'
UNION ALL
SELECT
  'xp-5000', 'Efsane Yolunda', 'On the Path to Legend',
  'Toplam 5000 XP kazan.', 'Earn a total of 5000 XP.',
  'xp_total', 5000, 25,
  qw.id, qp.id, 'aggregate', NULL, 4, 100
FROM public.quest_worlds qw JOIN public.quest_parts qp ON qp.world_id = qw.id AND qp.part_index = 2
WHERE qw.slug = 'world-3';
