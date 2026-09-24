"""
backend/app/api/routes/roleplay.py

"Roleplay/diyalog botu" -- kullanici-yuzu uclar. bkz.
roleplay_service.py modul docstring'i. Her canli Anthropic API cagrisi
(_call_model, senkron SDK) run_in_threadpool ile sarmalanir -- cron.py'deki
AYNI desen, burada ilk kez bir KULLANICI ISTEGI (cron degil) icin
kullaniliyor: FastAPI'nin event loop'unu bloklamadan senkron bir SDK
cagirmanin standart yolu.
"""

from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.roleplay import (
    RoleplayFinishResponse,
    RoleplayMessageCreate,
    RoleplayMessageResponse,
    RoleplayScenario,
    RoleplaySessionResponse,
    RoleplaySessionStart,
)
from app.services import roleplay_service

router = APIRouter()


def _get_profile_langs(user_id: str) -> tuple[str, str]:
    """games.py::_get_profile_langs ile AYNI (kasitli kucuk tekrar --
    daily_challenge.py'de de ayni desen)."""
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang, learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    data = profile.data or {}
    return data.get("learning_lang", "en"), data.get("native_lang", "tr")


def _error_status(code: str) -> int:
    return {
        "unknown_scenario": 404,
        "session_not_found": 404,
        "empty_message": 422,
        "message_too_long": 422,
        "session_completed": 400,
        "max_turns_reached": 400,
        "ai_not_configured": 503,
        "ai_empty_response": 502,
    }.get(code.split(":")[0], 502)


def _detail_for(code: str) -> str:
    base = code.split(":")[0]
    return {
        "unknown_scenario": "Böyle bir senaryo yok.",
        "session_not_found": "Oturum bulunamadı.",
        "empty_message": "Boş mesaj gönderilemez.",
        "message_too_long": "Mesaj çok uzun.",
        "session_completed": "Bu oturum zaten tamamlandı.",
        "max_turns_reached": "Bu oturumda tur sınırına ulaşıldı, lütfen bitirin.",
        "ai_not_configured": "Roleplay şu anda kullanılamıyor.",
        "ai_empty_response": "Bot yanıt üretemedi, tekrar deneyin.",
    }.get(base, "Bir şeyler ters gitti, tekrar deneyin.")


@router.get("/scenarios", response_model=list[RoleplayScenario])
async def list_scenarios():
    return [
        RoleplayScenario(slug=s["slug"], title_tr=s["title_tr"], title_en=s["title_en"])
        for s in roleplay_service.list_scenarios()
    ]


@router.post("/sessions", response_model=RoleplaySessionResponse)
async def start_session(body: RoleplaySessionStart, current_user=Depends(get_current_user)):
    learning_lang, native_lang = _get_profile_langs(current_user.id)
    try:
        result = await run_in_threadpool(
            roleplay_service.start_session, current_user.id, body.scenario_slug, learning_lang, native_lang
        )
    except roleplay_service.RoleplayError as e:
        raise HTTPException(status_code=_error_status(str(e)), detail=_detail_for(str(e)))
    return result


@router.post("/sessions/{session_id}/messages", response_model=RoleplayMessageResponse)
async def send_message(
    session_id: str, body: RoleplayMessageCreate, current_user=Depends(get_current_user)
):
    try:
        result = await run_in_threadpool(
            roleplay_service.send_message, current_user.id, session_id, body.content
        )
    except roleplay_service.RoleplayError as e:
        raise HTTPException(status_code=_error_status(str(e)), detail=_detail_for(str(e)))
    return result


@router.post("/sessions/{session_id}/finish", response_model=RoleplayFinishResponse)
async def finish_session(session_id: str, current_user=Depends(get_current_user)):
    try:
        result = await roleplay_service.finish_session(current_user.id, session_id)
    except roleplay_service.RoleplayError as e:
        raise HTTPException(status_code=_error_status(str(e)), detail=_detail_for(str(e)))
    return result
