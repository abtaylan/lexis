-- Migration: Madde 3a — Program Hatırlatmaları + Dashboard Bildirim Alanı
-- Proje: Lexis (mrxeuxscyztpiuagsumh)
-- Not: Bu değişiklikler Supabase MCP (apply_migration) ile canlıya zaten
-- uygulandı; bu dosya repo geçmişi/reprodüksiyon amaçlı eklendi.

-- ============================================================
-- 1. study_schedule: hatırlatma tercihi (görev bazında — Madde 3a)
-- ============================================================
-- '15min'     → başlangıçtan 15 dakika önce
-- '1hour'     → başlangıçtan 1 saat önce
-- 'day_start' → günün başında (sabit bir günlük özet saatinde, bkz.
--               backend/send_schedule_reminders.py DAY_START_REMINDER_TIME)
-- NULL        → hatırlatma kapalı (varsayılan)
ALTER TABLE public.study_schedule
  ADD COLUMN reminder_lead text
  CHECK (reminder_lead IN ('15min', '1hour', 'day_start'));

COMMENT ON COLUMN public.study_schedule.reminder_lead IS
  'Görev bazında hatırlatma tercihi: 15min | 1hour | day_start | NULL (kapalı)';

-- ============================================================
-- 2. notifications — Dashboard'daki görsel hatırlatma/bildirim alanı
-- ============================================================
CREATE TABLE public.notifications (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type              text NOT NULL DEFAULT 'schedule_reminder',
    title             text NOT NULL,
    message           text NOT NULL,
    schedule_item_id  uuid REFERENCES public.study_schedule(id) ON DELETE SET NULL,
    -- Hatırlatmanın "ait olduğu" yerel takvim günü. schedule_item_id ile
    -- birlikte tekil (unique) — aynı görev için aynı gün 2. kez bildirim/
    -- e-posta gönderilmesini (cron script'in tekrar tetiklenmesi durumunda)
    -- veritabanı seviyesinde engeller.
    reminder_date     date NOT NULL DEFAULT CURRENT_DATE,
    is_read           boolean NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX notifications_reminder_dedup_idx
  ON public.notifications(schedule_item_id, reminder_date)
  WHERE schedule_item_id IS NOT NULL;

CREATE INDEX notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_admin_all"
  ON public.notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
