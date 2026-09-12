-- 069_referral_program.sql
--
-- V2 öncelik #8 (12 Eylül 2026) — "Referans/Davet Programı". Kullanıcıyla
-- netleşen kapsam: (1) ödül XP + birkaç gün ücretsiz Premium (SADECE davet
-- eden kişiye — davet edilen sadece küçük bir XP karşılama bonusu alır),
-- (2) kötüye kullanımı zorlaştırmak için ödül davet edilen kişi 3 günlük
-- seriye (streak) ulaşana kadar VERİLMEZ (hemen kayıt olur olmaz değil).
--
-- 1) Her profile'a benzersiz, paylaşılabilir bir referans kodu.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- handle_new_user() trigger'ı genişletildi: kayıt yöntemi fark etmeksizin
-- (email/OTP, Apple, Google — hepsi bu trigger'dan geçiyor, bkz.
-- auth.users -> public.profiles trigger'ı) her yeni kullanıcıya otomatik
-- bir kod atanır. Çakışma ihtimaline karşı (astronomik derecede düşük ama
-- sıfır değil) bounded bir retry döngüsü var — bir unique-violation'ın
-- SIGNUP'I KIRMASINA asla izin verilmemeli.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  candidate text;
  attempt int := 0;
BEGIN
  LOOP
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    attempt := attempt + 1;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = candidate) OR attempt >= 10;
  END LOOP;

  INSERT INTO public.profiles (id, display_name, referral_code)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    candidate
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Mevcut kullanıcılar için backfill (trigger sadece BUNDAN SONRAKİ yeni
-- kayıtları kapsar).
DO $$
DECLARE
  r RECORD;
  candidate text;
  attempt int;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    attempt := 0;
    LOOP
      candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      attempt := attempt + 1;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = candidate) OR attempt >= 10;
    END LOOP;
    UPDATE public.profiles SET referral_code = candidate WHERE id = r.id;
  END LOOP;
END $$;

-- 2) Kim kimi davet etti + ödül durumu.
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code_used text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz,
  CONSTRAINT referrals_no_self_referral CHECK (referrer_id <> referred_id)
);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
-- Sadece kendi davet ettiklerinin listesini görebilir (kimi davet ettiğini).
CREATE POLICY referrals_select_own ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- 3) XP kaynağı: process_referral_rewards.py bunu award_xp() ÜZERİNDEN
-- kullanacak (bkz. backend/app/services/xp_service.py) — ham SQL ile XP/
-- seviye/unvan mantığını burada TEKRAR ETMİYORUZ (madde D/E'deki gibi
-- basit idempotent bir toplama değil, seviye atlama + unvan rozeti yan
-- etkileri var — bunları SQL'de kopyalamak kalıcı/telafisiz bir tutarsızlık
-- riski taşır, bkz. devir notu).
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'referral_bonus';
