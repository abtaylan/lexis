-- Migration: 075_signup_platform_and_login_events
-- Kullanici istegi (17 Eylul 2026): admin panelde her kullanicinin hangi
-- platformdan (web/ios/android) kayit oldugunu gormek + genel ve kullanici
-- bazli giris istatistikleri (toplam giris sayisi, platform kirilimi).
--
-- signup_platform: kayit aninda (register) X-Client-Platform header'indan
-- yazilir. Mevcut eski kullanicilarda NULL (bilinmiyor) kalir.
--
-- login_events: her basarili giris/kayit TAMAMLANMA aninda (yani access
-- token istemciye verildigi an) bir satir eklenir -- bkz. backend/app/
-- services/login_events_service.py ve auth.py'deki cagri noktalari
-- (login OTP'siz donus, verify-otp login/register, apple/google sign-in).
--
-- Not: bu degisiklik Supabase MCP (apply_migration) ile canliya zaten
-- uygulandi; bu dosya repo gecmisi/reproduksiyon amacli.

alter table public.profiles
  add column if not exists signup_platform text
    check (signup_platform in ('web', 'ios', 'android'));

comment on column public.profiles.signup_platform is
  'Kullanicinin ilk kayit oldugu platform (register sirasinda X-Client-Platform header''indan yazilir). Eski kullanicilarda NULL.';

create table if not exists public.login_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    platform text not null check (platform in ('web', 'ios', 'android')),
    created_at timestamptz not null default now()
);

create index if not exists idx_login_events_user_id on public.login_events (user_id);
create index if not exists idx_login_events_platform on public.login_events (platform);
create index if not exists idx_login_events_created_at on public.login_events (created_at desc);

comment on table public.login_events is
  'Her basarili giris/kayit tamamlanma aninda bir satir -- platform (web/ios/android) bazli toplam giris istatistikleri icin. Admin panel /admin/users + yeni platform kullanim istatistikleri ekrani tarafindan okunur.';
