-- ============================================================
-- LEXIS — Madde 1d: Admin panelinin kapsamlı yönetim platformu
-- Migration: 013_admin_platform.sql
-- ============================================================
-- Bu migration, admin panelini genişleten 4 yeni alan için gereken
-- altyapıyı ekler:
--   1) admin_audit_log     — admin işlem geçmişi (kim, ne zaman, ne yaptı)
--   2) cron_job_runs       — arka plan script'lerinin (expire_premium.py,
--                            send_schedule_reminders.py, post_daily_content.py)
--                            çalışma geçmişi (sistem sağlığı takibi için)
--   3) notification_log    — OTP/hatırlatma e-postaları + Telegram/Slack
--                            gönderimlerinin geçmişi
--   4) user_role enumuna 'admin_readonly' eklenmesi — admin panelin
--      kendisi için rol bazlı yetkilendirme (RBAC): salt-okunur admin,
--      mutasyon (kullanıcı oluşturma/rol değiştirme/deaktif etme, kelime
--      havuzu düzenleme vb.) yapamaz, sadece görüntüleyebilir.
--
-- Not: Bu üç tablo da sadece backend'in service-role client'ı
-- (supabase_admin, RLS'i bypass eder) tarafından yazılıyor — normal
-- kullanıcı/anon erişimi RLS ile varsayılan "hepsini reddet" olarak kapalı
-- tutuluyor (012_social_posts.sql'deki desenle aynı).

-- ============================================================
-- 1. user_role enumuna yeni değer
-- ============================================================
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin_readonly';

-- ============================================================
-- 2. admin_audit_log
-- ============================================================
CREATE TABLE public.admin_audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    action      VARCHAR(100) NOT NULL,   -- örn. 'user.create', 'user.role_change', 'user.deactivate', 'word_pool.update'
    target_type VARCHAR(50),             -- örn. 'user', 'general_word_pool'
    target_id   VARCHAR(100),
    detail      JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_actor      ON public.admin_audit_log(actor_id);
CREATE INDEX idx_admin_audit_log_target     ON public.admin_audit_log(target_type, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_log_admin_select" ON public.admin_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'admin_readonly')
        )
    );

-- ============================================================
-- 3. cron_job_runs
-- ============================================================
CREATE TABLE public.cron_job_runs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name    VARCHAR(100) NOT NULL,   -- 'expire_premium' | 'send_schedule_reminders' | 'post_daily_content'
    status      VARCHAR(20) NOT NULL DEFAULT 'running',  -- 'running' | 'success' | 'failed'
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    detail      JSONB,
    error       TEXT
);

CREATE INDEX idx_cron_job_runs_job_started ON public.cron_job_runs(job_name, started_at DESC);

ALTER TABLE public.cron_job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cron_job_runs_admin_select" ON public.cron_job_runs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'admin_readonly')
        )
    );

-- ============================================================
-- 4. notification_log
-- ============================================================
CREATE TABLE public.notification_log (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel    VARCHAR(20) NOT NULL,    -- 'email' | 'telegram' | 'slack'
    category   VARCHAR(30) NOT NULL,    -- 'otp' | 'schedule_reminder' | 'social_word' | 'social_quiz'
    recipient  VARCHAR(255),            -- e-posta adresi ya da kanal adı (Telegram/Slack'te sabit kanal)
    status     VARCHAR(20) NOT NULL,    -- 'sent' | 'skipped' | 'failed'
    detail     JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_log_created_at ON public.notification_log(created_at DESC);
CREATE INDEX idx_notification_log_channel    ON public.notification_log(channel, category);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_log_admin_select" ON public.notification_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'admin_readonly')
        )
    );
