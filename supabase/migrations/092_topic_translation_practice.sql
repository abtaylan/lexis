-- 092_topic_translation_practice.sql
--
-- "Konu Bazli Ceviri Pratigi" + "Gramer Cumle Kurma" oyun modu (23 Ekim
-- 2026, Behcet'in kullanici istegi): Gramer Rehberi'ndeki bir konuyu
-- (grammar_topics.slug == exams.py'deki topic_tag ile AYNI metin anahtar,
-- bkz. 027_grammar_reference.sql) calisirken "Pratik yap" ekraninda artik
-- coktan secmeli exam_questions'a EK OLARAK TR<->EN ceviri sorulari da
-- gosterilebiliyor (bkz. backend/app/api/routes/exams.py::
-- practice_questions_by_topic). Ayni ceviri cumle havuzu, Kelime
-- Oyunu'nda (games.py) YENI bir mod olan "grammar_sentence" icin de
-- ayri bir tablodan (game_grammar_sentences) besleniyor -- iki kullanim
-- alani ayni icerik SEKLINI paylasiyor ama ayri tablolar: biri konuya
-- gore (topic_tag) hedefli calisma pratigi, digeri oyun akisinda rastgele
-- cumle secimi (topic_tag'siz, serbest havuz).
--
-- Icerik (sorularin kendisi) BASKA bir ajan tarafindan ayrica
-- hazirlanacak/yuklenecek -- bu migration SADECE semayi olusturur.
--
-- Tasarim notlari:
-- 1) topic_translation_questions.topic_tag -- exam_questions.topic_tag ile
--    AYNI gevsek-baglantili (FK'siz) desen: grammar_topics.slug bir metin
--    anahtari, referans butunlugu backend/seed tarafinda saglaniyor.
-- 2) model_number (1|2) -- model_number=1 sorularda grammar_note (formul +
--    aciklama) dolu/gosteriliyor, model_number=2 aynı konu icin HIC
--    scaffolding'siz (daha zor) varyant -- grammar_note bu modelde NULL.
-- 3) question_type (tr_en|en_tr) -- hangi yonde sorulacagini belirler;
--    native_sentence/target_sentence HER ZAMAN aynı iki alanda saklanır,
--    "hangisi soru hangisi cevap" backend'de (exams.py/games.py) yön'e
--    gore hesaplanir (bkz. TopicTranslationQuestionItem.prompt_sentence/
--    correct_sentence), istemci yone gore dallanmaz.
-- 4) acceptable_answers/word_hints jsonb -- esnek, serbest metin kontrolü
--    istemci tarafinda (typing/fill_blank moduyla AYNI guven modeli,
--    bkz. games.py modül docstring'i) yapiliyor, bu yuzden sunucu tarafinda
--    ayrica bir "dogru cevap" zorlamasi yok.
--
-- RLS -- exam_questions (bkz. 023_exam_prep.sql) ile AYNI desen: soru
-- tablolari herkese acik okunur (status='published' filtresiyle), yazma
-- sadece admin rolü ile (icerik admin panelden/seed script'ten backend
-- service-role anahtariyla yukleniyor, bu zaten RLS'i atlar -- admin
-- policy sadece olasi dogrudan-admin-panel yazmalari icin). Deneme
-- (attempt) tablosu topic_practice_attempts (bkz. 060_topic_practice_
-- attempts.sql) ile AYNI desen: kullanici sadece kendi satirini
-- ekleyebilir/görebilir.

create table public.topic_translation_questions (
  id uuid primary key default gen_random_uuid(),
  topic_tag text not null,
  model_number smallint not null check (model_number in (1,2)),
  level text not null check (level in ('a1','a2','b1','b2','c1')),
  question_type text not null check (question_type in ('tr_en','en_tr')),
  grammar_note text,
  native_sentence text not null,
  target_sentence text not null,
  acceptable_answers jsonb not null default '[]'::jsonb,
  word_hints jsonb not null default '[]'::jsonb,
  status text not null default 'published' check (status in ('draft','published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index topic_translation_questions_topic_status_idx
  on public.topic_translation_questions (topic_tag, status);

alter table public.topic_translation_questions enable row level security;

create policy "topic_translation_questions_select_published"
  on public.topic_translation_questions for select
  using (status = 'published');

create policy "topic_translation_questions_admin_all"
  on public.topic_translation_questions for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create table public.topic_translation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_tag text not null,
  question_id uuid not null references public.topic_translation_questions(id),
  submitted_text text,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index topic_translation_attempts_user_topic_idx
  on public.topic_translation_attempts (user_id, topic_tag);

alter table public.topic_translation_attempts enable row level security;

create policy "topic_translation_attempts_select_own"
  on public.topic_translation_attempts for select
  using (auth.uid() = user_id);

create policy "topic_translation_attempts_insert_own"
  on public.topic_translation_attempts for insert
  with check (auth.uid() = user_id);

create table public.game_grammar_sentences (
  id uuid primary key default gen_random_uuid(),
  topic_tag text not null,
  level text not null check (level in ('a1','a2','b1','b2','c1')),
  question_type text not null check (question_type in ('tr_en','en_tr')),
  native_sentence text not null,
  target_sentence text not null,
  acceptable_answers jsonb not null default '[]'::jsonb,
  word_hints jsonb not null default '[]'::jsonb,
  status text not null default 'published' check (status in ('draft','published')),
  created_at timestamptz not null default now()
);

create index game_grammar_sentences_status_idx
  on public.game_grammar_sentences (status);

alter table public.game_grammar_sentences enable row level security;

create policy "game_grammar_sentences_select_published"
  on public.game_grammar_sentences for select
  using (status = 'published');

create policy "game_grammar_sentences_admin_all"
  on public.game_grammar_sentences for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================
-- Kelime Oyunu: "grammar_sentence" modu (games.py/schemas/games.py) --
-- game_mode / xp_source_type ENUM'lari (Postgres tipleri, Python
-- Literal/Enum'larla AYRI ayri senkron tutulmasi gereken, migration
-- 038/039/069/071/082/083/084'te tekrar eden hata sinifi) burada da
-- IKISI BIRDEN, TEK migration'da guncelleniyor (084_sentence_building_
-- mode.sql'deki AYNI desen).
-- ============================================================
alter type public.game_mode add value if not exists 'grammar_sentence';
alter type public.xp_source_type add value if not exists 'game_grammar_sentence';

-- game_attempts -- bu moddaki cumleler words/general_word_pool DISINDA,
-- ayri bir tablodan (game_grammar_sentences) geldigi icin mevcut
-- word_id/general_word_id ikilisine UYMUYOR (sentence_building bile
-- general_word_pool.example'a dayandigi icin general_word_id ile
-- calisiyordu, bkz. 084). Bu yuzden UCUNCU, nullable bir referans
-- kolonu ekleniyor ve game_attempts_word_ref_check (006_xp_and_games.sql)
-- UCU ihtimalden TAM OLARAK BIRINI zorunlu kilacak sekilde genisletiliyor.
alter table public.game_attempts
  add column grammar_sentence_id uuid references public.game_grammar_sentences(id);

alter table public.game_attempts
  drop constraint game_attempts_word_ref_check;

alter table public.game_attempts
  add constraint game_attempts_word_ref_check check (
    (
      (case when word_id is not null then 1 else 0 end) +
      (case when general_word_id is not null then 1 else 0 end) +
      (case when grammar_sentence_id is not null then 1 else 0 end)
    ) = 1
  );
