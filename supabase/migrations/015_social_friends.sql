-- ============================================================
-- LEXIS — Madde 6, Faz 1: Arkadaşlık + Takip + Profil görüntüleme
-- Migration: 015_social_friends.sql
-- ============================================================
-- Bu migration Madde 6'nın ilk fazı için gereken 2 tabloyu ekler:
--   1) friendships — karşılıklı arkadaşlık (istek gönder/kabul et/reddet).
--   2) follows     — tek yönlü takip (arkadaşlıktan bağımsız, Twitter/
--                     Instagram tarzı). İkisi birbirinden tamamen ayrı;
--                     mesajlaşma (Faz 2) ileride her ikisine de bakabilir,
--                     bu migration'da mesajlaşmayla ilgili hiçbir şey yok.
--
-- Profil görüntüleme (istatistik + program) için ayrı bir tablo YOK —
-- kullanıcı kararıyla herkese açık: backend/app/services/public_profile_service.py
-- mevcut words/daily_progress/study_schedule tablolarını service-role
-- client (RLS bypass) ile okuyup GET /social/profile/{username} altında
-- sunuyor, sadece giriş yapmış olmak yeterli (ek bir gizlilik/izin
-- kontrolü yok).
--
-- Not: leaderboard_service.py / admin_platform.py'deki desenle aynı —
-- Supabase RPC / raw SQL kullanılmıyor, backend supabase-py query builder
-- ile çalışıyor. Bu iki tablo da SADECE backend'in service-role client'ı
-- (supabase_admin, RLS bypass eder) tarafından YAZILIYOR — normal
-- kullanıcı/anon erişimi sadece kendi ilişkili satırlarını OKUYABİLİR
-- (012_social_posts.sql / 013_admin_platform.sql'deki "yazma RLS'te yok,
-- backend garanti ediyor" deseniyle aynı).

-- ============================================================
-- 1. friendships — karşılıklı arkadaşlık
-- ============================================================
CREATE TABLE public.friendships (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status        varchar(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    responded_at  timestamptz,
    CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id)
);

CREATE INDEX friendships_requester_idx ON public.friendships(requester_id);
CREATE INDEX friendships_addressee_idx ON public.friendships(addressee_id);

-- Aynı iki kullanıcı arasında aynı anda birden fazla AKTİF (pending/accepted)
-- ilişki olamaz — yön farketmez (A->B ile B->A aynı sayılır). declined
-- durumdaki eski satırlar bu index'in dışında kalır, yani reddedilen bir
-- istekten sonra taraflardan biri tekrar istek gönderebilir.
CREATE UNIQUE INDEX friendships_unique_active_pair_idx
  ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
  WHERE status IN ('pending', 'accepted');

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships_select_involved" ON public.friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ============================================================
-- 2. follows — tek yönlü takip (arkadaşlıktan bağımsız)
-- ============================================================
CREATE TABLE public.follows (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT follows_not_self CHECK (follower_id <> following_id),
    CONSTRAINT follows_unique_pair UNIQUE (follower_id, following_id)
);

CREATE INDEX follows_follower_idx ON public.follows(follower_id);
CREATE INDEX follows_following_idx ON public.follows(following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_involved" ON public.follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
