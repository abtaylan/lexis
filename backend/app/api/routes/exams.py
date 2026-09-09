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

9 Eylül 2026 — İstatistik & İçerik Motoru Faz 2 eklendi: kullanıcılar kendi
soru önerilerini gönderebiliyor (POST /questions/suggest, status=pending
olarak düşer), adminler bu kuyruğu görüp onaylayıp/reddedebiliyor
(GET/POST /admin/questions/...). next_question ve list_exam_types artık
sadece status=approved sorularla çalışıyor — pending/rejected sorular
kullanıcıya hiç gösterilmiyor (bkz. supabase/migrations/026_exam_prep_stats_and_content.sql).
"""

import random
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_admin, get_current_admin_full, get_current_user
from app.core.database import supabase_admin
from app.schemas.exams import (
    AddWordFromQuestionResponse,
    AIQuestionGenerateRequest,
    AIQuestionGenerateResult,
    ExamAttemptCreate,
    ExamAttemptResponse,
    ExamFinishResponse,
    ExamQuestionModerationResponse,
    ExamQuestionOption,
    ExamQuestionSuggestionCreate,
    ExamQuestionSuggestionResponse,
    ExamSessionCreate,
    ExamSessionResponse,
    ExamTypeInfo,
    NextQuestionResponse,
    PendingExamQuestion,
)
from app.services.audit_log import log_admin_action
from app.services.exam_question_generator import (
    ExamQuestionGenerationError,
    generate_questions,
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
        # status=approved filtresi: pending/rejected sorular sayıya dahil değil
        # (kullanıcı katkısı/AI üretimi onay bekleyen sorular "kaç soru var"
        # göstergesini şişirmesin).
        result = (
            supabase_admin.table("exam_questions")
            .select("id")
            .eq("exam_type", exam_type)
            .eq("is_active", True)
            .eq("status", "approved")
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

    _, learning_lang = _profile_langs(current_user.id)

    row = {
        "user_id": current_user.id,
        "exam_type": exam_type,
        "session_mode": session_in.session_mode.value,
        "total_questions": total_questions,
        "time_limit_seconds": time_limit_seconds,
        "score": 0,
        "xp_earned": 0,
        "learning_lang": learning_lang,
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
        .eq("status", "approved")
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


# ── İstatistik & İçerik Motoru Faz 2: kullanıcı soru önerisi ───────────


@router.post("/questions/suggest", response_model=ExamQuestionSuggestionResponse, status_code=201)
async def suggest_question(
    payload: ExamQuestionSuggestionCreate, current_user=Depends(get_current_user)
):
    """Kullanıcı kendi sorusunu önerir — status=pending olarak kaydedilir,
    next_question/list_exam_types onaylanmadan (status=approved) bu soruyu
    hiç görmez. Admin GET/POST /admin/questions/... ile onaylar/reddeder."""
    if not _exam_area_enabled(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Sınav Hazırlık Alanı şu an sadece İngilizce öğrenen, ana dili Türkçe olan kullanıcılar için kullanılabilir.",
        )

    option_ids = [opt.id for opt in payload.options]
    if len(set(option_ids)) != len(option_ids):
        raise HTTPException(status_code=422, detail="Şık id'leri birbirinden farklı olmalı.")
    if payload.correct_option not in option_ids:
        raise HTTPException(
            status_code=422, detail="correct_option, options listesindeki bir id ile eşleşmeli."
        )

    _, learning_lang = _profile_langs(current_user.id)

    row = {
        "exam_type": payload.exam_type.value,
        "question_text": payload.question_text,
        "options": [opt.model_dump() for opt in payload.options],
        "correct_option": payload.correct_option,
        "explanation": payload.explanation,
        "topic_tag": payload.topic_tag,
        "learning_lang": learning_lang,
        "source_type": "user",
        "status": "pending",
        "submitted_by": current_user.id,
        "is_active": True,
    }
    result = supabase_admin.table("exam_questions").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Soru önerisi kaydedilemedi.")

    created = result.data[0]
    return ExamQuestionSuggestionResponse(id=created["id"], status=created["status"])


# ── İstatistik & İçerik Motoru Faz 2: admin moderasyon kuyruğu ────────
# admin.py'deki RBAC desenini izler: get_current_admin salt-okunur listeleme
# için yeterli, get_current_admin_full mutasyon (onay/red) için zorunlu.


@router.get("/admin/questions/pending", response_model=list[PendingExamQuestion])
async def list_pending_questions(admin=Depends(get_current_admin)):
    result = (
        supabase_admin.table("exam_questions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", desc=False)
        .execute()
    )
    rows = result.data or []

    email_map: dict[str, str] = {}
    submitter_ids = {r["submitted_by"] for r in rows if r.get("submitted_by")}
    if submitter_ids:
        try:
            page = supabase_admin.auth.admin.list_users()
            users = page if isinstance(page, list) else getattr(page, "users", [])
            for u in users:
                if u.id in submitter_ids:
                    email_map[u.id] = u.email
        except Exception as e:
            print(f"LIST_PENDING_QUESTIONS email map warning: {e}")

    return [
        PendingExamQuestion(
            id=r["id"],
            exam_type=r["exam_type"],
            learning_lang=r["learning_lang"],
            question_text=r["question_text"],
            options=[ExamQuestionOption(**opt) for opt in r["options"]],
            correct_option=r["correct_option"],
            explanation=r.get("explanation"),
            topic_tag=r.get("topic_tag"),
            source_type=r["source_type"],
            submitted_by=r.get("submitted_by"),
            submitted_by_email=email_map.get(r.get("submitted_by")),
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.post(
    "/admin/questions/{question_id}/approve", response_model=ExamQuestionModerationResponse
)
async def approve_question(question_id: str, admin=Depends(get_current_admin_full)):
    result = (
        supabase_admin.table("exam_questions")
        .update({"status": "approved"})
        .eq("id", question_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
    log_admin_action(admin.id, admin.email, "exam_question.approve", "exam_question", question_id)
    return ExamQuestionModerationResponse(id=question_id, status="approved")


@router.post(
    "/admin/questions/{question_id}/reject", response_model=ExamQuestionModerationResponse
)
async def reject_question(question_id: str, admin=Depends(get_current_admin_full)):
    result = (
        supabase_admin.table("exam_questions")
        .update({"status": "rejected"})
        .eq("id", question_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
    log_admin_action(admin.id, admin.email, "exam_question.reject", "exam_question", question_id)
    return ExamQuestionModerationResponse(id=question_id, status="rejected")


# ── İstatistik & İçerik Motoru Faz 2b: AI ile soru üretimi (admin) ────
# Üretilen sorular DOĞRUDAN havuza girmez — kullanıcı önerileriyle aynı
# moderasyon kuyruğundan geçer (source_type='ai', status='pending').
# get_current_admin_full zorunlu: bu bir mutasyon + ücretli AI API çağrısı.


@router.post("/admin/questions/generate-ai", response_model=AIQuestionGenerateResult)
async def generate_ai_questions(
    payload: AIQuestionGenerateRequest, admin=Depends(get_current_admin_full)
):
    try:
        questions = generate_questions(
            payload.exam_type.value, payload.count, payload.topic_tag
        )
    except ExamQuestionGenerationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    rows = [
        {
            "exam_type": payload.exam_type.value,
            "learning_lang": "en",
            "question_text": q["question_text"],
            "options": q["options"],
            "correct_option": q["correct_option"],
            "explanation": q["explanation"],
            "topic_tag": q["topic_tag"],
            "source_type": "ai",
            "status": "pending",
            "is_active": True,
        }
        for q in questions
    ]
    result = supabase_admin.table("exam_questions").insert(rows).execute()
    created_ids = [row["id"] for row in (result.data or [])]

    log_admin_action(
        admin.id,
        admin.email,
        "exam_question.generate_ai",
        "exam_type",
        payload.exam_type.value,
        {
            "requested": payload.count,
            "created": len(created_ids),
            "topic_tag": payload.topic_tag,
        },
    )

    return AIQuestionGenerateResult(
        requested=payload.count, created=len(created_ids), question_ids=created_ids
    )
