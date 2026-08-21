-- ============================================================
-- LEXIS — Madde 6, Faz 2 + Faz 3: Mesajlaşma, Engelleme, Meydan Okuma
-- Migration: 016_social_messaging_and_challenges.sql
-- ============================================================
-- Bu migration Madde 6'nın kalan üç parçası için 4 tablo ekler:
--   1) blocks        — tek yönlü engelleme (Faz 2). Karşılıklı kontrol
--                       backend'de yapılıyor (her iki yön de kontrol
--                       edilir), tablo tek satır tutar.
--   2) conversations  — iki kullanıcı arası mesajlaşma oturumu (Faz 2).
--                       friendships'teki LEAST/GREATEST normalize deseniyle
--                       aynı — aynı çift için tek satır garanti edilir.
--   3) messages       — conversations'a bağlı tekil mesajlar (Faz 2).
--                       Polling ile okunuyor, Supabase Realtime YOK
--                       (bu kod tabanında hiç realtime emsali yok).
--   4) challenges     — arkadaşlar arası oyun meydan okuması (Faz 3).
--                       Yeni bir oyun akışı YOK — mevcut game_sessions
--                       tablosunu kullanıyor: her taraf kendi oynadığı
--                       bitmiş bir game_session'ı "sonucum bu" diye
--                       gönderiyor (submit-score), backend skorları
--                       karşılaştırıp kazananı belirliyor.
--
-- Not: 015_social_friends.sql'deki desenle aynı — RLS sadece SELECT için
-- var (ilgili taraflar kendi satırlarını görebilir), tüm INSERT/UPDATE/
-- DELETE backend'in service-role client'ı (supabase_admin) üzerinden
-- yapılıyor, RLS'te yazma policy'si yok.

-- ============================================================
-- 1. blocks — tek yönlü engelleme
-- ============================================================
CREATE TABLE public.blocks (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT blocks_not_self CHECK (blocker_id <> blocked_id),
    CONSTRAINT blocks_unique_pair UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX blocks_blocker_idx ON public.blocks(blocker_id);
CREATE INDEX blocks_blocked_idx ON public.blocks(blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Sadece engelleyen kendi engelleme listesini görebilir — engellenen
-- tarafın kimin kendisini engellediğini görmesine gerek yok (mahremiyet).
CREATE POLICY "blocks_select_own" ON public.blocks
  FOR SELECT USING (auth.uid() = blocker_id);

-- ============================================================
-- 2. conversations — iki kullanıcı arası mesajlaşma oturumu
-- ============================================================
CREATE TABLE public.conversations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    last_message_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT conversations_not_self CHECK (user_a_id <> user_b_id)
);

-- Aynı iki kullanıcı arasında her zaman tek konuşma satırı — yön farketmez
-- (A,B) ile (B,A) aynı sayılır. Backend her zaman user_a_id/user_b_id'yi
-- LEAST/GREATEST ile normalize ederek insert eder (messaging_service.py).
CREATE UNIQUE INDEX conversations_unique_pair_idx
  ON public.conversations (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id));

CREATE INDEX conversations_user_a_idx ON public.conversations(user_a_id);
CREATE INDEX conversations_user_b_idx ON public.conversations(user_b_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_involved" ON public.conversations
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- ============================================================
-- 3. messages — conversations'a bağlı tekil mesajlar
-- ============================================================
CREATE TABLE public.messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body            text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    read_at         timestamptz
);

CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at);
CREATE INDEX messages_sender_idx ON public.messages(sender_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_involved" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.user_a_id OR auth.uid() = c.user_b_id)
    )
  );

-- ============================================================
-- 4. challenges — arkadaşlar arası oyun meydan okuması
-- ============================================================
-- public.game_mode enum'u 006_xp_and_games.sql'de zaten tanımlı
-- (wordle/multiple_choice/typing/matching/listening/sprint) — burada
-- tekrar oluşturulmuyor, doğrudan referans veriliyor.
CREATE TABLE public.challenges (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    challenged_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mode                   public.game_mode NOT NULL,
    status                 varchar(20) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
    challenger_session_id  uuid REFERENCES public.game_sessions(id),
    challenged_session_id  uuid REFERENCES public.game_sessions(id),
    winner_id              uuid REFERENCES public.profiles(id),
    created_at             timestamptz NOT NULL DEFAULT now(),
    responded_at           timestamptz,
    completed_at           timestamptz,
    CONSTRAINT challenges_not_self CHECK (challenger_id <> challenged_id)
);

CREATE INDEX challenges_challenger_idx ON public.challenges(challenger_id);
CREATE INDEX challenges_challenged_idx ON public.challenges(challenged_id);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_select_involved" ON public.challenges
  FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);
