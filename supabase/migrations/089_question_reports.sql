-- 089_question_reports.sql
-- "Hata bildirimi" butonu: kullanıcılar bir soruyu hatalı bulduğunu bildirir,
-- admin inceleyip exam_questions satırını YERİNDE düzeltip (aynı id,
-- status=approved kalır) yeniden yayınlar. 16 Ekim 2026 — kullanıcı talebi:
-- "biz çözüldü diyoruz ama başka biri sorun devam ediyor diyor... Hata
-- bildirimi butonu işini de yap... bildirim yapılan soruları inceleyip
-- doğru halini yeniden yayınla." reports tablosunun (018_reports.sql)
-- reporter/reason/details/status desenini izler, ama hedefi bir kullanıcı
-- değil bir exam_questions satırıdır.

create table if not exists question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references exam_questions(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'pending',
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists question_reports_question_id_idx on question_reports(question_id);
create index if not exists question_reports_status_idx on question_reports(status);

-- Admin bir soruyu düzeltip yeniden yayınladığında ne zaman değiştirildiğini
-- görebilsin (audit_log zaten action kaydını tutuyor, ama satırın kendisinde
-- de olması pratik).
alter table exam_questions add column if not exists updated_at timestamptz not null default now();
