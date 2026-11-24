-- Migration: add structured breakdown column to grammar_topics
-- Behçet'in kullanıcı isteği (24 Kasım 2026, 5. tur): "Sınav Taktikleri
-- sayfasının görsel yapısının aynısını ... Gramer Rehberi sayfasında da
-- istiyorum". exam_tactics.breakdown ile AYNI TacticBreakdown şeması
-- (intro + items[] + examples[], 9 etiketlik markup dili) kullanılıyor.
-- Nullable: mevcut rule_content_md / example_sentences / common_mistakes
-- düz-metin görünümü breakdown doluncaya kadar korunuyor.

ALTER TABLE public.grammar_topics
  ADD COLUMN IF NOT EXISTS breakdown jsonb;
