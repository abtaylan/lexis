-- supabase/migrations/056_custom_leagues.sql
--
-- V2 Faz 3 devami (10 Eylul 2026 kullanici istegi): "Ek olarak kendi
-- arkadaslarimdan olusan ozel lig kurup kendi aramizda yarisabilmeliyim.
-- Lig sayfasina girince Duello'da oldugu gibi yeni oda ac mantiginda
-- bir buton olacak, butona tiklayinca, oraya kendi arkadaslarimi ve
-- sistemde bulunan diger user'lari ekleyebilmeliyim." Kademe (tier)
-- lig sisteminden (migration 041+) TAMAMEN BAGIMSIZ, botsuz, haftalik
-- donguye tabi olmayan kucuk bir "arkadas ligi". duel_invites (050) ile
-- BIREBIR ayni oda/davet deseni -- bkz. backend/app/api/routes/
-- custom_leagues.py modul docstring'i.
-- ============================================================

CREATE TABLE public.custom_leagues (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name         varchar(60) NOT NULL,
    created_by   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    max_members  integer NOT NULL DEFAULT 20,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX custom_leagues_created_by_idx ON public.custom_leagues(created_by);

ALTER TABLE public.custom_leagues ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.custom_league_members (
    league_id  uuid NOT NULL REFERENCES public.custom_leagues(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (league_id, user_id)
);

CREATE INDEX custom_league_members_user_idx ON public.custom_league_members(user_id);

ALTER TABLE public.custom_league_members ENABLE ROW LEVEL SECURITY;

-- Ozel lig verisi kademe ligleri gibi HERKESE ACIK degil (bkz. modul
-- docstring'i, "sadece uyeleri gorebilir") -- SELECT sadece ayni ligin
-- BASKA bir uyesi oldugunda serbest (kendi kendine referans veren ama
-- Postgres'te standart/guvenli bir desen -- "takim uyeligi" RLS'i).
CREATE POLICY "custom_league_members_select_own_leagues" ON public.custom_league_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.custom_league_members m2
      WHERE m2.league_id = custom_league_members.league_id AND m2.user_id = auth.uid()
    )
  );

CREATE POLICY "custom_leagues_select_members" ON public.custom_leagues
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.custom_league_members m
      WHERE m.league_id = id AND m.user_id = auth.uid()
    )
  );

CREATE TABLE public.custom_league_invites (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id     uuid NOT NULL REFERENCES public.custom_leagues(id) ON DELETE CASCADE,
    inviter_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status        varchar(10) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    responded_at  timestamptz,
    CONSTRAINT custom_league_invites_not_self CHECK (inviter_id <> invitee_id)
);

-- Ayni kullaniciya ayni lig icin ayni anda BIRDEN FAZLA bekleyen davet
-- gitmesin (duel_invites'ta olmayan, custom_leagues.py'nin kendi
-- kontrolune EK bir DB-seviyesi guvenlik agi -- partial unique index,
-- SADECE 'pending' durumundaki satirlarda gecerli).
CREATE UNIQUE INDEX custom_league_invites_unique_pending
  ON public.custom_league_invites(league_id, invitee_id)
  WHERE status = 'pending';

CREATE INDEX custom_league_invites_invitee_idx ON public.custom_league_invites(invitee_id);
CREATE INDEX custom_league_invites_inviter_idx ON public.custom_league_invites(inviter_id);
CREATE INDEX custom_league_invites_league_idx ON public.custom_league_invites(league_id);

ALTER TABLE public.custom_league_invites ENABLE ROW LEVEL SECURITY;

-- duel_invites_select_involved (050) ile BIREBIR ayni ilke.
CREATE POLICY "custom_league_invites_select_involved" ON public.custom_league_invites
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
