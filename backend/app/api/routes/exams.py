"""
backend/app/api/routes/exams.py

Sınav Hazırlık Alanı (V2 Yol Haritası §1.1, öncelik #1) — YDS/YÖKDİL/IELTS/TOEFL.
Kullanıcı isteği: "uygulama içinde YDS/YÖKDİL/IELTS/TOEFL alanı olsun, burada bu
sınavlar için örnek sorular, doğru cevap analizi, örnek denemeler ... hatta
buradaki sorulardan kişi kendi kelime havuzuna kelime ekleyebilsin."

Kapsam kararları (devir notu §1.1'deki açık soruların çözümü, 9 Eylül 2026 —
kullanıcının stated preference'ı "execute autonomously without confirmation"
gereği onay beklenmeden karara bağlandı):
- İçerik: telif riski nedeniyle gerçek geçmiş sınav soruları KULLANILMIYOR,
  orijinal sorular seed ediliyor (bkz. supabase/migrations/024_exam_prep_yds_seed.sql).
- Dil kapsamı: şimdilik sadece native_lang=tr + learning_lang=en kullanıcılarına
  gösteriliyor (bkz. _exam_area_enabled) — diğer dil çiftlerinde /exam-types
  boş liste döner, istemci alanı gizler.
- MVP: tek sınav türüyle (YDS, 15 soru) uçtan uca akış; YÖKDİL/IELTS/TOEFL şema+
  API olarak hazır ama soru bankası henüz boş (question_count=0 -> available=
  false) — sırası gelince aynı desenle yeni seed migration'ı eklenip otomatik açılır.
- games.py'deki desenlerle tutarlı: session/next-item/attempt/finish akışı,
  supabase_admin ile doğrudan erişim, award_xp ile XP entegrasyonu, "words"
  tablosuna kelime ekleme _sync_word_progress'teki insert şablonunu izler.
"""

import random
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.exams import (
    AddWordFromQuestionResponse,
    ExamAttemptCreate,
    ExamAttemptResponse,
    ExamFinishResponse,
    ExamQuestionOption,
    ExamSessionCreate,
    ExamSessionResponse,
    ExamTypeInfo,
    NextQuestionResponse,
)
from app.services.spaced_repetition import calculate_next_review
from app.services.xp_service import award_xp

router = APIRouter()

# Desteklenen sınav türleri — hepsi şu an sadece native_lang=tr + learning_lang=en
# kullanıcı kitlesine gösteriliyor (bkz. modül docstring'i).
SUPPORTED_EXAM_TYPES = ["yds", "yokdil", "ielts", "toefl"]

PRACTICE_DEFAULT_QUESTIONS = 10
CANDIDATE_FETCH_LIMIT = 200

# Deneme sınavı (timed_mock) ayarları — gerçek sınavların kısaltılmış MVP
# versiyonu (örn. gerçek YDS 80 soru/180 dk'dır; burada uygulama-içi deneyim
# için kısaltıldı, ileride exam_type başına ayrı ayrı genişletilebilir).
EXAM_MOCK_CONFIG: dict[str, dict[str, int]] = {
    "yds": {"total_questions": 15, "time_limit_seconds": 20 * 60},
    "yokdil": {"total_questions": 15, "time_limit_seconds": 20 * 60},
    "ielts": {"total_questions": 15, "time_limit_seconds": 20 * 60},
    "toefl": {"total_questions": 15, "time_limit_seconds": 20 * 60},
}


def _profile_langs(user_id: str) -> tuple[str, str]:
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang, learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    data = profile.data or {}
    return data.get("native_lang", "tr"), data.get("learning_lang", "en")


def _exam_area_enabled(user_id: str) -> bool:
    native_lang, learning_lang = _profile_langs(user_id)
    return native_lang == "tr" and learning_lang == "en"


def _get_session(session_id: str, user_id: str) -> dict:
    result = (
        supabase_admin.table("exam_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Sınav oturumu bulunamadı.")
    return result.data[0]


def _attempted_question_ids(session_id: str) -> list[str]:
    result = (
        supabase_admin.table("exam_attempts")
        .select("question_id")
        .eq("session_id", session_id)
        .execute()
    )
    return [row["question_id"] for row in (result.data or [])]


@router.get("/exam-types", response_model=list[ExamTypeInfo])
async def list_exam_types(current_user=Depends(get_current_user)):
    if not _exam_area_enabled(current_user.id):
        return []

    infos = []
    for exam_type in SUPPORTED_EXAM_TYPES:
        # NOT: count="exact" kasıtlı olarak kullanılmıyor — games.py'deki aynı
        # kararla tutarlı (kurulu supabase-py sürümünde test edilmedi, bkz.
        # games.py::_prior_attempt_count yorumu). len(result.data) güvenli.
        result = (
            supabase_admin.table("exam_questions")
            .select("id")
            .eq("exam_type", exam_type)
            .eq("is_active", True)
            .execute()
        )
        count = len(result.data or [])
        infos.append(ExamTypeInfo(exam_type=exam_type, question_count=count, available=count > 0))
    return infos


@router.post("/sessions", response_model=ExamSessionResponse, status_code=201)
async def create_session(session_in: ExamSessionCreate, current_user=Depends(get_current_user)):
    if not _exam_area_enabled(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Sınav Hazırlık Alanı şu an sadece İngilizce öğrenen, ana dili Türkçe olan kullanıcılar için kullanılabilir.",
        )

    exam_type = session_in.exam_type.value
    if session_in.session_mode.value == "timed_mock":
        config = EXAM_MOCK_CONFIG[exam_type]
        total_questions = config["total_questions"]
        time_limit_seconds = config["time_limit_seconds"]
    else:
        total_questions = session_in.total_questions or PRACTICE_DEFAULT_QUESTIONS
        time_limit_seconds = None

    row = {
        "user_id": current_user.id,
        "exam_type": exam_type,
        "session_mode": session_in.session_mode.value,
        "total_questions": total_questions,
        "time_limit_seconds": time_limit_seconds,
        "score": 0,
        "xp_earned": 0,
    }
    result = supabase_admin.table("exam_sessions").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Sınav oturumu oluşturulamadı.")
    return result.data[0]


@router.get("/sessions/{session_id}/next-question", response_model=NextQuestionResponse)
async def next_question(session_id: str, current_user=Depends(get_current_user)):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    attempted = _attempted_question_ids(session_id)
    if len(attempted) >= session["total_questions"]:
        return NextQuestionResponse(finished=True)

    query = (
        supabase_admin.table("exam_questions")
        .select("id, question_text, options")
        .eq("exam_type", session["exam_type"])
        .eq("is_active", True)
    )
    if attempted:
        query = query.not_.in_("id", attempted)
    candidates = (query.limit(CANDIDATE_FETCH_LIMIT).execute().data) or []

    if not candidates:
        return NextQuestionResponse(finished=True)

    chosen = random.choice(candidates)
    options = [ExamQuestionOption(**opt) for opt in chosen["options"]]
    return NextQuestionResponse(
        finished=False,
        question_id=chosen["id"],
        question_text=chosen["question_text"],
        options=options,
        question_index=len(attempted) + 1,
        total_questions=session["total_questions"],
    )


@router.post("/sessions/{session_id}/attempt", response_model=ExamAttemptResponse, status_code=201)
async def submit_attempt(
    session_id: str, attempt_in: ExamAttemptCreate, current_user=Depends(get_current_user)
):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    question_result = (
        supabase_admin.table("exam_questions")
        .select("*")
        .eq("id", attempt_in.question_id)
        .single()
        .execute()
    )
    if not question_result.data:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
    question = question_result.data

    is_correct = attempt_in.selected_option == question["correct_option"]

    xp_awarded = 0
    leveled_up = False
    new_level = None
    if is_correct:
        xp_result = await award_xp(
            user_id=current_user.id, source_type="exam_question", source_id=session_id
        )
        xp_awarded = xp_result.amount_awarded
        leveled_up = xp_result.leveled_up
        new_level = xp_result.level

    try:
        attempt_result = (
            supabase_admin.table("exam_attempts")
            .insert(
                {
                    "session_id": session_id,
                    "question_id": attempt_in.question_id,
                    "selected_option": attempt_in.selected_option,
                    "is_correct": is_correct,
                    "time_taken_ms": attempt_in.time_taken_ms,
                    "xp_awarded": xp_awarded,
                }
            )
            .execute()
        )
    except Exception as e:
        # exam_attempts_session_question_uniq — bu soru bu oturumda zaten cevaplanmış.
        print(f"EXAM_ATTEMPT_INSERT_ERROR: {e}")
        raise HTTPException(status_code=409, detail="Bu soru bu oturumda zaten cevaplandı.")

    if not attempt_result.data:
        raise HTTPException(status_code=500, detail="Deneme kaydedilemedi.")

    new_score = session["score"] + (1 if is_correct else 0)
    new_xp_earned = session["xp_earned"] + xp_awarded
    supabase_admin.table("exam_sessions").update(
        {"score": new_score, "xp_earned": new_xp_earned}
    ).eq("id", session_id).execute()

    return ExamAttemptResponse(
        id=attempt_result.data[0]["id"],
        is_correct=is_correct,
        correct_option=question["correct_option"],
        explanation=question["explanation"],
        related_words=question.get("related_words"),
        xp_awarded=xp_awarded,
        session_score=new_score,
        leveled_up=leveled_up,
        new_level=new_level,
    )


@router.post("/sessions/{session_id}/finish", response_model=ExamFinishResponse)
async def finish_session(session_id: str, current_user=Depends(get_current_user)):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    # Deneme sınavı (timed_mock) tamamlama bonusu — sadece bir kez, finish
    # çağrısında verilir (practice modunda bonus yok, o zaten soru başına XP alır).
    mock_bonus_xp = 0
    if session["session_mode"] == "timed_mock":
        xp_result = await award_xp(
            user_id=current_user.id, source_type="exam_mock_complete", source_id=session_id
        )
        mock_bonus_xp = xp_result.amount_awarded

    ended_at = datetime.now(UTC).isoformat()
    new_xp_earned = session["xp_earned"] + mock_bonus_xp
    update_result = (
        supabase_admin.table("exam_sessions")
        .update({"ended_at": ended_at, "xp_earned": new_xp_earned})
        .eq("id", session_id)
        .execute()
    )
    if not update_result.data:
        raise HTTPException(status_code=500, detail="Oturum kapatılamadı.")

    updated = update_result.data[0]
    return ExamFinishResponse(
        id=updated["id"],
        exam_type=updated["exam_type"],
        session_mode=updated["session_mode"],
        score=updated["score"],
        total_questions=updated["total_questions"],
        xp_earned=updated["xp_earned"],
        started_at=updated["started_at"],
        ended_at=updated["ended_at"],
        mock_bonus_xp=mock_bonus_xp,
    )


@router.post(
    "/questions/{question_id}/add-word",
    response_model=AddWordFromQuestionResponse,
    status_code=201,
)
async def add_word_from_question(question_id: str, current_user=Depends(get_current_user)):
    """Sorunun related_words alanındaki kelime(ler)i kullanıcının kelime
    hazinesine ekler (zaten varsa atlanır). Kullanıcı isteği (devir notu
    §1.1): "buradaki sorulardan kişi kendi kelime havuzuna kelime ekleyebilsin".
    games.py::_sync_word_progress'teki insert şablonuyla tutarlı (bkz. calculate_next_review)."""
    question_result = (
        supabase_admin.table("exam_questions")
        .select("related_words")
        .eq("id", question_id)
        .single()
        .execute()
    )
    if not question_result.data:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")

    related_words = question_result.data.get("related_words") or []
    native_lang, learning_lang = _profile_langs(current_user.id)

    added_count = 0
    already_had_count = 0
    for rw in related_words:
        word_text = rw.get("word")
        if not word_text:
            continue
        existing = (
            supabase_admin.table("words")
            .select("id")
            .eq("user_id", current_user.id)
            .ilike("word", word_text)
            .eq("source_lang", learning_lang)
            .execute()
        ).data
        if existing:
            already_had_count += 1
            continue

        insert_row = {
            "user_id": current_user.id,
            "word": word_text,
            "meaning": rw.get("meaning"),
            "meaning_native": rw.get("meaning"),
            "example": rw.get("example"),
            "source_lang": learning_lang,
            "target_lang": native_lang,
        }
        insert_row.update(calculate_next_review(insert_row, True))
        supabase_admin.table("words").insert(insert_row).execute()
        added_count += 1

    return AddWordFromQuestionResponse(added_count=added_count, already_had_count=already_had_count)
