-- Migration 062: Kelime bazinda dogru/yanlis tahmin istatistikleri
-- Istatistik & Raporlama (V2 oncelik #2) - Faz 1: temel gorunumler
--
-- exam_question_stats view'ina (bkz. exam_prep_stats_and_content migration'i) paralel
-- olarak, kelime tahmin dogrulugu icin iki ayri view olusturur:
--   - system_word_stats: general_word_pool'daki (sistem kelime havuzu) her kelime icin,
--     TUM kullanicilarin oyun denemelerine (game_attempts.general_word_id) dayanan
--     GLOBAL dogruluk orani -- ulke/genel ozet raporlari icin.
--   - user_word_stats: words tablosundaki (kullanicinin kendi SRS kartlari / eklediği
--     kelimeler) her kayit icin, o kullaniciya ait game_attempts.word_id denemelerine
--     dayanan KISISEL dogruluk orani -- kullanici profili / zayif-guclu yon raporlari icin.
--
-- Segmentasyon notu: exam_questions = "sistem sorulari", general_word_pool = "sistem
-- kelimeleri", words = "kullanicinin kendi kelimeleri" (3'lu segmentasyonun kelime/soru
-- ayagi boylece tamamlanmis olur).

CREATE OR REPLACE VIEW system_word_stats AS
SELECT
  gwp.id AS general_word_id,
  gwp.word,
  gwp.source_lang,
  gwp.target_lang,
  gwp.difficulty_level,
  COALESCE(a.total_attempts, 0::bigint) AS total_attempts,
  COALESCE(a.correct_count, 0::bigint) AS correct_count,
  COALESCE(a.wrong_count, 0::bigint) AS wrong_count,
  CASE
    WHEN COALESCE(a.total_attempts, 0::bigint) = 0 THEN NULL::numeric
    ELSE round(a.correct_count::numeric / a.total_attempts::numeric, 4)
  END AS accuracy_ratio
FROM general_word_pool gwp
LEFT JOIN (
  SELECT
    game_attempts.general_word_id,
    count(*) AS total_attempts,
    count(*) FILTER (WHERE game_attempts.is_correct) AS correct_count,
    count(*) FILTER (WHERE NOT game_attempts.is_correct) AS wrong_count
  FROM game_attempts
  WHERE game_attempts.general_word_id IS NOT NULL
  GROUP BY game_attempts.general_word_id
) a ON a.general_word_id = gwp.id;

CREATE OR REPLACE VIEW user_word_stats AS
SELECT
  w.id AS word_id,
  w.user_id,
  w.word,
  w.source_lang,
  w.target_lang,
  w.status,
  w.list_type,
  COALESCE(a.total_attempts, 0::bigint) AS total_attempts,
  COALESCE(a.correct_count, 0::bigint) AS correct_count,
  COALESCE(a.wrong_count, 0::bigint) AS wrong_count,
  CASE
    WHEN COALESCE(a.total_attempts, 0::bigint) = 0 THEN NULL::numeric
    ELSE round(a.correct_count::numeric / a.total_attempts::numeric, 4)
  END AS accuracy_ratio
FROM words w
LEFT JOIN (
  SELECT
    game_attempts.word_id,
    count(*) AS total_attempts,
    count(*) FILTER (WHERE game_attempts.is_correct) AS correct_count,
    count(*) FILTER (WHERE NOT game_attempts.is_correct) AS wrong_count
  FROM game_attempts
  WHERE game_attempts.word_id IS NOT NULL
  GROUP BY game_attempts.word_id
) a ON a.word_id = w.id;
