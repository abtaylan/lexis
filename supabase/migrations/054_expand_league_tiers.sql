-- supabase/migrations/054_expand_league_tiers.sql
--
-- V2 Faz 3 devami -- son genisletme istegi (10 Eylul 2026 kullanici
-- talebi): mevcut 6 kademeli lig sistemine (bronze..master) 6 YENI
-- kademe ekleniyor -- toplam 12 kademe, her biri en fazla 4 grup
-- (A/B/C/D, bkz. migration 053) tavanina tabi. Yeni siralama:
--
--   0 iron         Demir        (Bronz ONCESI yeni baslangic kademesi)
--   1 bronze       Bronz
--   2 silver       Gumus
--   3 gold         Altin
--   4 platinum     Platin
--   5 emerald      Zumrut       (Platin ile Elmas arasi -- YENI)
--   6 diamond      Elmas
--   7 ruby         Yakut        (Elmas ile Usta arasi -- YENI)
--   8 master       Usta
--   9 grandmaster  Ustat        (Usta'nin bir ustu -- YENI)
--  10 champion     Sampiyon     (zirve oncesi -- YENI)
--  11 legend       Efsane       (en ust kademe -- YENI)
--
-- Mevcut 6 kademenin SLUG'lari degismiyor (bronze/silver/gold/platinum/
-- diamond/master) -- sadece tier_index'leri kayiyor -- bu yuzden
-- profiles.current_league_tier / leagues.tier_slug FK'lerine (slug
-- uzerinden) dokunulmuyor, mevcut kullanicilar/gruplar ETKILENMIYOR.
-- SADECE yeni kayit olacak kullanicilarin baslangic kademesi artik
-- 'iron' (Demir) oluyor (asagidaki DEFAULT + trigger fallback
-- degisikligi) -- "Demir: Bronz oncesi baslangic kademesi" talebiyle
-- birebir.
--
-- tier_index UNIQUE oldugu icin (league_tiers_tier_index_key) mevcut
-- satirlari dogrudan hedef degerlere UPDATE etmek gecici cakismaya yol
-- acar -- once hepsini +100 ofsetle cakismadan kurtarip, sonra tek tek
-- hedef degerlerine indiriyoruz (hedefler 0-11, offset sonrasi 100-105
-- araliginda, hicbir zaman cakismiyor).
--
-- Yeni 6 kademe icin de (migration 046'daki AYNI desen -- bot hesaplar
-- gercek auth.users+profiles satirlari) kucuk bir bot havuzu ekleniyor,
-- boylece yeni acilan Demir/Zumrut/Yakut/Ustat/Sampiyon/Efsane gruplari
-- tamamen bos baslamiyor. Zorluk: Demir='kolay' (Bronz'dan bile daha
-- giris seviyesi), digerleri (Zumrut/Yakut/Ustat/Sampiyon/Efsane) zaten
-- Platin/Elmas/Usta ile AYNI 'usta' havuzuna dahil -- bot_difficulty
-- CHECK kisiti sadece 4 seviye (kolay/orta/zor/usta) tanimliyor, yeni
-- seviye eklemek duels.py/simulate_bot_activity.py'deki dogruluk
-- tablolarini da degistirmeyi gerektirir, bu migration'un kapsami
-- disinda tutuldu.
BEGIN;

-- ── 1) Mevcut 6 kademeyi gecici olarak cakismadan kurtar ──
UPDATE public.league_tiers SET tier_index = tier_index + 100;

-- ── 2) Mevcut 6 kademeye NIHAI (kaymis) index'lerini ata ──
UPDATE public.league_tiers SET tier_index = 1 WHERE slug = 'bronze';
UPDATE public.league_tiers SET tier_index = 2 WHERE slug = 'silver';
UPDATE public.league_tiers SET tier_index = 3 WHERE slug = 'gold';
UPDATE public.league_tiers SET tier_index = 4 WHERE slug = 'platinum';
UPDATE public.league_tiers SET tier_index = 6 WHERE slug = 'diamond';
UPDATE public.league_tiers SET tier_index = 8 WHERE slug = 'master';

-- ── 3) 6 yeni kademeyi ekle ──
INSERT INTO public.league_tiers (slug, tier_index, name_tr, name_en) VALUES
  ('iron',        0,  'Demir',    'Iron'),
  ('emerald',     5,  'Zümrüt',   'Emerald'),
  ('ruby',        7,  'Yakut',    'Ruby'),
  ('grandmaster', 9,  'Üstat',    'Grandmaster'),
  ('champion',    10, 'Şampiyon', 'Champion'),
  ('legend',      11, 'Efsane',   'Legend');

-- ── 4) Yeni kullanicilarin baslangic kademesi artik 'iron' (Demir) ──
ALTER TABLE public.profiles ALTER COLUMN current_league_tier SET DEFAULT 'iron';

-- ── 5) handle_new_profile_league_enrollment() fallback'i da 'iron' olsun
--    (migration 048'deki guncel govde -- rozet vermeyi de koruyoruz) ──
CREATE OR REPLACE FUNCTION public.handle_new_profile_league_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_active_league_membership(NEW.id, COALESCE(NEW.current_league_tier, 'iron'));

  IF COALESCE(NEW.is_bot, false) = false THEN
    INSERT INTO public.user_badges (user_id, badge_code)
    VALUES (NEW.id, 'league_joined')
    ON CONFLICT (user_id, badge_code) WHERE (period_key IS NULL) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 6) Yeni 6 kademe icin kucuk bot havuzu (15 bot, migration 046 ile
--    AYNI desen) -- yeni gruplar tamamen bos acilmasin diye ──
DO $$
DECLARE
  bot_id uuid;
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('pelin_r',   'Pelin R.',  'iron',        'kolay'),
      ('onur_b',    'Onur B.',   'iron',        'kolay'),
      ('ilayda_s',  'İlayda S.', 'iron',        'kolay'),
      ('tolga_m',   'Tolga M.',  'iron',        'kolay'),
      ('ebru_k',    'Ebru K.',   'iron',        'kolay'),
      ('serkan_d',  'Serkan D.', 'iron',        'kolay'),
      ('mert_a',    'Mert A.',   'emerald',     'usta'),
      ('hazal_t',   'Hazal T.',  'emerald',     'usta'),
      ('volkan_e',  'Volkan E.', 'emerald',     'usta'),
      ('ozan_y',    'Ozan Y.',   'ruby',        'usta'),
      ('buse_c',    'Buse C.',   'ruby',        'usta'),
      ('kagan_s',   'Kağan S.',  'grandmaster', 'usta'),
      ('naz_o',     'Naz Ö.',    'grandmaster', 'usta'),
      ('eren_b',    'Eren B.',   'champion',    'usta'),
      ('alp_k',     'Alp K.',    'legend',      'usta')
    ) AS t(username, display_name, tier_slug, difficulty)
  LOOP
    bot_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', bot_id, 'authenticated', 'authenticated',
      r.username || '@bots.lexis.internal', 'BOT_ACCOUNT_NO_LOGIN',
      now(), now(), now(),
      '{"provider":"bot","providers":["bot"]}'::jsonb, '{}'::jsonb, false, false
    );

    UPDATE public.profiles SET
      username = r.username,
      display_name = r.display_name,
      role = 'user',
      native_lang = 'tr',
      learning_lang = 'en',
      current_league_tier = r.tier_slug,
      is_active = true,
      is_bot = true,
      bot_difficulty = r.difficulty
    WHERE id = bot_id;
  END LOOP;
END $$;

COMMIT;
