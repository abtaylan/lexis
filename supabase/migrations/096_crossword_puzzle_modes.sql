-- 096_crossword_puzzle_modes.sql
--
-- Cengel bulmacayi UC MODA cikariyor (23 Kasim 2026 kullanici istegi:
-- "bu oyunu cesitlendirecez ... bulmacaya girince 3 secenek olacak"):
--   standard  -> (mevcut davranis) ana dildeki ipucundan ogrenilen dildeki
--                kelimeyi bul
--   reverse   -> ogrenilen dildeki kelimenin KENDISI ipucu, ana dildeki
--                karsiligini bulmaya calisirsin
--   own_pool  -> kullanicinin KENDI 'words' (Kelimelerim) listesinden --
--                genel havuzdan farkli olarak PAYLASILAN/ONBELLEKLI DEGIL,
--                HER KULLANICIYA OZEL uretilir (bkz. crossword_service.py
--                get_or_create_puzzle)
--
-- standard/reverse icin bulmacalar ESKISI GIBI (learning_lang, native_lang,
-- level, mode) basina TEK, PAYLASILAN bir satir (user_id NULL) -- herkes
-- ayni bulmacayi cozer (095'teki tasarimla ayni emsal). own_pool icin ise
-- (..., mode='own_pool', user_id=<kullanici>) basina AYRI bir satir --
-- cunku iki kullanicinin kendi kelime listesi farkli olur.

ALTER TABLE public.crossword_puzzles
    ADD COLUMN IF NOT EXISTS mode varchar NOT NULL DEFAULT 'standard'
        CHECK (mode IN ('standard', 'reverse', 'own_pool')),
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.crossword_puzzles
    DROP CONSTRAINT IF EXISTS crossword_puzzles_learning_lang_native_lang_level_key;
ALTER TABLE public.crossword_puzzles
    ADD CONSTRAINT crossword_puzzles_unique_combo
        UNIQUE (learning_lang, native_lang, level, mode, user_id);

-- own_pool DISINDAKI moddaki satirlarda user_id HER ZAMAN NULL olmali
-- (paylasilan/herkese acik katalog); own_pool'da ise HER ZAMAN dolu olmali
-- (kime ait oldugu belirsiz, "paylasilan" bir own_pool satiri olamaz).
ALTER TABLE public.crossword_puzzles
    ADD CONSTRAINT crossword_puzzles_user_id_matches_mode
        CHECK ((mode = 'own_pool') = (user_id IS NOT NULL));

-- Kelime kaynagi artik iki tabloda biri olabilir: genel havuz
-- (general_word_id, standard/reverse) veya kullanicinin kendi listesi
-- (user_word_id, own_pool) -- tam olarak biri dolu olmali.
ALTER TABLE public.crossword_puzzle_words
    ALTER COLUMN general_word_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS user_word_id uuid REFERENCES public.words(id) ON DELETE CASCADE;
ALTER TABLE public.crossword_puzzle_words
    ADD CONSTRAINT crossword_puzzle_words_exactly_one_source
        CHECK ((general_word_id IS NOT NULL) <> (user_word_id IS NOT NULL));

ALTER TABLE public.user_crossword_progress
    ADD COLUMN IF NOT EXISTS mode varchar NOT NULL DEFAULT 'standard'
        CHECK (mode IN ('standard', 'reverse', 'own_pool'));

ALTER TABLE public.user_crossword_progress
    DROP CONSTRAINT IF EXISTS user_crossword_progress_user_id_learning_lang_key;
ALTER TABLE public.user_crossword_progress
    ADD CONSTRAINT user_crossword_progress_unique_combo
        UNIQUE (user_id, learning_lang, mode);

-- RLS: standard/reverse (user_id NULL) herkese acik kalir (095'teki emsalle
-- ayni -- vocab icerigi "gizli cevap" degil ogrenme materyali). own_pool ise
-- SADECE sahibine gorunur -- kisinin kendi kelime listesinden turetildigi
-- icin baskasina acik olmamali.
DROP POLICY IF EXISTS "Anyone can view crossword_puzzles" ON public.crossword_puzzles;
CREATE POLICY "View shared or own crossword_puzzles"
    ON public.crossword_puzzles FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view crossword_puzzle_words" ON public.crossword_puzzle_words;
CREATE POLICY "View shared or own crossword_puzzle_words"
    ON public.crossword_puzzle_words FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.crossword_puzzles cp
            WHERE cp.id = crossword_puzzle_words.puzzle_id
              AND (cp.user_id IS NULL OR cp.user_id = auth.uid())
        )
    );
