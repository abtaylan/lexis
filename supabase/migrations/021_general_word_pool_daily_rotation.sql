-- Günün kelimesi e-postasını 10 dilin TÜMÜNE genişletir (6 Eylül 2026,
-- kullanıcı isteği): daily_word_content'te elle hazırlanmış içerik olmayan
-- (native_lang, learning_lang) çiftleri için general_word_pool tablosundan
-- (kelime tahmin oyunu için zaten var olan, 90 dil çifti x 303 kelimelik
-- havuz) kelime seçilip yedek içerik olarak kullanılacak. daily_word_content
-- ile aynı "hiç gönderilmemişten en eskiye, yoksa en eski gönderilenden"
-- rotasyon mantığını burada da uygulayabilmek için last_sent_at eklenir.
-- Not: Bu migration Supabase'e mcp__Supabase__apply_migration ile canlı
-- olarak zaten uygulandı (isim: general_word_pool_daily_rotation); bu dosya
-- repo geçmişiyle tutarlılık için sonradan eklendi.

alter table public.general_word_pool
  add column if not exists last_sent_at timestamptz null;

create index if not exists general_word_pool_daily_rotation_idx
  on public.general_word_pool(source_lang, target_lang, last_sent_at)
  where is_active = true;
