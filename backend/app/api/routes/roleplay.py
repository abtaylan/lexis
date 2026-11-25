"""
backend/app/api/routes/roleplay.py

"Roleplay/diyalog botu" -- kullanici-yuzu uclar. 25 Kasim 2026'da dallanan
diyalog modeline gecis: ICERIK STATIK oldugu icin CANLI ANTHROPIC API
CAGRISI YOK (bkz. roleplay_service.py modul docstring'i) -- eski
run_in_threadpool sarmalayicisina artik gerek yok (Supabase cagrilari
disinda bekleme yok; choose_option/finish_session sadece award_xp icin
async).
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.roleplay import (
    RoleplayCategory,
    RoleplayChoiceCreate,
    RoleplayChoiceResponse,
    RoleplayFinishResponse,
    RoleplaySessionResponse,
    RoleplaySessionStart,
)
from app.services import roleplay_service

router = APIRouter()


def _get_profile_langs(user_id: str) -> tuple[str, str]:
    """games.py::_get_profile_langs ile AYNI (kasitli kucuk tekrar --
    diger route/servis dosyalarinda da ayni kucuk tekrar deseni var)."""
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
        "unknown_node": 404,
        "session_not_found": 404,
        "invalid_option": 422,
        "session_completed": 400,
    }.get(code.split(":")[0], 502)


def _detail_for(code: str) -> str:
    base = code.split(":")[0]
    return {
        "unknown_scenario": "Böyle bir senaryo yok.",
        "unknown_node": "Bir şeyler ters gitti, lütfen baştan başlayın.",
        "session_not_found": "Oturum bulunamadı.",
        "invalid_option": "Geçersiz seçenek.",
        "session_completed": "Bu oturum zaten tamamlandı.",
    }.get(base, "Bir şeyler ters gitti, tekrar deneyin.")


@router.get("/categories", response_model=list[RoleplayCategory])
async def list_categories():
    return roleplay_service.list_categories()


@router.post("/sessions", response_model=RoleplaySessionResponse)
async def start_session(body: RoleplaySessionStart, current_user=Depends(get_current_user)):
    learning_lang, native_lang = _get_profile_langs(current_user.id)
    try:
        result = roleplay_service.start_session(
            current_user.id, body.scenario_slug, learning_lang, native_lang
        )
    except roleplay_service.RoleplayError as e:
        raise HTTPException(status_code=_error_status(str(e)), detail=_detail_for(str(e)))
    return result


@router.post("/sessions/{session_id}/choices", response_model=RoleplayChoiceResponse)
async def choose_option(
    session_id: str, body: RoleplayChoiceCreate, current_user=Depends(get_current_user)
):
    try:
        result = await roleplay_service.choose_option(current_user.id, session_id, body.option_id)
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
