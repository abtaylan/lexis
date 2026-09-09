-- 029_exam_questions_topic_tag_backfill.sql
--
-- Sınav Hazırlık İstatistik & İçerik Motoru, madde #3 (cevap sonrası kişisel
-- öneri): topic_tag hiçbir exam_questions satırında dolu değildi (026'daki
-- yorumda belirtildiği gibi kolon Faz 1'de sadece şema olarak eklenmişti).
-- Bu migration mevcut 45 sistem sorusunu (YDS/YÖKDİL/IELTS/TOEFL, hepsi
-- source_type='system') bir konu/beceri taksonomisiyle etiketliyor.
--
-- Önemli not (9 Eylül 2026): mevcut soru havuzu SÖZCÜK/kelime seçimi
-- ağırlıklı (fill-in-the-blank vocabulary sorular) — Gramer Rehberi'ndeki 13
-- konunun çoğu ise dilbilgisi YAPISI (zaman kipleri, koşul cümleleri, edilgen
-- çatı, ilgi cümlecikleri...) içeriyor. Bu yüzden aşağıdaki etiketlerin
-- sadece "connectors-linking-words" olanı gerçekten bir grammar_topics.slug
-- ile eşleşiyor (bkz. exam_questions_topic_tag_connectors satırı) — geri
-- kalanlar yeni, sözcük odaklı kategoriler (grammar_topics'te henüz karşılığı
-- yok). Bu durum exams.py::_grammar_topics_for_tags() tarafından zaten doğru
-- ele alınıyor (eşleşme yoksa related_grammar_topic sessizce null döner) —
-- kullanıcıya hata göstermez, sadece "İlgili konuyu incele" butonu o soru
-- için görünmez, "Bu konudan pratik yap" ve zayıf-konu özeti (madde #3b/#3c)
-- her durumda çalışır (topic_tag'e bağlı, grammar_topics.slug eşleşmesine
-- değil).
--
-- İleride: (a) Gramer Rehberi PDF-tabanlı genişleme (bkz. proje notu, PDF
-- bekleniyor) yeni dilbilgisi-yapısı konuları ekledikçe bu sözcük etiketleri
-- yerine/yanına yapı-odaklı sorular da eklenip ilgili slug'larla
-- etiketlenebilir; (b) admin panelinden AI ile üretilen yeni sorular zaten
-- topic_tag alıyor (bkz. AIQuestionGenerateRequest.topic_tag, admin
-- exam-questions sayfası) — bundan sonra üretilecek sorular baştan
-- etiketlenmeli.
--
-- Not: Bu değişiklik Supabase MCP (execute_sql) ile canlıya uygulandı; bu
-- dosya repo geçmişi/reprodüksiyon amaçlı eklendi (bkz. 022'deki aynı not).

update exam_questions set topic_tag = 'connectors-linking-words' where id in (
  '02bf6171-db10-4f3c-8dfc-33f78cb700aa', -- albeit
  '5afe1e48-908f-4057-900a-b74cb84899eb'  -- notwithstanding
);

update exam_questions set topic_tag = 'vocab-degree-intensity' where id in (
  '1d6c158a-503c-4470-85cd-616b8284eca9', -- considerable
  'cdfad869-9ee8-46c3-ad75-0e8d4dcd3083', -- substantial
  'b66f6522-11e0-4a3a-af3d-7c4bd31f95a9', -- unprecedented
  '3c42ccfd-9a83-4105-bd72-0b5a15457db9', -- paramount
  '916bba5c-3009-436a-a6f0-a253d09408a5'  -- crucial
);

update exam_questions set topic_tag = 'vocab-evidence-argument-quality' where id in (
  '21a6fcd4-b42d-4da0-9c0e-419740da73f3', -- coherent
  '4719d6c7-1bd0-4f43-b7e3-2fa31fb85eff', -- compelling
  '37baebb5-570c-4412-a9a5-2ed0283e0e33', -- plausible
  'f71520c1-c3e2-40b3-b531-1d7014cd1a9d', -- ambiguous
  'dc4058da-fe2b-46c1-926e-0acece9a8a82'  -- tangible
);

update exam_questions set topic_tag = 'vocab-negative-qualities' where id in (
  '48f078ce-ec90-40a3-ae6e-38d6854e1561', -- controversial
  'c3c7b325-2ec5-441d-8e34-00492d0b2ccd', -- detrimental
  'd6782434-16f6-41ea-abb4-3ec0f49f0421', -- arbitrary
  '90c0f42b-7e99-42ce-9f00-7d7eb7e2a398', -- adverse
  '8bc6948f-45ad-4e0e-829e-75463197e163'  -- precarious
);

update exam_questions set topic_tag = 'vocab-cause-effect-verbs' where id in (
  '8d7cd64e-1d69-43c2-86b9-5eb21728d302', -- correlate with
  '36cef265-1670-4fb2-87b3-8ab62c265107', -- foster
  '2b010d19-4b0b-495c-b768-ef079230177e', -- elicit
  '9ec28d7c-55c4-4c4c-9bdb-2c9c7aab116e', -- mitigate
  'a49711f9-ea69-41ec-8da5-671f9f475cc0', -- refute
  'e0eb3885-7d86-43a8-b3d7-8674e6d115e3', -- articulate
  '536cdeed-67b3-4db1-ade3-6d22b87e3663', -- discern
  'df5fbc71-4209-41e2-940d-070df4c2afaf'  -- perceive
);

update exam_questions set topic_tag = 'vocab-describing-change-state' where id in (
  'f2044a14-5ae4-41a4-9669-72a8bcb88082', -- deteriorate
  '8380a615-c8f1-4b55-890f-3f7c2573a6c4', -- prevalent
  '8f97ab63-cb67-4cf2-90ac-a8beef01353d', -- ubiquitous
  'f8a13e7a-4990-4aaa-9ca4-b1b1819c68dc'  -- resilient
);

update exam_questions set topic_tag = 'vocab-attitude-willingness' where id in (
  '8cb1f508-c20c-4e2e-a914-c85260233b3b', -- reluctant
  '4ea0809b-7661-47d6-a67f-ea9faf514ef0', -- meticulous
  '4bc0cb42-d7b6-41db-b97b-345ccaecc4ec'  -- mundane
);

update exam_questions set topic_tag = 'vocab-academic-research-concepts' where id in (
  '3bed3364-140f-4901-af82-882eda178c71', -- phenomenon
  '69cd7727-f191-4b40-acc3-8a28a7ead54d', -- feasible
  '76776053-a844-4299-9ad8-8cfb7f441cf6', -- hypothesis
  'bebda7c5-3716-4c2b-938a-16df21dd9230', -- comprehensive
  'fefb3df7-6afa-4f4d-95c3-7adde40ab7ce', -- empirical
  'ab911731-c499-476f-beb1-8d30a2f7c7bc', -- diverse
  'd1abba8b-5931-4c1b-a3b9-f1bf0b121430', -- versatile
  '7664de4f-d42d-40d8-b70f-4e03489a8601', -- predominant
  'e6f38fb0-8e8f-41c0-a710-07306f52693f', -- sustainable
  'b33134c3-961c-4cca-9c49-c65d8f2c537d'  -- enhance
);

update exam_questions set topic_tag = 'vocab-sequence-certainty' where id in (
  '7f6433c7-3250-4aee-bdce-e5fdd362aae0', -- subsequent
  '372f077e-7aeb-491a-8e38-a3d77e4700c0', -- inevitable
  'b072cf35-9fdf-4df2-9245-3cf72ef1a001'  -- underlying
);
