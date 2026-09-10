-- ============================================================
-- LEXIS — V2 Faz 3b: Lig sistemi — şema temeli
-- Migration: 041_leagues_schema.sql
-- ============================================================
-- V2 Yol Haritası §6.3/Faz 3b. Duolingo tarzı haftalık kademe (tier)
-- ligleri: her kullanıcı bir kademede (bronze→master), o kademedeki
-- ~30 kişilik bir "leagues" grubunda (o haftaya özel), o hafta
-- KAZANDIĞI XP'ye göre sıralanır (xp_events'ten CANLI hesaplanır —
-- league_memberships'te ayrı bir sayaç TUTULMUYOR, sync hatası riski
-- olmasın diye, bkz. xp_source_type enum'undaki tekrarlanan hata —
-- bugün bu oturumda 2 kez düzeltildi). Hafta bitince final_xp/final_rank
-- DONDURULUR ve kademe terfi/düşme uygulanır (SQL: rollover script'i,
-- bkz. expire_premium.py / distribute_leaderboard_rewards.py deseniyle
-- AYNI — Claude scheduled task + Supabase MCP SQL, gerçek dış ağ
-- gerekmiyor).
--
-- duels.league_id BİLİNÇLİ OLARAK nullable — bir düello bir liglegin
-- İÇİNDE oynanmışsa (ör. "lig arkadaşınla düello" özelliği ileride
-- eklenirse) bağlanabilsin diye, ŞİMDİLİK backend hiçbir yerde
-- otomatik doldurmuyor (duels.py'de kullanılmıyor).
-- ============================================================

CREATE TABLE public.league_tiers (
    slug        varchar(20) PRIMARY KEY,
    tier_index  integer NOT NULL UNIQUE,
    name_tr     varchar(30) NOT NULL,
    name_en     varchar(30) NOT NULL
);

INSERT INTO public.league_tiers (slug, tier_index, name_tr, name_en) VALUES
  ('bronze',   0, 'Bronz',  'Bronze'),
  ('silver',   1, 'Gümüş',  'Silver'),
  ('gold',     2, 'Altın',  'Gold'),
  ('platinum', 3, 'Platin', 'Platinum'),
  ('diamond',  4, 'Elmas',  'Diamond'),
  ('master',   5, 'Usta',   'Master');

CREATE TABLE public.leagues (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_slug    varchar(20) NOT NULL REFERENCES public.league_tiers(slug),
    week_start   timestamptz NOT NULL,
    week_end     timestamptz NOT NULL,
    status       varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    max_members  integer NOT NULL DEFAULT 30,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leagues_status_tier_idx ON public.leagues(status, tier_slug);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

-- duels'taki "duels_select_all" deseniyle aynı: lig içeriğinde hassas
-- bir şey yok (kademe/hafta/durum), herkes görebilmeli ki liderlik
-- tablosu ekranı çalışsın.
CREATE POLICY "leagues_select_all" ON public.leagues
  FOR SELECT USING (true);

CREATE TABLE public.league_memberships (
    league_id   uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at   timestamptz NOT NULL DEFAULT now(),
    -- final_xp/final_rank/outcome sadece hafta bitip lig 'completed'
    -- olunca DOLDURULUR (rollover script'i) — aktif ligde NULL kalır,
    -- canlı sıralama xp_events'ten hesaplanır (bkz. yukarısı).
    final_xp    integer,
    final_rank  integer,
    outcome     varchar(10) CHECK (outcome IN ('promoted', 'stayed', 'demoted')),
    PRIMARY KEY (league_id, user_id)
);

CREATE INDEX league_memberships_user_idx ON public.league_memberships(user_id);

ALTER TABLE public.league_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "league_memberships_select_all" ON public.league_memberships
  FOR SELECT USING (true);

ALTER TABLE public.profiles
  ADD COLUMN current_league_tier varchar(20) NOT NULL DEFAULT 'bronze'
    REFERENCES public.league_tiers(slug);

ALTER TABLE public.duels
  ADD COLUMN league_id uuid REFERENCES public.leagues(id) ON DELETE SET NULL;
