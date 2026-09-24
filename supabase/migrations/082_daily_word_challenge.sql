-- 082_daily_word_challenge.sql
--
-- "Gunluk Kelime Avi" (24 Eylul 2026 -- kullanicinin onayladigi fikirlendirme
-- oturumu, Madde 2 secimi): her dil icin GUNDE BIR, TUM kullanicilara ortak
-- bir kelime secilir; herkes ayni kelimeyi BAGIMSIZ olarak (games.py'deki
-- tek-oyunculu wordle/adam asmaca modundaki AYNI harf-tahmin mekanigiyle)
-- cozmeye calisir. Amac: gunluk geri donus alaskanligi + paylasilabilir
-- sonuc (klasik Wordle'in sosyal paylasim mekanigi).
--
-- daily_word_challenges: gunun kelimesi, DILE gore (kullaniciya gore DEGIL)
-- tek satir -- cron tarafindan (generate_daily_word_challenges) gunde bir
-- doldurulur. `word` SADECE learning_lang'deki kelime metni -- anlam
-- (clue) burada TUTULMUYOR, cunku ayni learning_lang'i farkli native_lang'
-- larda ogrenen kullanicilar var; anlam istek anindaki kullanicinin
-- native_lang'ina gore general_word_pool'dan (word ILIKE eslesmesiyle)
-- AYRICA cekiliyor (bkz. daily_challenge_service.py).
CREATE TABLE public.daily_word_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_lang text NOT NULL,
    puzzle_date date NOT NULL,
    word text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (learning_lang, puzzle_date)
);

CREATE INDEX daily_word_challenges_lang_date_idx
    ON public.daily_word_challenges (learning_lang, puzzle_date);

-- GUVENLIK: duel_answers (076_duel_wordle_mode.sql) ile AYNI ilke -- bu
-- tabloda `word` dogrudan cozulecek kelimeyi tasir, bir client SELECT
-- policy'si kelimeyi harf tahmin etmeden once ifsa eder. O yuzden RLS
-- ACIK ama hicbir client policy TANIMLANMIYOR -- sadece service-role
-- (backend'in supabase_admin'i, RLS'i atlar) okuyup yazabilir.
ALTER TABLE public.daily_word_challenges ENABLE ROW LEVEL SECURITY;

-- daily_word_attempts: her kullanicinin O GUNKU kelimede BAGIMSIZ ilerlemesi
-- -- duel_answers.guessed_letters/wrong_guesses ile AYNI alan seti/deseni
-- (bkz. 076_duel_wordle_mode.sql), ama duello degil gunluk/tek-oyunculu
-- oldugu icin ayri bir tablo (bir duel_id'ye bagli degil).
CREATE TABLE public.daily_word_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id),
    learning_lang text NOT NULL,
    puzzle_date date NOT NULL,
    guessed_letters jsonb NOT NULL DEFAULT '[]'::jsonb,
    wrong_guesses integer NOT NULL DEFAULT 0,
    is_complete boolean NOT NULL DEFAULT false,
    is_failed boolean NOT NULL DEFAULT false,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, learning_lang, puzzle_date)
);

CREATE INDEX daily_word_attempts_user_idx ON public.daily_word_attempts (user_id);
CREATE INDEX daily_word_attempts_streak_idx
    ON public.daily_word_attempts (user_id, learning_lang, puzzle_date DESC);

-- Ayni GUVENLIK ilkesi: `guessed_letters`/`wrong_guesses` kendi basina
-- kelimeyi ifsa etmez ama daily_word_challenges.word ile JOIN edilip
-- (revealed pattern'i client-side yeniden hesaplanarak) kismi bilgi
-- cikarilabilir -- bu yuzden ayni sekilde SADECE service-role.
ALTER TABLE public.daily_word_attempts ENABLE ROW LEVEL SECURITY;

-- XP kurali (LEXIS_XP_YENI_KURALLAR.md): yeni source_type HEM Python
-- (xp_service.py::XPSourceType + XP_AMOUNTS) HEM DB enum'da tanimlanmali,
-- aksi halde award_xp() cagrisi 500/503 ile patlar (migration 038, 039,
-- 069, 071'deki tekrarlayan hata sinifi -- bu sefer TEK migration'da
-- ikisi birden yapiliyor).
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'daily_word_challenge';
