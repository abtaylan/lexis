-- 080_backfill_game_sessions_learning_lang.sql
--
-- 24 Eylul 2026 -- Adaptif Ogrenme Motoru Madde 1. games.py::create_session
-- game_sessions.learning_lang kolonunu hic yazmiyordu (uretimde son 30
-- gunun 202 oturumunun hicbirinde dolu degildi). level_assessment_service
-- oyun dogrulugunu bu kolona gore filtreledigi icin dinamik seviye
-- degerlendirmesi hic veri bulamiyordu. Kod duzeltildi; bu migration
-- GECMIS oturumlari doldurur:
--   1) Oturumdaki cevaplarin kelimesinin dili (general_word_pool.source_lang
--      ya da words.source_lang) -- en guvenilir kaynak.
--   2) Cevabi olmayan oturumlar icin kullanicinin profilindeki learning_lang.
-- Sadece NULL satirlara dokunur, tekrar calistirilmasi guvenlidir.

UPDATE public.game_sessions gs
SET learning_lang = sub.lang
FROM (
  SELECT ga.session_id,
         min(coalesce(g.source_lang, w.source_lang)) AS lang
  FROM public.game_attempts ga
  LEFT JOIN public.general_word_pool g ON g.id = ga.general_word_id
  LEFT JOIN public.words w ON w.id = ga.word_id
  GROUP BY ga.session_id
) sub
WHERE sub.session_id = gs.id
  AND gs.learning_lang IS NULL
  AND sub.lang IS NOT NULL
  AND sub.lang IN (SELECT code FROM public.languages);

UPDATE public.game_sessions gs
SET learning_lang = p.learning_lang
FROM public.profiles p
WHERE p.id = gs.user_id
  AND gs.learning_lang IS NULL
  AND p.learning_lang IN (SELECT code FROM public.languages);
