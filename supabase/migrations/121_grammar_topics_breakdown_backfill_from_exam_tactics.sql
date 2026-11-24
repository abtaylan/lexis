-- Migration: backfill grammar_topics.breakdown from exam_tactics.breakdown
--
-- Her grammar_topics (learning_lang='en', status='published') satırının
-- exam_tactics tablosunda topic_tag = slug eşleşmesiyle TAM BİR 1:1
-- karşılığı var (91/91 doğrulandı, hiç kopya topic_tag yok) ve o
-- exam_tactics satırları zaten zengin, markup etiketli breakdown içeriğine
-- sahip (bkz. migration 106-119). Aynı gramer kuralını anlatan iki ayrı
-- metin yazmak yerine, Gramer Rehberi aynı içeriği exam_tactics'ten
-- devralıyor -- tek doğruluk kaynağı (single source of truth) ve
-- "Sınav Taktikleri" ile BİREBİR aynı görsel/tema sonucu.
UPDATE public.grammar_topics g
SET breakdown = t.breakdown
FROM public.exam_tactics t
WHERE t.topic_tag = g.slug
  AND g.learning_lang = 'en'
  AND g.status = 'published'
  AND t.breakdown IS NOT NULL;
