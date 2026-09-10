-- ============================================================
-- LEXIS — Lig grup kapasitesi 30 -> 15
-- Migration: 051_league_group_size_reduction.sql
-- ============================================================
-- Kullanici geri bildirimi (10 Eylul 2026): "lig de kisi sayisi cok
-- fazla olmus, bence 15 kisi olmali". Uc adim:
--   1) leagues.max_members varsayilani 15'e cekildi.
--   2) ensure_active_league_membership (047) YENI grup acarken artik
--      30 yerine 15 ile aciyor.
--   3) Su an aktif olup 15'ten FAZLA uyesi olan gruplar (bugun itibariyle
--      sadece Bronz -- 29 gercek uye) 15'erli parcalara bolunuyor:
--      ilk 15 uye (joined_at sirasina gore) orijinal grupta kaliyor,
--      geri kalanlar ayni tier/hafta icin acilan YENI grup(lar)a
--      tasiniyor. XP hesaplamasi xp_events'ten CANLI oldugu icin
--      (bkz. leagues.py modul yorumu) bu tasima sirasinda hicbir XP
--      kaybi/duzeltmesi gerekmiyor -- kullanici sadece farkli bir
--      league_id altinda ayni haftanin XP'siyle siralanmaya devam eder.
-- ============================================================

ALTER TABLE public.leagues ALTER COLUMN max_members SET DEFAULT 15;

CREATE OR REPLACE FUNCTION public.ensure_active_league_membership(p_user_id uuid, p_tier_slug varchar)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_league_id uuid;
  bot record;
BEGIN
  SELECT l.id INTO v_league_id
  FROM public.league_memberships lm
  JOIN public.leagues l ON l.id = lm.league_id
  WHERE lm.user_id = p_user_id AND l.status = 'active'
  LIMIT 1;

  IF v_league_id IS NOT NULL THEN
    RETURN v_league_id;
  END IF;

  v_week_start := date_trunc('week', now() + interval '3 hours') - interval '3 hours';
  v_week_end := v_week_start + interval '7 days';

  SELECT l.id INTO v_league_id
  FROM public.leagues l
  WHERE l.tier_slug = p_tier_slug AND l.status = 'active' AND l.week_start = v_week_start
    AND (SELECT count(*) FROM public.league_memberships lm2 WHERE lm2.league_id = l.id) < l.max_members
  ORDER BY l.created_at
  LIMIT 1;

  IF v_league_id IS NULL THEN
    INSERT INTO public.leagues (tier_slug, week_start, week_end, max_members)
    VALUES (p_tier_slug, v_week_start, v_week_end, 15)
    RETURNING id INTO v_league_id;

    FOR bot IN
      SELECT id FROM public.profiles
      WHERE is_bot = true AND current_league_tier = p_tier_slug
      ORDER BY random()
      LIMIT 12
    LOOP
      INSERT INTO public.league_memberships (league_id, user_id)
      VALUES (v_league_id, bot.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  INSERT INTO public.league_memberships (league_id, user_id)
  VALUES (v_league_id, p_user_id)
  ON CONFLICT DO NOTHING;

  RETURN v_league_id;
END;
$$;

-- ------------------------------------------------------------
-- Mevcut asiri kalabalik aktif gruplari 15'erli parcalara bol.
-- ------------------------------------------------------------
DO $$
DECLARE
  lg record;
  member_ids uuid[];
  chunk_start integer;
  chunk_end integer;
  new_league_id uuid;
  chunk_ids uuid[];
BEGIN
  FOR lg IN
    SELECT l.id, l.tier_slug, l.week_start, l.week_end
    FROM public.leagues l
    WHERE l.status = 'active'
      AND (SELECT count(*) FROM public.league_memberships WHERE league_id = l.id) > 15
  LOOP
    SELECT array_agg(user_id ORDER BY joined_at) INTO member_ids
    FROM public.league_memberships WHERE league_id = lg.id;

    chunk_start := 16;
    WHILE chunk_start <= array_length(member_ids, 1) LOOP
      chunk_end := LEAST(chunk_start + 14, array_length(member_ids, 1));
      chunk_ids := member_ids[chunk_start:chunk_end];

      INSERT INTO public.leagues (tier_slug, week_start, week_end, max_members)
      VALUES (lg.tier_slug, lg.week_start, lg.week_end, 15)
      RETURNING id INTO new_league_id;

      UPDATE public.league_memberships
      SET league_id = new_league_id
      WHERE league_id = lg.id AND user_id = ANY(chunk_ids);

      chunk_start := chunk_end + 1;
    END LOOP;
  END LOOP;
END $$;

-- Artik hicbir aktif grup 15'ten fazla degil -- hepsinin kapasitesini
-- tutarlilik icin 15 yap (daha once 30 ile acilmis ama hic 15'i
-- gecmemis gruplar dahil).
UPDATE public.leagues SET max_members = 15 WHERE status = 'active';
