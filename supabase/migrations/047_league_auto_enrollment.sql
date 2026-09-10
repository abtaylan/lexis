-- ============================================================
-- LEXIS — Lig: otomatik kayıt (DB seviyesinde) + bot dolgusu
-- Migration: 047_league_auto_enrollment.sql
-- ============================================================
-- Kullanıcı isteği (10 Eylül 2026): "Şuan sistemi kullanan tüm kişiler
-- otomatik olarak en düşük lige dahil edilmeli." Önceki davranış: bir
-- kullanıcı sadece GET /leagues/me çağırınca (yani lig ekranını ilk kez
-- AÇTIĞINDA) bir gruba ekleniyordu (leagues.py::_ensure_active_membership,
-- lazy). Bu, ekranı hiç açmamış kullanıcıların başkalarının liderlik
-- tablosunda GÖRÜNMEMESİNE yol açıyordu.
--
-- Çözüm: aynı "bul ya da oluştur" mantığı bir Postgres fonksiyonuna
-- taşındı (ensure_active_league_membership) — hem Python (leagues.py,
-- RPC ile) hem YENİ bir profiles INSERT trigger'ı (sinyal kaynağından
-- BAĞIMSIZ: e-posta/OTP, Apple, ileride Google — hepsi auth.users'a
-- INSERT yapıp handle_new_user() ile profiles satırı oluşturuyor, bu
-- trigger da hemen ardından tetiklenir) BUNU çağırabiliyor. Tek kaynak,
-- iki tetikleyici.
--
-- Yeni grup İLK kez açıldığında ARTIK boş başlamıyor: o kademedeki bot
-- havuzundan (profiles.is_bot, bkz. migration 046) rastgele en fazla 12
-- tanesi otomatik ekleniyor — "ligde neden başka kimse yok" sorusunun
-- kök nedeni.
--
-- UYGULANIRKEN GÖZLEMLENDİ (10 Eylül 2026): geriye dönük kayıt script'i
-- çalıştırıldığında zaten 29 gerçek (is_bot=false) kayıtlı profil vardı
-- (tek bir Bronz grubuna, mevcut 30 kişilik kapasiteye sığdı) — bu
-- yüzden mevcut Bronz grubu bot TAKVİYESİ almadı (aşağıdaki "<12 üye"
-- eşiğine zaten gerçek kullanıcılarla ulaşmıştı). Bot dolgusu ileride
-- açılacak YENİ gruplarda (örn. terfi sonrası Gümüş/Altın) devreye
-- girecek.
-- ============================================================

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

  -- Python _current_week_bounds() ile AYNI hesap: Türkiye yerel saatine
  -- (+3, DST yok) göre Pazartesi 00:00 - Pazartesi 00:00.
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
    VALUES (p_tier_slug, v_week_start, v_week_end, 30)
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
-- Yeni kullanıcı -> DB seviyesinde otomatik kayıt (sinyal kaynağından
-- bağımsız). NOT (bilinçli sınır): NEW.is_bot burada her zaman false
-- olur çünkü bot satırları handle_new_user() ile is_bot=false olarak
-- oluşturulur, is_bot=true İKİNCİ bir UPDATE ile ayarlanır (bkz.
-- migration 046 yorumu) — yani bu trigger yeni bot eklerken de bir kez
-- tetiklenip o bot'u kendi kademesine "gerçek kullanıcı gibi" kaydeder.
-- Zararsız (bot zaten o kademede olsa gerekiyordu) ama ileride toplu
-- bot eklenecekse bilinmesi gereken bir detay.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_profile_league_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_active_league_membership(NEW.id, COALESCE(NEW.current_league_tier, 'bronze'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_league_enroll ON public.profiles;
CREATE TRIGGER on_profile_created_league_enroll
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_league_enrollment();

-- ------------------------------------------------------------
-- Geriye dönük: mevcut TÜM gerçek kullanıcıları bu haftaki liglerine
-- kaydet (henüz lig ekranını hiç açmamış olsalar bile).
-- ------------------------------------------------------------
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN SELECT id, current_league_tier FROM public.profiles WHERE is_bot = false
  LOOP
    PERFORM public.ensure_active_league_membership(p.id, p.current_league_tier);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- Geriye dönük: bu migration'dan ÖNCE zaten var olan (dolayısıyla
-- yukarıdaki fonksiyonun "yeni grup" bot-dolgu dalına hiç girmemiş)
-- aktif lig gruplarını bot'larla takviye et (12 üyeye kadar).
-- ------------------------------------------------------------
DO $$
DECLARE
  lg record;
  bot record;
  v_needed integer;
BEGIN
  FOR lg IN
    SELECT l.id, l.tier_slug, l.max_members,
           (SELECT count(*) FROM public.league_memberships WHERE league_id = l.id) AS member_count
    FROM public.leagues l WHERE l.status = 'active'
  LOOP
    IF lg.member_count < 12 THEN
      v_needed := LEAST(12 - lg.member_count, lg.max_members - lg.member_count);
      IF v_needed > 0 THEN
        FOR bot IN
          SELECT id FROM public.profiles
          WHERE is_bot = true AND current_league_tier = lg.tier_slug
            AND id NOT IN (SELECT user_id FROM public.league_memberships WHERE league_id = lg.id)
          ORDER BY random()
          LIMIT v_needed
        LOOP
          INSERT INTO public.league_memberships (league_id, user_id)
          VALUES (lg.id, bot.id) ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- İlk görünüm hiç "0 XP" bot dolu olmasın diye: bu haftaki aktif lig
-- üyeliği olan her bota, bot_difficulty'ye göre ölçeklenen 3-6 adet
-- başlangıç xp_events kaydı (hafta başından şimdiye rastgele
-- dağıtılmış). Devamı simulate_bot_activity.py (VPS cron) ile gelir.
-- ------------------------------------------------------------
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
    JOIN public.leagues l ON l.id = lm.league_id AND l.status = 'active'
    WHERE p.is_bot = true
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
