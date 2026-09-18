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

Idempotentlik (18 Eylul 2026 GUNCELLEME -- SEVIYE BAZLI): dil toplami
degil, HER CEFR SEVIYESI (a1..c2) ayri ayri kontrol edilir -- bir seviyede
zaten >=6 soru varsa (herhangi bir status'te -- pending dahil) o seviye
ATLANIR, sadece gercekten eksik seviyeler yeniden uretilir. (Eskiden dil
toplami >=50 degilse TUM 6 seviye yeniden uretiliyordu; bu, bir dilde
AI'nin bazi seviyelerde basarisiz oldugu durumlarda zaten yeterli olan
seviyelerin de gereksiz yere tekrar tekrar uretilip mukerrer soru
birikmesine yol acmisti.) Script kesintiye ugrarsa guvenle tekrar
calistirilabilir.

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
CEFR_LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"]
MIN_PER_LEVEL_TO_SKIP = 6  # 18 Eylul 2026: dil-toplami yerine SEVIYE BASINA idempotentlik esigi (asagiya bkz.)

LEARNING_LANGS = list(LANGUAGE_NAMES.keys())  # en, tr, de, fr, es, it, ar, ru, ja, pt, ko, zh

if len(sys.argv) > 1:
    LEARNING_LANGS = [sys.argv[1]]


def existing_placement_levels(learning_lang: str) -> dict[str, int]:
    """CEFR seviyesi basina mevcut soru sayisini dondurur.

    18 Eylul 2026 GUNCELLEME: eskiden tek bir toplam sayi (existing_placement_count)
    donduruluyordu ve dil toplami >=50 degilse TUM 6 seviye yeniden uretiliyordu --
    bu, 'tr' dilinde a1/b1/c1 seviyeleri eksik kalinca, zaten yeterli olan a2
    seviyesinin de tekrar tekrar uretilip mukerrer soru birikmesine yol acti
    (bkz. git log). Artik seviye basina kontrol ediyoruz, sadece gercekten
    eksik olan seviyeler yeniden uretiliyor."""
    result = (
        supabase_admin.table("exam_questions")
        .select("difficulty_level")
        .eq("exam_type", "placement")
        .eq("learning_lang", learning_lang)
        .execute()
    )
    counts: dict[str, int] = {lvl: 0 for lvl in CEFR_LEVELS}
    for row in result.data or []:
        lvl = row.get("difficulty_level")
        if lvl in counts:
            counts[lvl] += 1
    return counts


def seed_language(learning_lang: str) -> None:
    language_name = LANGUAGE_NAMES.get(learning_lang, learning_lang)
    print(f"\n=== {learning_lang} ({language_name}) seviye tespit sinavi ===")

    existing_by_level = existing_placement_levels(learning_lang)
    missing_levels = [lvl for lvl in CEFR_LEVELS if existing_by_level[lvl] < MIN_PER_LEVEL_TO_SKIP]
    if not missing_levels:
        print(f"  Tum seviyelerde yeterli soru var {existing_by_level}, atlaniyor.")
        return
    if len(missing_levels) < len(CEFR_LEVELS):
        print(f"  Mevcut: {existing_by_level} -- sadece eksik seviyeler uretilecek: {missing_levels}")

    try:
        questions = generate_placement_questions(
            learning_lang, count=QUESTIONS_PER_LANG, levels=missing_levels
        )
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
