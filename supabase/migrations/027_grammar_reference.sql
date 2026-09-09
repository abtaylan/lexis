-- Sınav Hazırlık — Gramer Rehberi (Grammar Reference)
--
-- Cambridge'in "English Grammar in Use" gibi telifli bir kitabı uygulamaya
-- eklemek yerine (telif ihlali olurdu), kullanıcının onayıyla ÖZGÜN gramer
-- referans içeriği yazılıp Sınav Hazırlık Alanı'na eklenmesine karar verildi
-- (9 Eylül 2026). Bu migration o içeriğin veri modelini kurar.
--
-- exam_questions.topic_tag ile bağlantı: grammar_topics.slug DEĞERİ,
-- exam_questions.topic_tag ile aynı sözlükten seçiliyor (freeform string,
-- iki taraf da eşleşirse "Bu konuyu pratik et" sorguları .eq("topic_tag", ...)
-- ile çalışır). exam_questions'ta şu an hiç topic_tag verisi yok (kontrol
-- edildi) — o yüzden geriye dönük bir tag normalizasyonu gerekmiyor, taksonomi
-- baştan temiz kuruluyor.

create table grammar_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_tr text not null,
  name_en text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table grammar_categories is 'Gramer Rehberi kategori grupları (ör. "Zamanlar", "Koşul Cümleleri") — sadece görsel gruplama.';

create table grammar_topics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category_id uuid not null references grammar_categories(id) on delete restrict,
  learning_lang text not null default 'en',
  title_tr text not null,
  summary_tr text not null,
  level text not null check (level in ('a2', 'b1', 'b2', 'c1')),
  exam_relevance text[] not null default '{}',
  rule_content_md text not null,
  example_sentences jsonb not null default '[]',
  common_mistakes jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'published')),
  source_type text not null default 'manual' check (source_type in ('manual', 'ai_draft')),
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column grammar_topics.slug is 'exam_questions.topic_tag ile aynı sözlükten — "Bu konuyu pratik et" derin bağlantısı için eşleşme anahtarı.';
comment on column grammar_topics.exam_relevance is 'Bu konunun en çok işine yaradığı sınav türleri, ör. {yds,yokdil}. Boş dizi = tüm sınavlarla ilgili.';
comment on column grammar_topics.example_sentences is 'jsonb dizi: [{"en": "...", "tr": "..."}] — tr alanı opsiyonel, sadece nüans önemliyse eklenir.';
comment on column grammar_topics.common_mistakes is 'jsonb dizi: [{"wrong": "...", "correct": "...", "note": "..."}] — Türkçe konuşanlara özgü hatalar.';
comment on column grammar_topics.status is 'draft: sadece admin görür. published: kullanıcıya Gramer Rehberi''nde gösterilir (bkz. RLS).';
comment on column grammar_topics.source_type is 'manual: elle yazıldı. ai_draft: AI taslağı, admin düzenleyip published yapana kadar draft kalır.';

create index idx_grammar_topics_category on grammar_topics(category_id);
create index idx_grammar_topics_status_published on grammar_topics(status) where status = 'published';
create index idx_grammar_topics_slug on grammar_topics(slug);

alter table grammar_categories enable row level security;
alter table grammar_topics enable row level security;

-- Kategoriler her zaman herkese açık (sadece grup başlıkları, hassas veri yok)
create policy grammar_categories_select_all on grammar_categories
  for select using (true);

create policy grammar_categories_admin_all on grammar_categories
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::user_role)
  );

-- exam_questions_select_active ile aynı desen: sadece published olan konular
-- normal kullanıcıya görünür, admin (profiles.role='admin') hepsini görür/yönetir.
create policy grammar_topics_select_published on grammar_topics
  for select using (status = 'published');

create policy grammar_topics_admin_all on grammar_topics
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::user_role)
  );
