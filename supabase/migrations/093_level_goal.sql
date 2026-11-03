-- 093_level_goal.sql
--
-- Kullanici istegi (3 Kasim 2026): Ana sayfada, hem web hem mobilde,
-- "ana seviye durumumuz" (current_level) -> "ulasmak istedigimiz seviye"
-- arasinda yuzdesel bir ilerleme gostergesi. Bu yuzde haftalik seviye
-- sinavlari + oyun puanlari + calisma programi ilerlemesine gore
-- hesaplaniyor (bkz. backend/app/services/level_goal_service.py).
--
-- target_level, current_level/placement_level (078/079) ile AYNI desende:
-- user_learning_languages'e eklendi (profiles'a degil) cunku kullanici
-- birden fazla dil ogreniyor olabilir, her dilin kendi hedefi olmali.
-- Baslangicta NULL -- kullanici ana sayfadaki widget'tan secmeden once
-- hesaplanacak bir "yuzde" yok (bkz. level_goal_service.py::needs_target).
ALTER TABLE public.user_learning_languages
  ADD COLUMN IF NOT EXISTS target_level text,
  ADD COLUMN IF NOT EXISTS target_level_set_at timestamptz;

ALTER TABLE public.user_learning_languages
  ADD CONSTRAINT user_learning_languages_target_level_check
  CHECK (target_level IS NULL OR target_level IN ('a1','a2','b1','b2','c1','c2'));
