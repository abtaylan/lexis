-- Migration: 074_account_deletions_log
-- Kullanıcı isteği (16 Eylül 2026): "yeni üye olan veya üyelikten çıkanları
-- her gün bana bildiren bir sistem". Hesap silme (DELETE /api/v1/auth/account
-- ve admin panelden kalıcı silme) auth.users satırını KALICI olarak siler,
-- bu yüzden silinen kullanıcıyı SONRADAN raporlayabilmek için silme ANINDA
-- (satır silinmeden hemen önce) e-posta/isim burada arşivleniyor.
-- auth.users(id)'e KASITLI OLARAK FK YOK — amaç zaten o satır silindikten
-- sonra da hayatta kalmak (bkz. notify_membership_changes.py).
-- Not: bu değişiklik Supabase MCP (apply_migration) ile canlıya zaten
-- uygulandı; bu dosya repo geçmişi/reprodüksiyon amaçlı.

create table if not exists public.account_deletions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    email text,
    display_name text,
    deleted_by text not null default 'self',  -- 'self' | 'admin'
    admin_actor_email text,
    deleted_at timestamptz not null default now()
);

create index if not exists idx_account_deletions_deleted_at on public.account_deletions (deleted_at desc);

comment on table public.account_deletions is 'Hesap silme olaylarının arşivi (kullanıcı kendisi ya da admin panelden) — günlük üyelik bildirimi (notify_membership_changes.py) için kaynak.';
