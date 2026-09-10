-- ============================================================
-- LEXIS — Tüm lig kademelerini doldurma (1000 kullanıcı simülasyonu)
-- Migration: 052_seed_all_tier_leagues.sql
-- ============================================================
-- Kullanıcı geri bildirimi (10 Eylül 2026, Faz 3 devamı): "diğer ligler
-- de hep bronz yazıyor... sistemde olabilecek tüm ligleri ekle oraya,
-- örneğin 1000 kişinin kullandığını düşün sistemi". Kök neden: /overview
-- sadece ÜYESİ OLAN aktif lig gruplarını döndürüyor (leagues.py), ve
-- yeni grup SADECE gerçek bir kullanıcı o kademeye terfi/kayıt olunca
-- açılıyor (ensure_active_league_membership, migration 047/051) — terfi/
-- düşme mekaniği henüz yok, bu yüzden Gümüş'ten Usta'ya kadar hiçbir
-- kademede grup hiç açılmamıştı.
--
-- Çözüm: her kademe için bot havuzundan (profiles.is_bot, migration 046)
-- doldurulmuş 1-2 grup PEŞİNEN açan bir fonksiyon (seed_tier_leagues).
-- Önce bot havuzu genişletiliyor (mevcut 28 bot çoğu kademede 1 tam grup
-- bile dolduramıyordu), sonra fonksiyon migration içinde bir kez, HEM de
-- backend'den (leagues.py::get_league_overview) her çağrıda idempotent
-- şekilde çağrılıyor ki gelecek haftalar da otomatik dolsun.
-- ============================================================

-- ------------------------------------------------------------
-- Bot havuzunu genişlet — her kademede en az ~15-20 bot olsun (1-2 grup
-- için yeterli). Difficulty dağılımı düşük kademede kolay/orta ağırlıklı,
-- yüksek kademede zor/usta ağırlıklı — mevcut desenle tutarlı.
-- ------------------------------------------------------------
DO $$
DECLARE
  bot_id uuid;
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- Bronz (+6)
      ('furkan_a', 'Furkan A.',   'bronze',   'kolay'),
      ('dila_k',   'Dila K.',     'bronze',   'kolay'),
      ('metehan_o','Metehan Ö.',  'bronze',   'orta'),
      ('sude_b',   'Sude B.',     'bronze',   'orta'),
      ('alperen_t','Alperen T.',  'bronze',   'kolay'),
      ('rana_d',   'Rana D.',     'bronze',   'orta'),
      -- Gümüş (+14)
      ('pelin_a',  'Pelin A.',    'silver',   'orta'),
      ('onur_t',   'Onur T.',     'silver',   'orta'),
      ('buse_k',   'Buse K.',     'silver',   'orta'),
      ('furkan_d', 'Furkan D.',   'silver',   'orta'),
      ('merve_s',  'Merve S.',    'silver',   'orta'),
      ('cagatay_y','Çağatay Y.',  'silver',   'zor'),
      ('dilara_m', 'Dilara M.',   'silver',   'zor'),
      ('tolga_e',  'Tolga E.',    'silver',   'zor'),
      ('nazli_b',  'Nazlı B.',    'silver',   'zor'),
      ('eren_c',   'Eren C.',     'silver',   'zor'),
      ('hazal_o',  'Hazal Ö.',    'silver',   'usta'),
      ('serkan_a', 'Serkan A.',   'silver',   'usta'),
      ('gamze_t',  'Gamze T.',    'silver',   'orta'),
      ('ozan_k',   'Ozan K.',     'silver',   'orta'),
      -- Altın (+14)
      ('alper_s',  'Alper S.',    'gold',     'zor'),
      ('ceyda_y',  'Ceyda Y.',    'gold',     'zor'),
      ('mert_b',   'Mert B.',     'gold',     'zor'),
      ('simge_k',  'Simge K.',    'gold',     'zor'),
      ('yigit_a',  'Yiğit A.',    'gold',     'zor'),
      ('pinar_e',  'Pınar E.',    'gold',     'zor'),
      ('kagan_d',  'Kağan D.',    'gold',     'usta'),
      ('tugce_o',  'Tuğçe Ö.',    'gold',     'usta'),
      ('fatih_c',  'Fatih C.',    'gold',     'usta'),
      ('esra_m',   'Esra M.',     'gold',     'usta'),
      ('volkan_t', 'Volkan T.',   'gold',     'usta'),
      ('naz_b',    'Naz B.',      'gold',     'orta'),
      ('cem_y',    'Cem Y.',      'gold',     'orta'),
      ('selim_k',  'Selim K.',    'gold',     'zor'),
      -- Platin (+14)
      ('burcu_a',  'Burcu A.',    'platinum', 'usta'),
      ('koray_d',  'Koray D.',    'platinum', 'usta'),
      ('aylin_s',  'Aylin S.',    'platinum', 'usta'),
      ('metin_o',  'Metin Ö.',    'platinum', 'usta'),
      ('sibel_k',  'Sibel K.',    'platinum', 'usta'),
      ('hakan_t',  'Hakan T.',    'platinum', 'zor'),
      ('ozge_c',   'Özge C.',     'platinum', 'zor'),
      ('anil_b',   'Anıl B.',     'platinum', 'zor'),
      ('derya_m',  'Derya M.',    'platinum', 'zor'),
      ('kubra_y',  'Kübra Y.',    'platinum', 'usta'),
      ('tarik_e',  'Tarık E.',    'platinum', 'usta'),
      ('gul_a',    'Gül A.',      'platinum', 'usta'),
      ('riza_d',   'Rıza D.',     'platinum', 'zor'),
      ('zeliha_o', 'Zeliha Ö.',   'platinum', 'usta'),
      -- Elmas (+14)
      ('ahmet_c',  'Ahmet C.',    'diamond',  'usta'),
      ('beste_k',  'Beste K.',    'diamond',  'usta'),
      ('orkun_t',  'Orkun T.',    'diamond',  'usta'),
      ('nurcan_a', 'Nurcan A.',   'diamond',  'usta'),
      ('sinan_d',  'Sinan D.',    'diamond',  'usta'),
      ('ebru_m',   'Ebru M.',     'diamond',  'usta'),
      ('tayfun_o', 'Tayfun Ö.',   'diamond',  'usta'),
      ('melike_y', 'Melike Y.',   'diamond',  'usta'),
      ('baran_e',  'Baran E.',    'diamond',  'usta'),
      ('didem_c',  'Didem C.',    'diamond',  'usta'),
      ('ugur_b',   'Uğur B.',     'diamond',  'usta'),
      ('seda_k',   'Seda K.',     'diamond',  'usta'),
      ('halil_a',  'Halil A.',    'diamond',  'usta'),
      ('yasemin_t','Yasemin T.',  'diamond',  'usta'),
      -- Usta (+14)
      ('kemal_o',    'Kemal Ö.',    'master', 'usta'),
      ('sevgi_d',    'Sevgi D.',    'master', 'usta'),
      ('alp_e',      'Alp E.',      'master', 'usta'),
      ('nihan_c',    'Nihan C.',    'master', 'usta'),
      ('baturalp_k', 'Baturalp K.', 'master', 'usta'),
      ('ilayda_a',   'Ilayda A.',   'master', 'usta'),
      ('onder_m',    'Önder M.',    'master', 'usta'),
      ('ayca_t',     'Ayça T.',     'master', 'usta'),
      ('salih_b',    'Salih B.',    'master', 'usta'),
      ('ozlem_y',    'Özlem Y.',    'master', 'usta'),
      ('firat_d',    'Fırat D.',    'master', 'usta'),
      ('buket_o',    'Buket Ö.',    'master', 'usta'),
      ('kaya_c',     'Kaya C.',     'master', 'usta'),
      ('lale_a',     'Lale A.',     'master', 'usta')
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

-- ------------------------------------------------------------
-- seed_tier_leagues: her kademe için bu hafta EN AZ p_target_groups_per_tier
-- kadar aktif grup açık olsun ister (yetecek kadar boşta bot varsa).
-- Idempotent — zaten var olan gruplara dokunmaz, sadece eksikleri açar.
-- ensure_active_league_membership (047/051) ile AYNI hafta hesabı ve
-- max_members (15) kullanılıyor ki iki mekanizma çakışmasın.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_tier_leagues(p_target_groups_per_tier integer DEFAULT 2)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    v_groups_to_create := p_target_groups_per_tier - v_existing_groups;
    IF v_groups_to_create > 0 THEN
      FOR g IN 1..v_groups_to_create LOOP
        -- Bu kademede, bu haftanın hiçbir aktif grubunda olmayan en az 1 bot yoksa yeni grup açma.
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
$$;

-- İlk çağrı: migration uygulanır uygulanmaz tüm ladder hemen dolu görünsün.
SELECT public.seed_tier_leagues(2);

-- Yeni doldurulan (ilk kez açılan) bot gruplarının "0 XP" görünmemesi
-- için başlangıç xp_events — migration 047'deki AYNI blokla birebir
-- aynı mantık, sadece bu migration'da eklenen yeni gruplara da uygulansın
-- diye tüm aktif bot üyeliklerine tekrar (idempotent DEĞİL ama zararsız —
-- zaten olan bir bota birkaç xp_event daha eklemek sorun değil, canlı
-- toplam sadece büyür) çalıştırılıyor.
DO $$
DECLARE
  b record;
  v_week_start timestamptz;
  v_events integer;
  v_amt integer;
  i integer;
  v_ts timestamptz;
BEGIN
  v_week_start := date_trunc('week', now() + interval '3 hours') - interval '3 hours';

  FOR b IN
    SELECT DISTINCT p.id, p.bot_difficulty
    FROM public.profiles p
    JOIN public.league_memberships lm ON lm.user_id = p.id
    JOIN public.leagues l ON l.id = lm.league_id AND l.status = 'active' AND l.week_start = v_week_start
    WHERE p.is_bot = true
      AND NOT EXISTS (
        SELECT 1 FROM public.xp_events xe
        WHERE xe.user_id = p.id AND xe.created_at >= v_week_start
      )
  LOOP
    v_events := 3 + floor(random() * 4)::int;
    FOR i IN 1..v_events LOOP
      v_amt := CASE b.bot_difficulty
        WHEN 'kolay' THEN 3 + floor(random() * 8)::int
        WHEN 'orta'  THEN 6 + floor(random() * 11)::int
        WHEN 'zor'   THEN 10 + floor(random() * 15)::int
        ELSE 15 + floor(random() * 18)::int
      END;
      v_ts := v_week_start + (random() * (now() - v_week_start));
      INSERT INTO public.xp_events (user_id, source_type, amount, created_at, metadata)
      VALUES (b.id, 'bot_activity', v_amt, v_ts, '{}'::jsonb);
    END LOOP;
  END LOOP;
END $$;
