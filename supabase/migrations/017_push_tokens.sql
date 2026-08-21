-- 017_push_tokens.sql
-- Mobil uygulama Faz 1 — push bildirim altyapısının temeli (bkz. mobil kapsam
-- dokümanı, Bölüm 4.3/7). Bu migration SADECE token kaydını saklar; gerçek
-- bildirim gönderimi (push tetikleyicileri) Faz 2/3'te sosyal olaylar
-- eklendiğinde devreye girecek.
--
-- Bir kullanıcının birden fazla cihazı olabilir (telefon + tablet vb.), bu
-- yüzden user_id başına birden fazla satır olabilir. Aynı token iki kez
-- kaydedilmesin diye token UNIQUE.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  device_name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

-- Kullanıcı sadece kendi token satırlarını okuyabilir/silebilir. Yazma
-- (insert/update) backend service-role client üzerinden yapılır (diğer
-- tablolardaki desenle aynı — bkz. blocks/messages/friendships RLS'leri).
create policy "push_tokens_select_own"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  using (auth.uid() = user_id);
