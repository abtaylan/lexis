"""
backend/app/services/question_replenishment_service.py

24 Eylul 2026 -- Adaptif Ogrenme Motoru Madde 3 (2. bolum): soru tukenmesi
otomatik tamamlama. Periyodik yeniden seviye tespiti (recheck) onceki
sinavda gorulmus sorulari HARIC TUTUYOR (bkz. routes/exams.py::
_user_seen_placement_question_ids) -- bu, kullanici bir dil+seviyede
yeterince recheck yaptikca o dil+seviyenin onayli soru havuzunun zamanla
tukenmesi riskini getiriyor (havuz biterse 4-katmanli fallback zaten
gorulmus sorulari tekrar gosteriyor, sinav hicbir zaman tikanmiyor -- ama
tekrar sorular kullanici deneyimini bozar).

Bu servis dil x CEFR seviyesi kombinasyonlarini tarar, KULLANILABILIR
(onayli+aktif) soru sayisi esigin altina dustuyse mevcut
generate_placement_questions() fonksiyonunu cagirip yeni sorular uretir.
seed_placement_exam_questions.py ile AYNI guvenlik tasarimi: uretilen
sorular source_type='ai', status='pending' olarak eklenir -- admin
onaylamadan next_question/recheck tarafindan asla kullanilmaz (bkz.
routes/exams.py::_exam_content_learning_langs, next_question).

Cift-uretim onlemi: sadece ONAYLI+AKTIF sayisi esigin altindaysa VE o
seviye icin zaten yeterli PENDING (admin onayi bekleyen) soru YOKSA
uretim tetiklenir -- aksi halde admin her gun onaylamadan cron her gun
ayni seviye icin tekrar tekrar AI cagrisi yapip kuyrugu sismis olurdu.

/internal/cron/replenish-exam-questions endpoint'inden (cron.py) cagrilir,
already_ran_today/job_run ile gunde bir kez sinirlanir (bkz. cron.py).
"""

from app.core.database import supabase_admin
from app.services.exam_question_generator import (
    LANGUAGE_NAMES,
    ExamQuestionGenerationError,
    generate_placement_questions,
)

CEFR_LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"]

# Bir dil+seviye kombinasyonunda KULLANILABILIR (onayli+aktif) soru sayisi
# bu esigin altina duserse yeniden uretim tetiklenir. Recheck sinavlari
# onceki gorulen sorulari haric tuttugu icin ilk-kez (25 soru, tum
# seviyeler) esiginden (seed script'teki MIN_PER_LEVEL_TO_SKIP=6) daha
# yuksek tutuluyor -- kullanicinin birkac recheck'ten sonra bile taze
# soru gormesi icin.
REPLENISH_APPROVED_THRESHOLD = 15

# O seviye icin zaten bu kadar veya daha fazla PENDING (admin onayi
# bekleyen) soru varsa, onayli sayi dusuk olsa bile YENIDEN uretim
# tetiklenmez -- admin kuyrugu once eritmeli.
PENDING_SKIP_THRESHOLD = 10

# Bir cron calismasinda en fazla bu kadar generate_placement_questions()
# cagrisi yapilir (her cagri, o dilin EKSIK seviyeleri icin -- birden
# fazla seviye olabilir -- Anthropic API'ye 1+ istek anlamina gelir).
# Tum 12 dili tek seferde taramak yerine, maliyeti/sureyi sinirlar; kalan
# diller bir sonraki gunku calismada ele alinir.
MAX_REPLENISH_CALLS_PER_RUN = 20


def _counts_by_status(learning_lang: str) -> dict[str, dict[str, int]]:
    """Bu dil icin CEFR seviyesi -> {"approved": n, "pending": n} sayaci."""
    rows = (
        supabase_admin.table("exam_questions")
        .select("difficulty_level, status")
        .eq("exam_type", "placement")
        .eq("learning_lang", learning_lang)
        .eq("is_active", True)
        .execute()
        .data
    ) or []
    counts: dict[str, dict[str, int]] = {lvl: {"approved": 0, "pending": 0} for lvl in CEFR_LEVELS}
    for row in rows:
        lvl = row.get("difficulty_level")
        status = row.get("status")
        if lvl not in counts:
            continue
        if status == "approved":
            counts[lvl]["approved"] += 1
        elif status == "pending":
            counts[lvl]["pending"] += 1
    return counts


def _levels_needing_replenishment(learning_lang: str) -> list[str]:
    counts = _counts_by_status(learning_lang)
    needed = []
    for lvl in CEFR_LEVELS:
        c = counts[lvl]
        if c["approved"] < REPLENISH_APPROVED_THRESHOLD and c["pending"] < PENDING_SKIP_THRESHOLD:
            needed.append(lvl)
    return needed


def replenish_exam_questions(max_calls: int = MAX_REPLENISH_CALLS_PER_RUN) -> dict:
    """Tum dilleri tarar, esigin altindaki dil+seviye kombinasyonlari icin
    AI ile yeni placement sorulari uretip status='pending' olarak ekler.
    `max_calls` generate_placement_questions() cagri sayisini sinirlar
    (dil basina 1 cagri -- o dilin eksik TUM seviyeleri tek cagriya
    batch'lenir, generate_placement_questions zaten seviye basina ayri
    ic API istegi yapiyor, bkz. exam_question_generator.py docstring)."""
    summary: dict[str, dict] = {}
    calls_made = 0
    for learning_lang in LANGUAGE_NAMES:
        if calls_made >= max_calls:
            summary["_skipped_remaining"] = True
            break
        missing_levels = _levels_needing_replenishment(learning_lang)
        if not missing_levels:
            continue
        try:
            questions = generate_placement_questions(
                learning_lang, count=50, levels=missing_levels
            )
        except ExamQuestionGenerationError as exc:
            summary[learning_lang] = {"error": str(exc), "attempted_levels": missing_levels}
            calls_made += 1
            continue
        calls_made += 1

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
        summary[learning_lang] = {
            "attempted_levels": missing_levels,
            "generated": len(questions),
            "inserted": inserted,
        }
    summary["_calls_made"] = calls_made
    return summary
