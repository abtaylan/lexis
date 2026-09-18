"""
backend/seed_placement_exam_questions.py

Coklu Dil Seviye Tespit Sinavi (placement test) soru bankasini doldurur.
Kullanici istegi (18 Eylul 2026): "Seviye tespiti her dil icin yapilacak,
12 dil icin. Seviye tespiti sinavi 50 soru olacak. Gercek seviyeyi ortaya
cikarmali. Bizim sistemdeki gramer konularini ele alarak hazirla."

Bu script exam_questions tablosuna exam_type='placement' satirlari ekler
(bkz. app/schemas/exams.py::ExamType.placement,
app/services/exam_question_generator.py::generate_placement_questions).
Uretilen sorular DIGER AI sorularla (generate_questions) AYNI moderasyon
kuyrugundan gecer: source_type='ai', status='pending' olarak kaydedilir --
next_question ve /exam-types zaten sadece status=approved sorularla
calisiyor, o yuzden bu script calistirildiktan sonra sorular otomatik
olarak kullaniciya GORUNMEZ. Admin, GET /admin/questions/pending
uzerinden inceleyip onaylamali (bkz. routes/exams.py). Bu, generate_questions
icin zaten var olan guvenlik tasarimiyla BIRE BIR tutarli -- AI cikisi
hicbir zaman incelenmeden kullaniciya gosterilmez.

learning_lang='en' icin grammar_topics tablosundaki yayinlanmis konular
gercek zeminleme baglami olarak kullanilir (generate_placement_questions
icindeki _fetch_grammar_context). Diger diller icin boyle bir konu
tablosu olmadigindan model genel CEFR gramer kapsamina gore uretir --
bu bilincli bir sinir, ayni general_word_pool script'inin docstring'indeki
gibi.

Idempotentlik: bir dil icin zaten >=50 placement sorusu varsa (herhangi
bir status'te -- pending dahil, cunku amac tekrar tekrar ayni dili
uretip kuyrugu sismek degil) o dil ATLANIR. Script kesintiye ugrarsa
guvenle tekrar calistirilabilir.

Calistirma (tum diller, sirayla -- her dil bir AI cagrisi, ucret/sure
gerektirir):
    cd backend
    venv\\Scripts\\activate      # Windows
    python seed_placement_exam_questions.py

Tek bir dil icin:
    python seed_placement_exam_questions.py de
"""

import sys

from app.core.database import supabase_admin
from app.services.exam_question_generator import (
    LANGUAGE_NAMES,
    ExamQuestionGenerationError,
    generate_placement_questions,
)

QUESTIONS_PER_LANG = 50
MIN_EXISTING_TO_SKIP = 50

LEARNING_LANGS = list(LANGUAGE_NAMES.keys())  # en, tr, de, fr, es, it, ar, ru, ja, pt, ko, zh

if len(sys.argv) > 1:
    LEARNING_LANGS = [sys.argv[1]]


def existing_placement_count(learning_lang: str) -> int:
    result = (
        supabase_admin.table("exam_questions")
        .select("id", count="exact")
        .eq("exam_type", "placement")
        .eq("learning_lang", learning_lang)
        .execute()
    )
    return result.count or 0


def seed_language(learning_lang: str) -> None:
    language_name = LANGUAGE_NAMES.get(learning_lang, learning_lang)
    print(f"\n=== {learning_lang} ({language_name}) seviye tespit sinavi ===")

    existing = existing_placement_count(learning_lang)
    if existing >= MIN_EXISTING_TO_SKIP:
        print(f"  Zaten {existing} soru var (>= {MIN_EXISTING_TO_SKIP}), atlaniyor.")
        return

    try:
        questions = generate_placement_questions(learning_lang, count=QUESTIONS_PER_LANG)
    except ExamQuestionGenerationError as exc:
        print(f"  [HATA] AI soru uretimi basarisiz: {exc}")
        return

    inserted = 0
    for q in questions:
        row = {
            "exam_type": "placement",
            "question_text": q["question_text"],
            "options": q["options"],
            "correct_option": q["correct_option"],
            "explanation": q["explanation"],
            "related_words": [],
            "difficulty_level": q["level"],
            "is_active": True,
            "learning_lang": learning_lang,
            "topic_tag": q["topic_tag"],
            "source_type": "ai",
            "status": "pending",
        }
        result = supabase_admin.table("exam_questions").insert(row).execute()
        if result.data:
            inserted += 1
        else:
            print(f"  [HATA] insert basarisiz: {q['question_text'][:60]}...")

    print(f"  Uretildi: {len(questions)}, eklendi: {inserted}")
    from collections import Counter

    level_counts = Counter(q["level"] for q in questions)
    print(f"  Seviye dagilimi: {dict(sorted(level_counts.items()))}")


def seed() -> None:
    for lang in LEARNING_LANGS:
        seed_language(lang)
    print("\n=== Tum diller tamamlandi ===")
    print("NOT: Sorular status='pending' olarak eklendi -- admin panelinden")
    print("GET /admin/questions/pending uzerinden inceleyip onaylamak gerekiyor.")


if __name__ == "__main__":
    seed()
