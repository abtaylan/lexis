-- ============================================================
-- LEXIS — Abonelik (Premium) Sistemi
-- Migration: 003_subscriptions.sql
-- ============================================================

-- ── profiles: hızlı erişim için premium durumu ──────────────
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS is_premium     BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS premium_until  TIMESTAMPTZ;

-- ── subscriptions: iyzico abonelik kayıtlarının tam geçmişi ─
CREATE TABLE subscriptions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_code                   VARCHAR(20) NOT NULL,              -- 'monthly' | 'yearly'
    status                      VARCHAR(20) NOT NULL DEFAULT 'pending',
        -- pending | active | cancelled | expired | failed
    iyzico_subscription_ref     VARCHAR(100) UNIQUE,
    iyzico_customer_ref         VARCHAR(100),
    iyzico_pricing_plan_ref     VARCHAR(100),
    current_period_end          TIMESTAMPTZ,
    cancelled_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status  ON subscriptions(status);

-- updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION set_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_subscriptions_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Yazma işlemleri sadece backend'in service-role client'ı üzerinden
-- (webhook + checkout akışı), bu yüzden INSERT/UPDATE policy'si yok —
-- service role RLS'yi zaten bypass eder.

CREATE POLICY "subscriptions_admin_all" ON subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
