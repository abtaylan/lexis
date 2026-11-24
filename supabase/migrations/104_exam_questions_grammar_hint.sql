-- 104_exam_questions_grammar_hint.sql
-- 24 Kasim 2026 -- Behcet'in kullanici istegi: "soru pratigi yaparken,
-- sorularin uzerinde hic bilgi yok, hangi tense kullanilmis, cumle
-- grammer yapisi ne olmali, boslugua gelecek cevap turu ne olmali, neden
-- o tur secilmeli gibi, bu bilgileri pratik yapilan sorularda gormeliyim,
-- bunlar antrenman sorulari olacak bizim icin."
--
-- Soruyu cevaplamadan ONCE gosterilecek yapisal ipucu (dogru sikki
-- DOGRUDAN soylemez -- bkz. backend app/schemas/exams.py::GrammarHintItem):
--   { "tense_tr": "...", "structure_tr": "...", "blank_type_tr": "...", "reasoning_tr": "..." }
ALTER TABLE public.exam_questions ADD COLUMN IF NOT EXISTS grammar_hint jsonb;

COMMENT ON COLUMN public.exam_questions.grammar_hint IS
  'Soru cevaplanmadan once gosterilen yapisal gramer ipucu (tense_tr/structure_tr/blank_type_tr/reasoning_tr) -- dogru sikki acik etmez. Bkz. GrammarHintItem.';
