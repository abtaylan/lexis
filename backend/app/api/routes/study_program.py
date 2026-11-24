"""
backend/app/api/routes/study_program.py

Adaptif Ogrenme Motoru Madde 2 (24 Eylul 2026) -- haftalik rolling calisma
programi. Mantik: app/services/study_program_service.py.

GET /api/v1/study-program/current             -> bu haftanin programi + canli
    ilerleme (her odak konunun altinda varsa kendi `tactic`i, ayrica
    `monthly_exam` durumu).
GET /api/v1/study-program/weekly-quiz          -> hafta sonu quizi (odak
    konulardan karisik sorular, tercihen sinav taktik sorulari). Istemci bunu
    konu pratigi ekraninda topic_tag="weekly-quiz" ile acar; her cevap
    sorunun KENDI topic_tag'i ile /exams/topics/{tag}/practice-attempt'e
    yazilir.
GET /api/v1/study-program/monthly-tactic-exam  -> 24 Kasim 2026, Behcet'in
    kullanici istegi ("her ay sonunda da o ay boyunca ogrendigim konularin
    taktik sinavina gireyim"): bu AY boyunca gorulmus TUM odak konularin
    taktik-oncelikli soru seti. topic_tag="monthly-tactic-exam" ile acilir.
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.api.routes.exams import _translation_question_item
from app.schemas.exams import (
    ExamPracticeQuestionItem,
    ExamPracticeQuestionsResult,
    ExamQuestionOption,
    ExamTacticItem,
)
from app.schemas.study_program import StudyProgramResponse
from app.services import study_program_service as sps

router = APIRouter()

WEEKLY_QUIZ_TAG = "weekly-quiz"
# 23 Kasim 2026 -- "Haftalik Toplu Pratik" (bkz. weekly_bulk_practice
# fonksiyonu asagida). weekly-quiz ile AYNI desen, AYRI bir sanal
# topic_tag.
BULK_PRACTICE_TAG = "weekly-bulk-practice"
# 24 Kasim 2026 -- "Aylik Taktik Sinavi" (bkz. monthly_tactic_exam asagida).
MONTHLY_TACTIC_EXAM_TAG = "monthly-tactic-exam"


def _tactics_list(tags: list[str]) -> list[ExamTacticItem]:
    """24 Kasim 2026 -- verilen (sirali) topic_tag listesindeki konularin
    VARSA exam_tactics satirini ExamTacticItem listesine cevirir (yoksa o tag
    atlanir). weekly-quiz / weekly-bulk-practice / monthly-tactic-exam gibi
    BIRDEN FAZLA konuyu karistiran sonuclarda `tactics` alanini doldurmak
    icin kullanilir -- bkz. ExamPracticeQuestionsResult.tactics."""
    by_tag = sps._tactics_by_tag(tags)
    seen: set[str] = set()
    out: list[ExamTacticItem] = []
    for tag in tags:
        row = by_tag.get(tag)
        if row and tag not in seen:
            seen.add(tag)
            out.append(ExamTacticItem(**row))
    return out


def _learning_lang(user_id: str) -> str:
    data = (
        supabase_admin.table("profiles")
        .select("learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
        .data
    ) or {}
    return data.get("learning_lang") or "en"


def _has_content(learning_lang: str) -> bool:
    rows = (
        supabase_admin.table("exam_questions")
        .select("id")
        .eq("learning_lang", learning_lang)
        .eq("is_active", True)
        .eq("status", "approved")
        .limit(1)
        .execute()
        .data
    )
    return bool(rows)


@router.get("/current", response_model=StudyProgramResponse)
async def current_program(current_user=Depends(get_current_user)):
    learning_lang = _learning_lang(current_user.id)
    if not _has_content(learning_lang):
        # Soft-disable (weak-topics ile ayni desen): widget kendini gizler.
        return StudyProgramResponse(available=False, learning_lang=learning_lang)

    program = sps.get_or_create_program(current_user.id, learning_lang)
    progress = sps.build_progress(current_user.id, learning_lang, program)
    return StudyProgramResponse(
        available=True,
        learning_lang=learning_lang,
        week_start=str(program["week_start"])[:10],
        level=program.get("level"),
        **progress,
    )


@router.get("/weekly-quiz", response_model=ExamPracticeQuestionsResult)
async def weekly_quiz(current_user=Depends(get_current_user)):
    learning_lang = _learning_lang(current_user.id)
    program = sps.get_or_create_program(current_user.id, learning_lang)
    tags = [t["topic_tag"] for t in program.get("focus_topics") or []]
    questions = sps.weekly_quiz_questions(learning_lang, tags)
    return ExamPracticeQuestionsResult(
        topic_tag=WEEKLY_QUIZ_TAG,
        related_grammar_topic=None,
        tactics=_tactics_list(tags),
        questions=[
            ExamPracticeQuestionItem(
                id=q["id"],
                exam_type=q["exam_type"],
                question_text=q["question_text"],
                options=[ExamQuestionOption(**opt) for opt in q["options"]],
                correct_option=q["correct_option"],
                explanation=q.get("explanation") or "",
                topic_tag=q.get("topic_tag"),
            )
            for q in questions
        ],
    )


@router.get("/weekly-bulk-practice", response_model=ExamPracticeQuestionsResult)
async def weekly_bulk_practice(current_user=Depends(get_current_user)):
    """"Haftalik Toplu Pratik" (23 Kasim 2026, Behcet'in kullanici istegi:
    "her hafta calistigimiz konular bitince o konularla ilgili toplu soru
    cozmemiz lazim ... taktiklerden faydalanmamiz lazim"). weekly_quiz
    ile AYNI akis/kontrat (ExamPracticeQuestionsResult), ama cok daha genis
    bir MCQ + ceviri soru seti dondurur (bkz. weekly_bulk_practice_questions/
    weekly_bulk_translation_questions). Taktik faydalanimi DOLAYLI: odak
    konularin cogu zaten exam_tactics'te (bkz. /exams/tactics) bir taktige
    sahip -- kullanici o konuyu "Sinav Taktikleri" bolumunden ayrica
    calisabilir, bu uc tek bir topic_tag'e baglanamadigi icin burada tek
    bir `tactic` alani DONDURULMEZ (null kalir)."""
    learning_lang = _learning_lang(current_user.id)
    program = sps.get_or_create_program(current_user.id, learning_lang)
    tags = [t["topic_tag"] for t in program.get("focus_topics") or []]
    questions = sps.weekly_bulk_practice_questions(learning_lang, tags)
    translation_rows = sps.weekly_bulk_translation_questions(tags)
    return ExamPracticeQuestionsResult(
        topic_tag=BULK_PRACTICE_TAG,
        related_grammar_topic=None,
        tactics=_tactics_list(tags),
        questions=[
            ExamPracticeQuestionItem(
                id=q["id"],
                exam_type=q["exam_type"],
                question_text=q["question_text"],
                options=[ExamQuestionOption(**opt) for opt in q["options"]],
                correct_option=q["correct_option"],
                explanation=q.get("explanation") or "",
                topic_tag=q.get("topic_tag"),
            )
            for q in questions
        ],
        translation_questions=[
            _translation_question_item(row, row["topic_tag"]) for row in translation_rows
        ],
    )


@router.get("/monthly-tactic-exam", response_model=ExamPracticeQuestionsResult)
async def monthly_tactic_exam(current_user=Depends(get_current_user)):
    """24 Kasim 2026, Behcet'in kullanici istegi ("her ay sonunda da o ay
    boyunca ogrendigim konularin taktik sinavina gireyim"): bu AYIN TUM
    haftalarinda gorulmus odak konularin (bkz. monthly_focus_tags) taktik-
    oncelikli soru seti (bkz. monthly_tactic_exam_questions /
    _pick_topic_questions). weekly-quiz ile AYNI kontrat, AYRI sanal
    topic_tag."""
    learning_lang = _learning_lang(current_user.id)
    today_tr = sps._now().astimezone(sps.TR_TZ).date()
    tags = sorted(sps.monthly_focus_tags(current_user.id, learning_lang, today_tr))
    questions = sps.monthly_tactic_exam_questions(learning_lang, tags)
    return ExamPracticeQuestionsResult(
        topic_tag=MONTHLY_TACTIC_EXAM_TAG,
        related_grammar_topic=None,
        tactics=_tactics_list(tags),
        questions=[
            ExamPracticeQuestionItem(
                id=q["id"],
                exam_type=q["exam_type"],
                question_text=q["question_text"],
                options=[ExamQuestionOption(**opt) for opt in q["options"]],
                correct_option=q["correct_option"],
                explanation=q.get("explanation") or "",
                topic_tag=q.get("topic_tag"),
            )
            for q in questions
        ],
    )
