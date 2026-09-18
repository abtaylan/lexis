-- 079_user_level_tracking.sql
--
-- Kullanici istegi (18 Eylul 2026): "kisinin seviyesi artabilir de
-- azalabilir de, belirli araliklarla bu durumu analiz etmek lazim ona gore
-- diger seviyelerden kelimelere calismasi gerekecek. Bunun icin bir yontem
-- gelistirmelisin."
--
-- placement_level (078_placement_level.sql) sadece TEK SEFERLIK, degismez
-- bir "baslangic noktasi" kaydidir -- seviye tespit sinavi sonucudur.
-- Bu migration AYRI ve YASAYAN bir deger ekliyor: current_level -- periyodik
-- olarak (bkz. backend/app/services/level_assessment_service.py ve
-- backend/reassess_user_levels.py) kullanicinin SON zamandaki oyun/pratik
-- performansina gore yukari VEYA asagi guncellenir. current_level, kelime
-- pratigi icin hangi zorluk bandindan (general_word_pool.difficulty_level)
-- kelime secilecegini yonlendirir (bkz. games.py::next_word).
--
-- current_level baslangicta placement_level ile AYNI deger olarak set edilir
-- (bkz. exams.py::_store_placement_level) -- yani "baslangic" ve "su anki"
-- ayni noktadan baslar, zamanla birbirinden ayrisabilir.
ALTER TABLE public.user_learning_languages
  ADD COLUMN IF NOT EXISTS current_level text,
  ADD COLUMN IF NOT EXISTS level_last_assessed_at timestamptz;

ALTER TABLE public.user_learning_languages
  ADD CONSTRAINT user_learning_languages_current_level_check
  CHECK (current_level IS NULL OR current_level IN ('a1','a2','b1','b2','c1','c2'));

-- Seviye ilerlemesi/gerilemesi GECMISI -- kullanici istegi "raporlarda da
-- eklensin, gelisim surecinde her rapor alisinda seviye ilerlemesini de
-- gormus olur" -- bu tablo olmadan sadece "su anki seviye" gorulebilirdi,
-- "ne zaman yukseldi/dustu" bilgisi kaybolurdu. user_report_service.py bu
-- tablodan kullanicinin son degisikligini okuyup rapora ekleyebilir.
CREATE TABLE public.user_level_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  learning_lang varchar NOT NULL REFERENCES public.languages(code),
  level text NOT NULL CHECK (level IN ('a1','a2','b1','b2','c1','c2')),
  previous_level text CHECK (previous_level IS NULL OR previous_level IN ('a1','a2','b1','b2','c1','c2')),
  direction text NOT NULL CHECK (direction IN ('up','down','initial')),
  source text NOT NULL, -- 'placement_exam' | 'periodic_reassessment'
  assessed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_level_history_user_lang_idx
  ON public.user_level_history(user_id, learning_lang, assessed_at DESC);

ALTER TABLE public.user_level_history ENABLE ROW LEVEL SECURITY;

-- Guvenlik: duel_answers/exam_questions ile AYNI ilke -- hicbir client
-- SELECT/INSERT policy'si yok, sadece service-role (backend) yazip okuyor.
-- Kullaniciya bu veri user_report_service.py uzerinden, backend'in kendi
-- yetkilendirme kontrolleriyle (sadece kendi raporu) sunuluyor.
COMMENT ON TABLE public.user_level_history IS
  'Periyodik seviye yeniden degerlendirme gecmisi (bkz. backend/app/services/level_assessment_service.py). Sadece service-role erisimi -- RLS policy yok, bilincli.';
