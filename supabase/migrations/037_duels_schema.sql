-- ============================================================
-- LEXIS — V2 Faz 3a: Gercek Zamanli Duello — sema temeli
-- Migration: 037_duels_schema.sql
-- ============================================================
-- V2 Yol Haritasi paragraf 6.3 (LEXIS_DEVIR notlari, 9-10 Eylul 2026):
-- Kahoot tarzi cok-kisili canli kelime duellosu icin sema temeli.
--
-- Mevcut public.challenges tablosu (016_social_messaging_and_challenges.sql)
-- 1v1 ASENKRON meydan okuma modeli -- her taraf kendi oynadigi BITMIS bir
-- game_session'i "sonucum bu" diye gonderiyor, backend skorlari
-- karsilastirip kazanani belirliyor. Bu, ayni anda birden fazla kisinin
-- AYNI ANDA CANLI katildigi bir oda modeline uymuyor (round bazli, sureli,
-- eszamanli soru-cevap gerektiriyor). Bu yuzden challenges'a DOKUNULMADI
-- (1v1 davet akisi icin oldugu gibi kaliyor), 4 YENI tablo eklendi: duels,
-- duel_participants, duel_rounds, duel_answers.
--
-- REALTIME NOTU: Bu kod tabaninda Supabase Realtime daha once hic
-- kullanilmamisti (mesajlasma bile polling ile calisiyor -- bkz. 016
-- migration'in kendi yorumu: "Polling ile okunuyor, Supabase Realtime YOK").
-- Bu migration SADECE durum/skor KALICILIGI semasini kurar -- canli
-- senkronizasyon (oyuncular arasi anlik guncelleme) backend'den degil,
-- istemcilerin Supabase Realtime broadcast/presence channel'lari
-- uzerinden yapilmasi planlaniyor (plan 6.3/3a). Broadcast/presence
-- entegrasyonu ve tam frontend akisi sonraki alt-fazlarin (3e) isi.
--
-- GUVENLIK KARARI — duel_rounds / duel_answers'a BILINCLI OLARAK genis bir
-- "select true" RLS policy'si EKLENMEDI (duels/duel_participants'in
-- aksine): duel_rounds.correct_option sutunu dogru cevabi iceriyor —
-- eger bu tablo herkese SELECT acik olsaydi, bir oyuncu soruyu gorur
-- gormez Supabase REST uzerinden dogrudan dogru cevabi okuyabilirdi
-- (hile). Bu iki tabloda HIC client policy'si yok (RLS acik, policy yok
-- = anon/authenticated icin tam kapali, sadece backend'in service-role
-- client'i okuyabilir) — round icerigi (soru+secenekler, dogru cevap
-- HARIC) ve cevap sonucu istemciye SADECE backend REST uclari
-- uzerinden verilmeli (mevcut games.py'deki next-word/attempt
-- desenindeki gibi dogru cevabin asla client'a onceden gonderilmemesi
-- ilkesiyle tutarli).
--
-- LIG NOTU: duels.league_id BILINCLI OLARAK bu migrationda YOK — plan
-- 6.3/Faz 3b'de leagues tablosu olusturulunca ayri bir migration ile
-- ALTER TABLE duels ADD COLUMN league_id ile eklenecek (henuz leagues
-- tablosu yokken dangling FK'dan kacinmak icin).
-- ============================================================

-- ============================================================
-- 1. duels — canli duello odasi
-- ============================================================
CREATE TABLE public.duels (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mode          public.game_mode NOT NULL DEFAULT 'multiple_choice',
    status        varchar(20) NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
    learning_lang varchar(10) NOT NULL REFERENCES public.languages(code),
    created_by    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    max_players   integer NOT NULL DEFAULT 8 CHECK (max_players BETWEEN 2 AND 20),
    round_count   integer NOT NULL DEFAULT 10 CHECK (round_count BETWEEN 1 AND 50),
    created_at    timestamptz NOT NULL DEFAULT now(),
    started_at    timestamptz,
    ended_at      timestamptz
);

CREATE INDEX duels_status_idx ON public.duels(status);
CREATE INDEX duels_created_by_idx ON public.duels(created_by);

ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

-- Bekleyen/aktif odalar TUM giris yapmis kullanicilara gorunur olmali ki
-- oda listesi / matchmaking ekrani calisabilsin — challenges'taki "sadece
-- taraflar gorebilir" desenden BILINCLI bir sapma. Icerikte hassas bir
-- sey yok (mod/durum/oyuncu sayisi).
CREATE POLICY "duels_select_all" ON public.duels
  FOR SELECT USING (true);

-- ============================================================
-- 2. duel_participants — odadaki oyuncular ve canli skorlari
-- ============================================================
CREATE TABLE public.duel_participants (
    duel_id    uuid NOT NULL REFERENCES public.duels(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score      integer NOT NULL DEFAULT 0,
    joined_at  timestamptz NOT NULL DEFAULT now(),
    left_at    timestamptz,
    PRIMARY KEY (duel_id, user_id)
);

CREATE INDEX duel_participants_user_idx ON public.duel_participants(user_id);

ALTER TABLE public.duel_participants ENABLE ROW LEVEL SECURITY;

-- Canli skor tablosu (Kahoot tarzi "leaderboard") — odadaki herkes
-- birbirinin skorunu gorebilmeli, hassas veri yok.
CREATE POLICY "duel_participants_select_all" ON public.duel_participants
  FOR SELECT USING (true);

-- ============================================================
-- 3. duel_rounds — her tur sorulan soru (dogru cevap DAHIL)
-- ============================================================
-- NOT: general_word_id NOT NULL — Faz 3a kapsaminda sadece
-- general_word_pool kaynakli sorular destekleniyor (games.py'deki
-- "general" pool_source desenle tutarli; oyuncunun kendi "words"
-- tablosundan soru uretimi, birden fazla oyuncu farkli kelime
-- listelerine sahip olacagi icin bu modelde anlamsiz).
CREATE TABLE public.duel_rounds (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    duel_id          uuid NOT NULL REFERENCES public.duels(id) ON DELETE CASCADE,
    round_index      integer NOT NULL,
    general_word_id  uuid NOT NULL REFERENCES public.general_word_pool(id),
    options          jsonb NOT NULL,
    correct_option   text NOT NULL,
    started_at       timestamptz,
    ends_at          timestamptz,
    CONSTRAINT duel_rounds_unique_index UNIQUE (duel_id, round_index)
);

CREATE INDEX duel_rounds_duel_idx ON public.duel_rounds(duel_id);

ALTER TABLE public.duel_rounds ENABLE ROW LEVEL SECURITY;
-- BILINCLI OLARAK hicbir client SELECT policy'si YOK (yukaridaki GUVENLIK
-- KARARI notuna bakiniz) — sadece supabase_admin (service-role, RLS'i
-- bypass eder) okuyabilir. Istemciler round icerigini backend REST
-- uclarindan alacak.

-- ============================================================
-- 4. duel_answers — oyuncularin round bazli cevaplari
-- ============================================================
CREATE TABLE public.duel_answers (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    duel_round_id   uuid NOT NULL REFERENCES public.duel_rounds(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    selected_option text,
    is_correct      boolean NOT NULL DEFAULT false,
    time_taken_ms   integer,
    answered_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT duel_answers_unique_per_user UNIQUE (duel_round_id, user_id)
);

CREATE INDEX duel_answers_round_idx ON public.duel_answers(duel_round_id);
CREATE INDEX duel_answers_user_idx ON public.duel_answers(user_id);

ALTER TABLE public.duel_answers ENABLE ROW LEVEL SECURITY;
-- BILINCLI OLARAK hicbir client SELECT policy'si YOK — bir oyuncunun
-- selected_option'i, round bitmeden once dogru cevabi ele verebilir
-- (baska bir oyuncu o satiri okuyup kopyalayabilir). Backend, round
-- bittikten SONRA sonuclari REST uzerinden (veya Realtime broadcast ile,
-- sonraki alt-fazda) yayinlayacak.
