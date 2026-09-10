-- supabase/migrations/055_fix_tier_bot_placement_and_group_count.sql
--
-- V2 Faz 3 devami -- son geri bildirim (10 Eylul 2026 ekran goruntusu +
-- "lig isimleri hala duzelmemis, her bir lig A-B-C-D olacak, birisinde
-- 4 parca varken digerinde A-B olmayacak, hepsi A-B-C-D olacak"):
--
--   1) BOT YERLESIM HATASI (migration 054'te olusan yeni hata): 054'teki
--      DO blogu yeni bot profillerini once auth.users INSERT'i ile
--      olusturuyor (handle_new_user() tetikleyicisi profiles satirini
--      DEFAULT current_league_tier='iron' ile aciyor), SONRA ayri bir
--      UPDATE ile o botun GERCEK kademesini (emerald/ruby/grandmaster/
--      champion/legend) atiyordu. SORUN: migration 047/048'de eklenen
--      on_profile_created_league_enroll tetikleyicisi INSERT anindaki
--      (henuz DEFAULT 'iron' olan) degeri kullanarak botu HEMEN 'iron'
--      ligine yerlestiriyor -- UPDATE'in kademe degisikligi bu yerlesimi
--      GERIYE ALMIYOR. Sonuc: 054'te eklenen 9 bot (emerald/ruby/
--      grandmaster/champion/legend icin) hepsi yanlislikla TEK bir
--      'iron' grubuna tikilmis kaldi (dogrulandi: profiles.
--      current_league_tier DOGRU ama league_memberships hepsi 'iron'
--      gosteriyordu). migration 046'daki ORIJINAL 28 bot bu sorunu
--      YASAMADI cunku o tetikleyici (047) henuz yoktu o migration
--      calisirken -- 054 tetikleyiciden SONRA calistigi icin hata SADECE
--      054'teki 15 yeni botu etkiledi.
--   2) GRUP SAYISI TAVANI: seed_tier_leagues() "hedef" grup sayisi
--      SADECE 2'ydi (max 4, bkz. migration 053) VE grup acmayi o
--      kademede ATANMAMIS BOT bulunmasi sartina BAGLIYORDU -- bot havuzu
--      kucuk/tukenmis kademelerde (Demir:6, Zumrut:3, Yakut:2,
--      Ustat:2, Sampiyon:1, Efsane:1 bot) bu yuzden HICBIR ZAMAN 4
--      gruba ulasamiyordu, bazilari (yukaridaki bot yerlesim hatasi
--      yuzunden) hic grup bile acamiyordu. Kullanici istegi net: HER
--      kademe her zaman TAM 4 grup (A/B/C/D) gostersin -- bos gruplar
--      da dahil (gercek kullanicilar zaten sonradan bu bos gruplara
--      dolacak).
BEGIN;

-- ── 1) 054'teki yanlis 'iron' uyeliklerini temizle -- SADECE profile'in
--    GERCEK kademesi 'iron' OLMAYAN botlar icin (6 gercek Demir botu
--    ZATEN dogru yerde, dokunulmuyor) ──
DELETE FROM public.league_memberships
WHERE league_id IN (SELECT id FROM public.leagues WHERE tier_slug = 'iron' AND status = 'active')
  AND user_id IN (
    SELECT id FROM public.profiles
    WHERE is_bot = true AND current_league_tier <> 'iron'
  );

-- migration 052'de tanimlanan eski TEK parametreli asiri yukleme
-- (overload) hicbir zaman silinmedi -- 053 ikinci parametreyi ekleyince
-- CREATE OR REPLACE bunu YENI bir asiri yukleme olarak ekledi, eskisini
-- SILMEDI. Bu da seed_tier_leagues() cagrisini (parametresiz) BELIRSIZ
-- hale getiriyordu ("is not unique" hatasi, uygularken karsilasildi).
-- Eski asiri yuklemeyi kaldiriyoruz.
DROP FUNCTION IF EXISTS public.seed_tier_leagues(integer);

-- ── 2) seed_tier_leagues: hedef=4 (max ile ayni), bot-yokluğu ARTIK
--    grup acilmasini ENGELLEMIYOR -- grup HER ZAMAN aciliyor, bot
--    varsa ekleniyor, yoksa bos kaliyor ──
CREATE OR REPLACE FUNCTION public.seed_tier_leagues(
  p_target_groups_per_tier integer DEFAULT 4,
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

    v_groups_to_create := LEAST(p_target_groups_per_tier, p_max_groups_per_tier) - v_existing_groups;
    IF v_groups_to_create > 0 THEN
      FOR g IN 1..v_groups_to_create LOOP
        -- ONEMLI DUZELTME: eskiden burada "IF EXISTS (bu kademede
        -- atanmamis bot var mi)" kosulu vardi -- bot havuzu kucuk/
        -- tukenmis kademelerde grup HICBIR ZAMAN acilamiyordu. Artik
        -- grup KOSULSUZ aciliyor (bos kalabilir, sorun degil -- gercek
        -- kullanicilar ensure_active_league_membership ile buraya da
        -- yerlesebilir), sadece bot ATAMASI bulunabilirse yapiliyor.
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
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;

-- ── 3) Simdi calistir: 12 kademenin hepsini bu hafta icin TAM 4 gruba
--    tamamla (zaten 4'u olanlara -- Bronz -- dokunmuyor, idempotent) ──
SELECT public.seed_tier_leagues(4, 4);

COMMIT;
