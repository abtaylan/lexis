-- Migration: Sınav Hatırlatıcı (tüm yabancı dil sınavları — YDS, YÖKDİL, e-YDS,
-- TOEFL, IELTS vb.) — kullanıcı isteği (8 Eylül 2026): "sınav hatırlatıcısı
-- ekleyelim mobil uygulama ve web uygulama sayfasına (tüm yabancı dil
-- sınavları için olmalı)". Kullanıcı kendi sınavını (ad + tarih) ekliyor,
-- sınava kalan gün eşiklerinde (30/14/7/3/1/0) bildirim alıyor — bkz.
-- backend/send_exam_reminders.py.
--
-- Not: Bu değişiklik Supabase MCP (apply_migration) ile canlıya zaten
-- uygulandı; bu dosya repo geçmişi/reprodüksiyon amaçlı eklendi.
CREATE TABLE public.exam_reminders (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exam_name   text NOT NULL,
    exam_date   date NOT NULL,
    note        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX exam_reminders_user_idx ON public.exam_reminders(user_id);
CREATE INDEX exam_reminders_date_idx ON public.exam_reminders(exam_date);

ALTER TABLE public.exam_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_reminders_select_own"
  ON public.exam_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "exam_reminders_insert_own"
  ON public.exam_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exam_reminders_delete_own"
  ON public.exam_reminders FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "exam_reminders_admin_all"
  ON public.exam_reminders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- notifications tablosuna sınav hatırlatıcı bağlantısı + dedup (aynı desen:
-- bkz. migration 011'deki notifications_reminder_dedup_idx). Aynı sınav için
-- aynı gün eşiğinde (reminder_days_before) ikinci kez bildirim/push
-- gönderilmesini veritabanı seviyesinde engeller.
ALTER TABLE public.notifications
  ADD COLUMN exam_reminder_id uuid REFERENCES public.exam_reminders(id) ON DELETE SET NULL,
  ADD COLUMN reminder_days_before int;

CREATE UNIQUE INDEX notifications_exam_reminder_dedup_idx
  ON public.notifications(exam_reminder_id, reminder_days_before)
  WHERE exam_reminder_id IS NOT NULL;
