-- 102_tactic_source_type_constraint.sql
-- 24 Kasim 2026 -- Behcet'in kullanici istegi: haftalik/aylik taktik
-- sinavlarindaki sorularin oncelikle "Sinav Taktikleri" bolumu icin
-- hazirlanan sorulardan secilebilmesi icin exam_questions.source_type
-- degerine 'tactic' eklenir (bkz. 103_tactic_exam_questions.sql).
ALTER TABLE public.exam_questions DROP CONSTRAINT exam_questions_source_type_check;
ALTER TABLE public.exam_questions ADD CONSTRAINT exam_questions_source_type_check
  CHECK (source_type = ANY (ARRAY['system'::text, 'user'::text, 'ai'::text, 'tactic'::text]));
