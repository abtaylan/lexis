-- Migration: add structured breakdown column to exam_tactics
-- Stores the rich, markup-tagged "Sınav Taktikleri" card content (TacticBreakdown
-- JSON shape: intro, items[], examples[]) used by the mobile/web ExamTacticCard
-- components. Nullable so existing rows keep rendering via the legacy plain-text
-- fields (tactic_tr / worked_example_tr / examples_tr) until backfilled.

ALTER TABLE public.exam_tactics
  ADD COLUMN IF NOT EXISTS breakdown jsonb;
