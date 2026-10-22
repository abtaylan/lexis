-- 091_study_day_videos.sql
--
-- "Calisma Notlarim" gun detayinda gunun TUM konularini (1-5 arasi, bkz.
-- migration 090) tek bir videoda ozetleyen "Bugunun Ozet Videosu" karti
-- (21 Ekim 2026 kullanici istegi): kullanici NotebookLM Studio'daki
-- "Video Ozeti" aracini, o gunun butun konularini kapsayan ozel bir
-- talimat metniyle calistirip indirdigi videoyu buraya yukluyor.
--
-- study_notes'tan farkli olarak bu KONU bazli degil GUN bazli (tek video,
-- o gunun tum konularini birlikte anlatiyor) -- bu yuzden ayri bir tablo.
--
-- Not: bu migration ayni oturumda ONCE mcp__Supabase__apply_migration/
-- execute_sql ile dogrudan canliya uygulandi (apply_migration/execute_sql
-- tum govdeyi tek seferde calistirirken defalarca 180s timeout verdi --
-- RLS policy olusturma adimi ozellikle yavasti -- bu yuzden canliya
-- ifade ifade, kucuk parcalar halinde uygulandi), burada repo gecmisini
-- canli semayla senkron tutmak icin de ekleniyor.

create table if not exists study_day_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  video_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists study_day_videos_user_date_idx on study_day_videos (user_id, date);

alter table study_day_videos enable row level security;

drop policy if exists "study_day_videos_own_rows" on study_day_videos;
create policy "study_day_videos_own_rows" on study_day_videos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Videolari saklayacak public storage bucket -- ayni study-notes-images
-- deseninde (herkese acik okunabilir, yazma/silme sadece backend'in
-- service role anahtari uzerinden yapiliyor, bkz.
-- backend/app/api/routes/study_notes.py), bu yuzden storage.objects icin
-- ayrica RLS politikasi gerekmiyor. file_size_limit 200MB (NotebookLM
-- Video Ozeti cikti dosyalari birkac dakikalik mp4, genelde bunun
-- altinda kaliyor).
insert into storage.buckets (id, name, public, file_size_limit)
values ('study-notes-videos', 'study-notes-videos', true, 209715200)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;
