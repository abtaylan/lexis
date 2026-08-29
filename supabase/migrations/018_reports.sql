-- ============================================================
-- LEXIS — Madde 6 ek: Kullanıcı/mesaj şikayeti (report/flag)
-- Migration: 018_reports.sql
-- ============================================================
-- Mevcut engelleme (blocks, bkz. 001_initial.sql) tek başına Apple App
-- Store Guideline 1.2 (Safety - User Generated Content) için yeterli
-- sayılmayabilir: moderasyonsuz kullanıcı mesajlaşması olan uygulamalarda
-- genelde hem engelleme HEM raporlama beklenir. Bu tablo raporu kaydeder;
-- otomatik bir aksiyon almaz (ör. otomatik engelleme yok) — admin panelden
-- incelenmesi için (bkz. 013_admin_platform.sql'deki admin RBAC deseni,
-- ileride admin_platform.py'ye bir "reports" görünümü eklenebilir).
--
-- 015_social_friends.sql'deki desenle aynı: bu tablo SADECE backend'in
-- service-role client'ı (supabase_admin, RLS bypass eder) tarafından
-- yazılıyor/okunuyor — normal kullanıcı/anon erişimi hiç yok (SELECT
-- politikası bilinçli olarak eklenmedi, raporları görüntüleyecek bir
-- kullanıcı-tarafı özellik yok).

CREATE TABLE public.reports (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_id        uuid REFERENCES public.messages(id) ON DELETE SET NULL,
    reason            varchar(50) NOT NULL,
    details           text,
    status            varchar(20) NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'reviewed', 'dismissed')),
    created_at        timestamptz NOT NULL DEFAULT now(),
    reviewed_at       timestamptz,
    reviewed_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT reports_not_self CHECK (reporter_id <> reported_user_id)
);

CREATE INDEX reports_reported_user_idx ON public.reports(reported_user_id);
CREATE INDEX reports_status_idx ON public.reports(status);
CREATE INDEX reports_reporter_idx ON public.reports(reporter_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
-- Bilinçli olarak hiç policy yok — anon/authenticated rolleri için RLS
-- varsayılan olarak her şeyi reddeder, sadece supabase_admin (service role)
-- RLS'i bypass ederek okuyup/yazabilir (bkz. yukarıdaki not).
