-- 095_crossword_puzzle_mode.sql
--
-- Cengel bulmaca (hook crossword) oyun modu -- 18 Kasim 2026, kullanici
-- istegi: "bulmaca seviyelerden olussun, hangi seviyede olunursa olunsun
-- en baslangic seviyeden ilerlensin, gittikce zorlassin... level1 level2
-- gibi bulmacalarin isimleri olsun, 1-50 baslangic, 51-100 orta, 101-150
-- ileri, 151-200 advance".
--
-- Tasarim: SABIT 200 seviyelik, (learning_lang, native_lang) basina
-- paylasilan bir katalog -- herkes ayni "Level 42"yi cozuyor (Wordle'in
-- gunluk bulmacasi gibi, ama sabit bir ilerleme dizisi). Bulmacalar lazy
-- uretiliyor: bir (learning_lang, native_lang, level) ucluesu ilk
-- istendiginde app/services/crossword_service.py uretip buraya yaziyor,
-- sonraki istekler ayni satiri okuyor. Her kullanicinin kendi ilerlemesi
-- (su an hangi seviyede oldugu) user_crossword_progress'te, genel kelime
-- seviyesinden (user_learning_languages.current_level) BAGIMSIZ -- kullanici
-- ne kadar ileri duzey olursa olsun bulmacada 1'den basliyor.
--
-- Zorluk kademesi general_word_pool.difficulty_level (beginner/
-- intermediate/advanced -- 3 kademe) bandindan besleniyor, 4 UI kademesine
-- eslenir (Ileri ve Advance ayni DB bandini -- advanced -- kullanir, Advance
-- daha fazla kelime/daha buyuk grid ile daha zor hale getirilir; bkz.
-- crossword_service.py TIER_TABLE):
--   1-50    Baslangic  -> beginner
--   51-100  Orta       -> intermediate
--   101-150 Ileri      -> advanced (kucuk bulmaca)
--   151-200 Advance    -> advanced (buyuk bulmaca)
--
-- Guvenlik notu: general_word_pool (006_xp_and_games.sql) zaten word+meaning
-- icin herkese acik SELECT RLS politikasi tasiyor (vocab icerigi "gizli
-- cevap" olarak degil ogrenme materyali olarak ele aliniyor) -- asagidaki
-- crossword_puzzle_words da AYNI emsali takip eder, cevap metnini (answer)
-- gizlemeye calismaz.

CREATE TABLE IF NOT EXISTS public.crossword_puzzles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_lang varchar NOT NULL REFERENCES public.languages(code),
    native_lang varchar NOT NULL REFERENCES public.languages(code),
    level int NOT NULL CHECK (level BETWEEN 1 AND 200),
    tier varchar NOT NULL CHECK (tier IN ('beginner', 'intermediate', 'advanced', 'expert')),
    grid_width int NOT NULL,
    grid_height int NOT NULL,
    word_count int NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (learning_lang, native_lang, level)
);

CREATE TABLE IF NOT EXISTS public.crossword_puzzle_words (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    puzzle_id uuid NOT NULL REFERENCES public.crossword_puzzles(id) ON DELETE CASCADE,
    general_word_id uuid NOT NULL REFERENCES public.general_word_pool(id),
    clue_text text NOT NULL,
    answer varchar NOT NULL,
    row_start int NOT NULL,
    col_start int NOT NULL,
    direction varchar NOT NULL CHECK (direction IN ('across', 'down')),
    answer_length int NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crossword_puzzle_words_puzzle
    ON public.crossword_puzzle_words(puzzle_id);

CREATE TABLE IF NOT EXISTS public.user_crossword_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    learning_lang varchar NOT NULL REFERENCES public.languages(code),
    current_level int NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 200),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, learning_lang)
);

CREATE TABLE IF NOT EXISTS public.user_crossword_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    puzzle_id uuid NOT NULL REFERENCES public.crossword_puzzles(id) ON DELETE CASCADE,
    solved_word_ids uuid[] NOT NULL DEFAULT '{}',
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, puzzle_id)
);

-- XP kaynak tipleri (app/services/xp_service.py::XPSourceType ile BIRLIKTE
-- guncellenmeli -- aksi halde award_xp() 500/503 verir, kural zaten
-- lexis.md'de kayitli).
ALTER TYPE xp_source_type ADD VALUE IF NOT EXISTS 'game_crossword_word';
ALTER TYPE xp_source_type ADD VALUE IF NOT EXISTS 'game_crossword_complete';

ALTER TABLE public.crossword_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crossword_puzzle_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_crossword_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_crossword_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view crossword_puzzles"
    ON public.crossword_puzzles FOR SELECT USING (true);
CREATE POLICY "Anyone can view crossword_puzzle_words"
    ON public.crossword_puzzle_words FOR SELECT USING (true);
CREATE POLICY "Users manage own crossword progress"
    ON public.user_crossword_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own crossword sessions"
    ON public.user_crossword_sessions FOR ALL USING (auth.uid() = user_id);
