-- 090_study_notes_topic_slug.sql
--
-- "Calisma Notlarim" -- her gunun GERCEK mufredati artik 1 ana + genelde
-- birden fazla "ilgili" Gramer Rehberi konusundan olusuyor (bkz. 16 Ekim
-- 2026 kullanici sorusu + schedule.py ROADMAP_KEYS/topic_slugs). Kullanici
-- 16 Ekim 2026'da tekrar istedi: Gemini/NotebookLM prompt'u VE kaydedilen
-- ozet/gorseller artik GUNE DEGIL, o gunun HER BIR konusuna ayri ayri ait
-- olmali (su ana kadar tek bir "gunluk" not satiri vardi, o da sadece ana
-- konuyu temsil ediyordu -- bkz. study-notes/[date]/page.tsx'teki eski
-- EXTERNAL_SOURCES.map()).
--
-- study_notes'un benzersizlik kisitini (user_id, date, source) ->
-- (user_id, date, source, topic_slug) olarak genisletiyoruz -- ayni gun +
-- kaynak icin artik HER konu kendi satirina sahip olabiliyor. Gercek konusu
-- olmayan "genel program" gunleri icin frontend sabit "genel" slug'ini
-- gonderiyor (bkz. backend study_notes.py _topic_context_for_date).
--
-- Not: bu migration ayni oturumda ONCE mcp__Supabase__apply_migration ile
-- dogrudan canliya uygulandi (mevcut 2 satir geriye donuk olarak
-- 'present-perfect-vs-past-simple' slug'ina baglandi), burada repo
-- gecmisini canli semayla senkron tutmak icin de ekleniyor.

alter table study_notes add column if not exists topic_slug text;

update study_notes
set topic_slug = 'present-perfect-vs-past-simple'
where topic_slug is null;

alter table study_notes alter column topic_slug set not null;

alter table study_notes drop constraint if exists study_notes_user_id_date_source_key;
alter table study_notes add constraint study_notes_user_id_date_source_topic_slug_key
  unique (user_id, date, source, topic_slug);
