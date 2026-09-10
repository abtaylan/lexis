-- ============================================================
-- LEXIS — Bot (computer) kullanıcılar altyapısı
-- Migration: 046_bot_users.sql
-- ============================================================
-- Kullanıcı isteği (10 Eylül 2026): "user eksikliği noktasında
-- oluşturacağın computer user'ları olacak" — hem lig (boş/tek kişilik
-- gruplar) hem düello (rakip bulunamıyor) için gerçek kullanıcı sayısı
-- yetene kadar dolgu sağlayacak bot hesaplar.
--
-- Bot hesaplar GERÇEK auth.users + profiles satırlarıdır (profiles.id
-- auth.users(id) FK'sine bağlı olduğu için başka türlü mümkün değil —
-- bkz. migration 001). Asla giriş yapmazlar (encrypted_password
-- kasıtlı olarak geçersiz bir değer), sadece FK bütünlüğü için var.
-- is_bot=true bayrağı backend'in (leagues.py/duels.py) bunları normal
-- kullanıcılardan ayırt etmesini sağlar (istatistiklerde de hariç
-- tutulacak — bkz. Faz 3f istatistik uçları).
--
-- bot_difficulty dört kademeli (kolay/orta/zor/usta) — düellodaki
-- otomatik cevap doğruluk oranı ve lig'deki haftalık XP hızı buna göre
-- ölçeklenir (backend: duels.py/simulate_bot_activity.py).
--
-- ÖNEMLİ (uygularken keşfedildi): auth.users INSERT'i handle_new_user()
-- trigger'ını tetikler ve public.profiles satırını KENDİSİ zaten
-- oluşturur — bot profilleri bu yüzden INSERT değil UPDATE ile
-- dolduruluyor (aşağıda).
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN is_bot boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN bot_difficulty varchar(10)
  CHECK (bot_difficulty IN ('kolay', 'orta', 'zor', 'usta'));

CREATE INDEX profiles_is_bot_idx ON public.profiles(is_bot) WHERE is_bot = true;

-- Lig'deki simüle haftalık XP hareketi için (bkz. simulate_bot_activity.py) —
-- 038/039/045'teki AYNI kural: yeni xp_source_type değeri Python
-- (xp_service.py::XP_SOURCE_TYPES) ile AYNI COMMIT'te eklenir.
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'bot_activity';

-- ------------------------------------------------------------
-- Bot hesapları (28 adet) — Bronz'dan Usta'ya kademeli dağılım,
-- Türkçe (hedef kitleye uygun) kullanıcı adları. E-posta gerçek
-- olmayan bir alan adında (bots.lexis.internal) — hiçbir zaman
-- gönderilmez/doğrulanmaz.
-- ------------------------------------------------------------
DO $$
DECLARE
  bot_id uuid;
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('elif_k',   'Elif K.',  'bronze',   'kolay'),
      ('mehmet92', 'Mehmet A.','bronze',   'kolay'),
      ('ayse_t',   'Ayşe T.',  'bronze',   'kolay'),
      ('can_b',    'Can B.',   'bronze',   'kolay'),
      ('zeynep34', 'Zeynep Y.','bronze',   'orta'),
      ('deniz_y',  'Deniz Y.', 'bronze',   'orta'),
      ('burak_s',  'Burak S.', 'bronze',   'orta'),
      ('selin_o',  'Selin Ö.', 'bronze',   'orta'),
      ('kaan_d',   'Kaan D.',  'bronze',   'zor'),
      ('irem_c',   'İrem C.',  'bronze',   'zor'),
      ('emre_k',   'Emre K.',  'silver',   'orta'),
      ('gizem_a',  'Gizem A.', 'silver',   'orta'),
      ('oguz_t',   'Oğuz T.',  'silver',   'orta'),
      ('melis_b',  'Melis B.', 'silver',   'zor'),
      ('baris_y',  'Barış Y.', 'silver',   'zor'),
      ('ece_n',    'Ece N.',   'silver',   'usta'),
      ('yusuf_e',  'Yusuf E.', 'gold',     'orta'),
      ('sena_k',   'Sena K.',  'gold',     'zor'),
      ('taha_m',   'Taha M.',  'gold',     'zor'),
      ('nil_a',    'Nil A.',   'gold',     'zor'),
      ('arda_c',   'Arda C.',  'gold',     'usta'),
      ('defne_s',  'Defne S.', 'platinum', 'zor'),
      ('kerem_o',  'Kerem Ö.', 'platinum', 'zor'),
      ('asli_t',   'Aslı T.',  'platinum', 'usta'),
      ('berk_y',   'Berk Y.',  'platinum', 'usta'),
      ('ceren_d',  'Ceren D.', 'diamond',  'usta'),
      ('umut_k',   'Umut K.',  'diamond',  'usta'),
      ('leyla_a',  'Leyla A.', 'master',   'usta')
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
