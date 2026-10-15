-- 088_study_notes_images.sql
--
-- "Calisma Notlarim" sayfasina gorsel yukleme (16 Ekim 2026 kullanici
-- istegi): "buralara metin disinda ek olarak resimler yukleyecegiz" --
-- Gemini/NotebookLM'den alinan infografik/zihin haritasi gorsellerini de
-- (metin ozetinin yaninda, hatta metin hic girilmeden) saklayabilmek icin.

-- Bir not birden fazla gorsel URL'i tasiyabilir (ornegin hem infografik
-- hem zihin haritasi ekran goruntusu).
alter table study_notes add column if not exists image_urls text[] not null default '{}';

-- Sadece gorsel yuklenip metin ozeti henuz girilmemis olabilir -- backend
-- bu durumda content icin '' gonderiyor (upsert_study_note'daki
-- bos-olamaz kontrolu sadece metin kaydetme endpoint'inde gecerli).
alter table study_notes alter column content set default '';

-- Gorselleri saklayacak public storage bucket. Herkese acik okunabilir
-- (infografik gorselleri hassas veri degil, sadece sinav konusu ozeti),
-- yazma/silme sadece backend'in service role anahtari uzerinden yapiliyor
-- (bkz. backend/app/api/routes/study_notes.py) -- bu yuzden storage.objects
-- icin ayrica RLS politikasi gerekmiyor.
insert into storage.buckets (id, name, public)
values ('study-notes-images', 'study-notes-images', true)
on conflict (id) do nothing;
