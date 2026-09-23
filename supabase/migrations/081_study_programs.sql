-- 081_study_programs.sql
--
-- 24 Eylul 2026 -- Adaptif Ogrenme Motoru Madde 2: haftalik, ROLLING genel
-- calisma programi (gramer + kelime birlesik). study_schedule/
-- schedule_templates kullanicinin ELLE doldurdugu saat/gun cizelgesidir
-- (hatirlatici amacli) -- otomatik uretilen icerik programi icin uygun
-- degil, bu yuzden ayri tablo.
--
-- Her kullanici + ogrenilen dil + hafta (Pazartesi, Turkiye saati) icin
-- TEK satir. Satir o haftanin ilk ziyaretinde uretilir (bkz.
-- backend/app/services/study_program_service.py) ve hafta boyunca sabit
-- kalir; ilerleme (yapilan pratik, kelime hedefi) her istekte canli
-- hesaplanir. Bir sonraki hafta guncel performansla YENIDEN uretilir.
CREATE TABLE IF NOT EXISTS public.study_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  learning_lang varchar NOT NULL REFERENCES public.languages(code),
  week_start date NOT NULL,
  level text CHECK (level IS NULL OR level IN ('a1','a2','b1','b2','c1','c2')),
  focus_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_new_word_goal integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, learning_lang, week_start)
);

CREATE INDEX IF NOT EXISTS study_programs_user_idx
  ON public.study_programs(user_id, learning_lang, week_start DESC);

-- Guvenlik: user_level_history ile ayni ilke -- client policy yok, sadece
-- service-role (backend) okuyup yaziyor.
ALTER TABLE public.study_programs ENABLE ROW LEVEL SECURITY;

-- topic_practice_attempts hic dil tasimiyordu; program ilerlemesi ve zayif
-- konu tespiti dil bazinda yapildigi icin question_id uzerinden
-- exam_questions.learning_lang'e join edilir -- ek kolon gerekmez.
COMMENT ON TABLE public.study_programs IS
  'Haftalik rolling calisma programi (Adaptif Ogrenme Motoru Madde 2). Sadece service-role erisimi.';
