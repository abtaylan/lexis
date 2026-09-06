-- Günün kelimesi e-postasını çok dilli hale getirir (6 Eylül 2026,
-- kullanıcı isteği): içerik artık sadece en/tr değil, kullanıcının
-- öğrendiği herhangi bir dil + ana diline göre seçilir.
-- Not: Bu migration Supabase'e mcp__Supabase__apply_migration ile canlı
-- olarak zaten uygulandı (isim: daily_word_content_multilang); bu dosya
-- repo geçmişiyle tutarlılık için sonradan eklendi.

alter table public.daily_word_content
  add column if not exists target_lang varchar(10) not null default 'en',
  add column if not exists native_lang varchar(10) not null default 'tr';

alter table public.daily_word_content rename column meaning_en to meaning_target;
alter table public.daily_word_content rename column meaning_tr to meaning_native;
alter table public.daily_word_content rename column example_1_en to example_1_target;
alter table public.daily_word_content rename column example_1_tr to example_1_native;
alter table public.daily_word_content rename column example_2_en to example_2_target;
alter table public.daily_word_content rename column example_2_tr to example_2_native;
alter table public.daily_word_content rename column grammar_note_tr to grammar_note_native;

alter table public.daily_word_content alter column target_lang drop default;
alter table public.daily_word_content alter column native_lang drop default;

create index if not exists daily_word_content_lang_idx
  on public.daily_word_content(target_lang, native_lang, last_sent_at);
