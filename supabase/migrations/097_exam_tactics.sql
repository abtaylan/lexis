-- 097_exam_tactics.sql
--
-- "Sinav Taktikleri" (23 Kasim 2026, Behcet'in kullanici istegi):
-- "YDS ve YOKDIL sinavlarinda sorularin kelime ve grammer bilgisi cok
-- olmadan sinav taktikleri ile cozulebildigi oluyor ... bu taktikleri
-- calistigimiz konularin oldugu bolumlere eklememiz lazim, bu taktikleri
-- sorular uzerinde gormemiz lazim."
--
-- Icerik web arastirmasiyla toplanip elle yazildi (bkz. commit mesaji /
-- oturum notlari) -- bagactlar, relative clauses, reported speech,
-- modallar (cikarim/zorunluluk/yetenek/izin), passive, conditionals ve
-- genel soru-tipi stratejileri (ceviri/cumle tamamlama/paragraf
-- tamamlama).
--
-- topic_tag DOLU ise: grammar_topics.slug ile eslesen GERCEK bir gramer
-- konusu -- mobil/web pratik ekraninda (exam-topic-practice) o konuya
-- ait soru havuzuyla BIRLIKTE, taktik banner'i olarak gosterilir (bkz.
-- ExamPracticeQuestionsResult.tactic).
-- topic_tag BOS (NULL) ise: belirli bir gramer konusuna degil, bir SORU
-- TIPINE (ceviri, cumle tamamlama, paragraf tamamlama...) ait genel bir
-- strateji -- "Sinav Taktikleri" listesinde ayri bir "Genel Stratejiler"
-- grubu altinda, pratik soru havuzu olmadan salt okunur gosterilir.
--
-- topic_translation_questions.topic_tag ile AYNI emsal: grammar_topics'e
-- FK YOK (bkz. 092 modul notu) -- gevsek eslesme, konu silinse/yeniden
-- adlandirilsa bile taktik satiri kopmaz.
create table if not exists public.exam_tactics (
    id uuid primary key default gen_random_uuid(),
    topic_tag varchar,
    title_tr varchar not null,
    tactic_tr text not null,
    worked_example_tr text,
    sort_order int not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists exam_tactics_topic_tag_idx on public.exam_tactics(topic_tag);

alter table public.exam_tactics enable row level security;

-- Vocab/gramer icerigiyle AYNI emsal (095, 092): herkese acik ogrenme
-- materyali, "gizli cevap" degil -- oturum acmis her kullanici okuyabilir.
create policy "Anyone can view exam_tactics"
    on public.exam_tactics for select
    using (true);
