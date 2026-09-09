-- 026_exam_prep_stats_and_content.sql
--
-- Sınav Hazırlık — İstatistik & İçerik Motoru, Faz 1: veri modeli temeli.
-- Kapsam (devir notu 9 Eylül 2026, "Sınav Hazırlık — İstatistik & İçerik
-- Motoru" maddesi #1): sadece şema + istatistik view'ı. Davranış değişikliği
-- YOK — yeni kolonların hepsi mevcut satırlarla uyumlu default değerlere
-- sahip, exams.py'deki hiçbir sorgu bu kolonları henüz okumuyor/yazmıyor.
-- Sonraki maddeler (soru havuzu büyütme, kişisel öneri, genel profil,
-- çoklu dil, uygulama geneli istatistik) bu temelin üzerine inşa edilecek.

-- 1) exam_questions: hedef dil, konu etiketi, kaynak ve moderasyon durumu.
--    learning_lang: bu soru hangi HEDEF dilin sınavına ait (öğrenilen dil,
--    profiles.learning_lang ile aynı sözleşme). Mevcut tüm sorular İngilizce
--    sınavlar (YDS/YÖKDİL/IELTS/TOEFL) olduğu için default 'en'.
alter table exam_questions
  add column if not exists learning_lang text not null default 'en',
  add column if not exists topic_tag text,
  add column if not exists source_type text not null default 'system',
  add column if not exists status text not null default 'approved',
  add column if not exists submitted_by uuid references auth.users(id) on delete set null;

alter table exam_questions
  add constraint exam_questions_source_type_check
    check (source_type in ('system', 'user', 'ai'));

alter table exam_questions
  add constraint exam_questions_status_check
    check (status in ('pending', 'approved', 'rejected'));

comment on column exam_questions.learning_lang is
  'Bu sorunun ait olduğu hedef dil (profiles.learning_lang ile aynı sözleşim, örn. en/de/fr/ar).';
comment on column exam_questions.topic_tag is
  'Serbest metin konu/beceri etiketi (örn. "zaman kipleri", "phrasal verb", "okuma anlama") — kişisel öneri motoru için.';
comment on column exam_questions.source_type is
  'Sorunun kaynağı: system (Lexis ekibi), user (kullanıcı katkısı), ai (AI üretimi).';
comment on column exam_questions.status is
  'Moderasyon durumu: pending (onay bekliyor), approved (havuzda aktif), rejected (reddedildi). Sadece approved sorular next-question sorgularında adaydır (filtre sonraki bir fazda eklenecek).';
comment on column exam_questions.submitted_by is
  'source_type=user/ai olduğunda soruyu öneren/tetikleyen kullanıcı; system sorularında NULL.';

create index if not exists idx_exam_questions_learning_lang on exam_questions (learning_lang);
create index if not exists idx_exam_questions_status_pending on exam_questions (status) where status <> 'approved';

-- 2) exam_sessions: oturumun hangi hedef dile ait olduğunu ayrıca tut —
--    exam_type tek başına dile karışık bakıyor (yds/yokdil/ielts/toefl hepsi
--    şu an İngilizce), ileride Almanca/Fransızca vb. sınav türleri eklenince
--    dile göre filtreleme/raporlama bu kolon üzerinden yapılacak.
alter table exam_sessions
  add column if not exists learning_lang text not null default 'en';

comment on column exam_sessions.learning_lang is
  'Oturumun hedef dili (profiles.learning_lang ile aynı sözleşim) — exam_type çoklu dile genelleşene kadar geçici olarak sabit "en".';

create index if not exists idx_exam_sessions_learning_lang on exam_sessions (learning_lang);

-- 3) Soru/şık bazlı istatistik view'ı — exam_attempts üzerinden canlı
--    hesaplanır (ayrı bir sayaç tablosu yok, drift riski olmasın diye).
--    total_attempts / correct_count / wrong_count ve şık bazlı seçilme
--    sayıları (option_counts, jsonb: {"a": 12, "b": 3, ...}).
create or replace view exam_question_stats as
select
  q.id as question_id,
  q.exam_type,
  q.learning_lang,
  q.topic_tag,
  q.difficulty_level,
  coalesce(base.total_attempts, 0) as total_attempts,
  coalesce(base.correct_count, 0) as correct_count,
  coalesce(base.wrong_count, 0) as wrong_count,
  case
    when coalesce(base.total_attempts, 0) = 0 then null
    else round(base.correct_count::numeric / base.total_attempts, 4)
  end as accuracy_ratio,
  coalesce(opts.option_counts, '{}'::jsonb) as option_counts
from exam_questions q
left join (
  select
    question_id,
    count(*) as total_attempts,
    count(*) filter (where is_correct) as correct_count,
    count(*) filter (where not is_correct) as wrong_count
  from exam_attempts
  group by question_id
) base on base.question_id = q.id
left join (
  select question_id, jsonb_object_agg(selected_option, cnt) as option_counts
  from (
    select question_id, selected_option, count(*) as cnt
    from exam_attempts
    group by question_id, selected_option
  ) per_option
  group by question_id
) opts on opts.question_id = q.id;

comment on view exam_question_stats is
  'Soru bazlı deneme istatistiği (exam_attempts üzerinden canlı hesaplanır): toplam deneme, doğru/yanlış sayısı, doğruluk oranı, şık bazlı seçilme dağılımı. Sınav Hazırlık İstatistik & İçerik Motoru Faz 1.';
