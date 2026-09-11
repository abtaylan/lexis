-- 066_platform_daily_snapshots.sql
--
-- İstatistik & Raporlama V2 öncelik #3, Faz 3 madde E — "Zaman bazlı
-- periyodik snapshot+cron". Madde A/B/D'nin tüm rapor hesaplamaları CANLI
-- (raw tablolardan "bu dönem vs bir önceki dönem" karşılaştırması) — geçmiş
-- birçok dönem boyunca trend görmek (ör. "son 30 gün DAU nasıl gitti") için
-- uygun değil, her istek ham tabloları yeniden tarıyor. Bu migration, HER
-- GÜN bir kez platform genelinde (bot hariç) özet metrikleri kalıcı olarak
-- kaydeden platform_daily_snapshots tablosunu ekliyor — Faz 3 madde H
-- (abonelik-segment korelasyonu) ve madde I'nin (admin filtreleme/
-- benchmark/takvim) üzerine inşa edeceği ham veri kaynağı.
--
-- is_bot=true kayıtlar (119 adet, hepsi total_xp=0 — bkz. madde D bulgusu)
-- HER metrikten hariç tutuluyor, aksi halde platform ortalamaları yapay
-- şekilde bozulurdu.
--
-- snapshot_date UNIQUE — idempotent upsert: aynı gün için tekrar
-- çalıştırmak (ör. cron'un manuel yeniden tetiklenmesi) güvenli, sadece
-- o günün satırını günceller, ikinci bir satır açmaz.
--
-- Diğer admin-only tablolarla aynı desen: sadece backend'in service-role
-- client'ı yazıyor, admin/admin_readonly sadece SELECT yapabiliyor.

CREATE TABLE public.platform_daily_snapshots (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date          DATE NOT NULL UNIQUE,
    new_signups_count      INTEGER NOT NULL DEFAULT 0,
    active_users_count     INTEGER NOT NULL DEFAULT 0,
    total_study_minutes    NUMERIC NOT NULL DEFAULT 0,
    total_new_words        INTEGER NOT NULL DEFAULT 0,
    avg_topic_accuracy     INTEGER,
    total_xp_awarded       INTEGER NOT NULL DEFAULT 0,
    premium_users_count    INTEGER NOT NULL DEFAULT 0,
    total_active_profiles  INTEGER NOT NULL DEFAULT 0,
    captured_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.platform_daily_snapshots IS
    'Her gün bir kez (Claude scheduled task + Supabase MCP SQL, bkz. devir notu) yakalanan, bot hariç (is_bot=false) platform genelinde özet metrikler. snapshot_date = özetlenen TÜRKİYE takvim günü (UTC+3), koşum zamanı değil.';
COMMENT ON COLUMN public.platform_daily_snapshots.avg_topic_accuracy IS
    'O gün topic_practice_attempts''e hiç kayıt düşmediyse NULL (bkz. Faz 3 madde A/B/C/D''den bilinen veri kapsamı bulgusu: bu tablo hâlâ genelde boş) — 0 ile karıştırılmamalı.';
COMMENT ON COLUMN public.platform_daily_snapshots.premium_users_count IS
    'O günkü değil, YAKALAMA ANINDAKİ (koşum zamanı) anlık premium kullanıcı sayısı — geçmişe dönük yeniden hesaplanamaz, trend için "o günkü seviye" yaklaşık değeri olarak okunmalı.';

CREATE INDEX idx_platform_daily_snapshots_date ON public.platform_daily_snapshots(snapshot_date DESC);

ALTER TABLE public.platform_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_daily_snapshots_admin_select" ON public.platform_daily_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'admin_readonly')
        )
    );
