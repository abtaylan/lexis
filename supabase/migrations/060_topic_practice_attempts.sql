-- 060_topic_practice_attempts.sql
--
-- Gorev Haritasi v2 (10 Eylul 2026) -- content_type='grammar_topic'
-- dugumlerinin ilerlemesini olculebilir kilmak icin. exam-topic-practice
-- ekrani (bkz. backend/app/api/routes/exams.py::practice_questions_by_topic
-- ve web/src/app/(app)/exam-topic-practice/page.tsx) BILINCLI olarak
-- session/XP/exam_attempts YAZMIYOR (dusuk riskli, hizli pekistirme ekrani
-- olarak tasarlandi) -- bu tasarim DEGISMEDI. Bunun yerine, bu ekranda
-- cevaplanan sorular AYRI, hafif bir tabloya kaydedilir; Gorev Haritasi
-- SADECE bu tabloyu sayar (bkz. quests.py::_evaluate_requirement,
-- 'exam_topic_practice_count'). XP/session akisina hicbir etkisi yok.

CREATE TABLE public.topic_practice_attempts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    topic_tag   text NOT NULL,
    question_id uuid REFERENCES public.exam_questions(id) ON DELETE SET NULL,
    is_correct  boolean NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX topic_practice_attempts_user_topic_idx
    ON public.topic_practice_attempts(user_id, topic_tag);

ALTER TABLE public.topic_practice_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topic_practice_attempts_select_own"
    ON public.topic_practice_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "topic_practice_attempts_insert_own"
    ON public.topic_practice_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);
