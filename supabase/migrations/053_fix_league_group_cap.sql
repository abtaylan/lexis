-- supabase/migrations/053_fix_league_group_cap.sql
--
-- V2 Faz 3 devami (10 Eylul 2026 kullanici geri bildirimi -- "Bronz cok
-- fazla var, bunun sayisini azalt... en fazla A B C ve D olacak bir
-- ligden"): Bronz kademesinde bu hafta 27 AYRI grup + bunlarin icinde
-- 404 uyelik satiri bulundu -- kok neden arastirmasinda iki ayri sorun
-- tespit edildi:
--
--   1) seed_tier_leagues / ensure_active_league_membership fonksiyonlari
--      grup sayisina bir UST SINIR koymuyordu -- sadece bir "hedef"
--      (p_target_groups_per_tier=2) vardi, bu da bir MINIMUM'du, MAKSIMUM
--      degildi. Bu migration ikisine de p_max_groups_per_tier=4 sabit
--      tavani ekliyor.
--   2) 27 Bronz grubunun icindeki 404 uyelik satirinin coguna, migration
--      052'nin bot-doldurma adiminda (baska kademeler icin -- silver/
--      gold/platinum/diamond/master) olusturulan botlar YANLISLIKLA
--      Bronz gruplarina da eklenmis (kendi doğru kademelerindeki
--      uyeliklerine EK olarak, kendi kademeleri zaten dogru sayida --
--      bu YANLIS Bronz kopyalari). Bu migration bu hatali kayitlari
--      temizliyor ve Bronz'u 4 gruba (A/B/C/D) konsolide ediyor.
BEGIN;

-- ── 1) seed_tier_leagues: sabit MAKSIMUM tavan eklendi ──
CREATE OR REPLACE FUNCTION public.seed_tier_leagues(
  p_target_groups_per_tier integer DEFAULT 2,
  p_max_groups_per_tier integer DEFAULT 4
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t record;
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_existing_groups integer;
  v_new_league_id uuid;
  v_groups_to_create integer;
  bot record;
  g integer;
BEGIN
  v_week_start := date_trunc('week', now() + interval '3 hours') - interval '3 hours';
  v_week_end := v_week_start + interval '7 days';

  FOR t IN SELECT slug FROM public.league_tiers LOOP
    SELECT count(*) INTO v_existing_groups
    FROM public.leagues
    WHERE tier_slug = t.slug AND status = 'active' AND week_start = v_week_start;

    -- ONEMLI DUZELTME: eskiden sadece (target - existing) hesaplaniyordu,
    -- bu da existing zaten target'i asmissa (veya botlar surekli
    -- "unassigned" bulunmaya devam ediyorsa) sinirsiz buyumeye acikti.
    -- Artik target VE max_groups'un KUCUGU kullaniliyor.
    v_groups_to_create := LEAST(p_target_groups_per_tier, p_max_groups_per_tier) - v_existing_groups;
    IF v_groups_to_create > 0 THEN
      FOR g IN 1..v_groups_to_create LOOP
        IF EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.is_bot = true AND p.current_league_tier = t.slug
            AND p.id NOT IN (
              SELECT lm.user_id FROM public.league_memberships lm
              JOIN public.leagues l ON l.id = lm.league_id
              WHERE l.tier_slug = t.slug AND l.status = 'active' AND l.week_start = v_week_start
            )
        ) THEN
          INSERT INTO public.leagues (tier_slug, week_start, week_end, max_members)
          VALUES (t.slug, v_week_start, v_week_end, 15)
          RETURNING id INTO v_new_league_id;

          FOR bot IN
            SELECT p.id FROM public.profiles p
            WHERE p.is_bot = true AND p.current_league_tier = t.slug
              AND p.id NOT IN (
                SELECT lm.user_id FROM public.league_memberships lm
                JOIN public.leagues l ON l.id = lm.league_id
                WHERE l.tier_slug = t.slug AND l.status = 'active' AND l.week_start = v_week_start
              )
            ORDER BY random()
            LIMIT 15
          LOOP
            INSERT INTO public.league_memberships (league_id, user_id)
            VALUES (v_new_league_id, bot.id)
            ON CONFLICT DO NOTHING;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;

-- ── 2) ensure_active_league_membership: ayni sabit tavan (4) + capta
--    kalindiysa yeni grup ACMAK yerine en az dolu olana katilma ──
CREATE OR REPLACE FUNCTION public.ensure_active_league_membership(p_user_id uuid, p_tier_slug character varying)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_league_id uuid;
  v_group_count integer;
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
    -- Faz 3 devami (10 Eylul 2026 -- "Bronz cok fazla olmus, en fazla A
    -- B C D olacak sekilde sinirlandir"): bu kademe+hafta icin 4 grup
    -- sinirina ulasilmissa YENI grup ACMA -- mevcut gruplardan EN AZ
    -- dolu olana katil (15 sinirini asmak pahasina bile olsa, kayit
    -- ASLA engellenmemeli).
    SELECT count(*) INTO v_group_count
    FROM public.leagues
    WHERE tier_slug = p_tier_slug AND status = 'active' AND week_start = v_week_start;

    IF v_group_count >= 4 THEN
      SELECT l.id INTO v_league_id
      FROM public.leagues l
      WHERE l.tier_slug = p_tier_slug AND l.status = 'active' AND l.week_start = v_week_start
      ORDER BY (SELECT count(*) FROM public.league_memberships lm3 WHERE lm3.league_id = l.id) ASC, l.created_at
      LIMIT 1;
    ELSE
      INSERT INTO public.leagues (tier_slug, week_start, week_end, max_members)
      VALUES (p_tier_slug, v_week_start, v_week_end, 15)
      RETURNING id INTO v_league_id;

      FOR bot IN
        SELECT id FROM public.profiles
        WHERE is_bot = true AND current_league_tier = p_tier_slug
          AND id NOT IN (
            SELECT lm4.user_id FROM public.league_memberships lm4
            JOIN public.leagues l4 ON l4.id = lm4.league_id
            WHERE l4.tier_slug = p_tier_slug AND l4.status = 'active' AND l4.week_start = v_week_start
          )
        ORDER BY random()
        LIMIT 12
      LOOP
        INSERT INTO public.league_memberships (league_id, user_id)
        VALUES (v_league_id, bot.id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  INSERT INTO public.league_memberships (league_id, user_id)
  VALUES (v_league_id, p_user_id)
  ON CONFLICT DO NOTHING;

  RETURN v_league_id;
END;
$function$;

-- ── 3) Veri temizligi: Bronz'daki 70 hatali cross-tier bot uyeligini
--    sil (bu botlar zaten kendi dogru kademelerinde ayrica mevcut) ──
DELETE FROM public.league_memberships
WHERE league_id IN (SELECT id FROM public.leagues WHERE tier_slug = 'bronze' AND status = 'active')
  AND user_id IN (SELECT id FROM public.profiles WHERE is_bot = true AND current_league_tier <> 'bronze');

-- ── 4) Bronz'u 4 gruba (A/B/C/D) konsolide et: en eski 4 grubu sagda
--    tut, geri kalan uyelikleri bunlara ROUND-ROBIN dagit, fazla
--    (artik bos) grup satirlarini sil ──
CREATE TEMPORARY TABLE _bronze_members AS
SELECT DISTINCT ON (lm.user_id) lm.user_id, lm.joined_at
FROM public.league_memberships lm
JOIN public.leagues l ON l.id = lm.league_id
WHERE l.tier_slug = 'bronze' AND l.status = 'active'
ORDER BY lm.user_id, lm.joined_at;

CREATE TEMPORARY TABLE _survivors AS
SELECT id, row_number() OVER (ORDER BY created_at) AS rn
FROM public.leagues
WHERE tier_slug = 'bronze' AND status = 'active'
ORDER BY created_at
LIMIT 4;

DELETE FROM public.league_memberships
WHERE league_id IN (SELECT id FROM public.leagues WHERE tier_slug = 'bronze' AND status = 'active');

DELETE FROM public.leagues
WHERE tier_slug = 'bronze' AND status = 'active'
  AND id NOT IN (SELECT id FROM _survivors);

INSERT INTO public.league_memberships (league_id, user_id, joined_at)
SELECT s.id, m.user_id, m.joined_at
FROM (
  SELECT user_id, joined_at, row_number() OVER (ORDER BY joined_at) - 1 AS idx
  FROM _bronze_members
) m
JOIN _survivors s ON s.rn = (m.idx % (SELECT count(*) FROM _survivors)) + 1;

DROP TABLE _bronze_members;
DROP TABLE _survivors;

COMMIT;
