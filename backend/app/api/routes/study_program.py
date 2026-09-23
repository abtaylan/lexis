"""
backend/app/api/routes/study_program.py

Adaptif Ogrenme Motoru Madde 2 (24 Eylul 2026) -- haftalik rolling calisma
programi. Mantik: app/services/study_program_service.py.

GET /api/v1/study-program/current      -> bu haftanin programi + canli ilerleme
GET /api/v1/study-program/weekly-quiz  -> hafta sonu quizi (odak konulardan
    karisik sorular). Istemci bunu konu pratigi ekraninda
    topic_tag="weekly-quiz" ile acar; her cevap sorunun KENDI topic_tag'i ile
    /exams/topics/{tag}/practice-attempt'e yazilir.
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.exams import (
    ExamPracticeQuestionItem,
    ExamPracticeQuestionsResult,
    ExamQuestionOption,
)
from app.schemas.study_program import StudyProgramResponse
from app.services import study_program_service as sps

router = APIRouter()

WEEKLY_QUIZ_TAG = "weekly-quiz"


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
