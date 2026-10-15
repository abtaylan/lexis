-- 087_study_notes.sql
--
-- "Calisma Notlarim" sayfasi (15 Ekim 2026 kullanici istegi): Takvimde bir
-- gun "Yapildi" olarak isaretlendiginde, o gun icin Gemini/NotebookLM'den
-- alinan ozetleri kullanicinin yapistirip saklayabilecegi bir not deposu.
--
-- Not: schedule_day_completions tablosu bu migration'dan ONCE, ayni
-- oturumda dogrudan Supabase MCP (apply_migration) ile canliya uygulanmisti
-- ama o zaman bu repoya bir .sql dosyasi eklenmemisti -- burada, repo
-- gecmisini canli semayla senkron tutmak icin geriye donuk olarak da
-- ekleniyor (IF NOT EXISTS ile idempotent, canlida zaten var).
create table if not exists schedule_day_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  is_done boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table schedule_day_completions enable row level security;

drop policy if exists "schedule_day_completions_own_rows" on schedule_day_completions;
create policy "schedule_day_completions_own_rows" on schedule_day_completions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Calisma notlari: her tarih + kaynak (gemini/notebooklm/manual) icin tek
-- satir -- ayni gune ait birden fazla kaynaktan not saklanabilir (upsert
-- ile ayni kaynak icin tekrar kaydedilirse guncellenir).
create table if not exists study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  source text not null check (source in ('gemini', 'notebooklm', 'manual')),
  topic_title text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, source)
);

create index if not exists study_notes_user_date_idx on study_notes (user_id, date);

alter table study_notes enable row level security;

drop policy if exists "study_notes_own_rows" on study_notes;
create policy "study_notes_own_rows" on study_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
