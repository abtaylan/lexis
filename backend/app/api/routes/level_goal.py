"""
backend/app/api/routes/level_goal.py

Kullanici istegi (3 Kasim 2026): Ana sayfa "hedef seviyeye ilerleme"
widget'i -- GET ile su anki durum (yuzde + aci bilesenler) okunur, PATCH
ile hedef CEFR seviyesi secilir/degistirilir. Mantik: app/services/
level_goal_service.py.

study_program.py ile AYNI desen: aktif ogrenme dili profiles.learning_lang
aynasindan okunuyor (coklu dil destegi icin bkz. learning_languages.py).
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.services import level_goal_service as lgs

router = APIRouter()


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


class SetTargetLevelRequest(BaseModel):
    target_level: str


@router.get("")
async def get_level_goal(current_user=Depends(get_current_user)):
    learning_lang = _learning_lang(current_user.id)
    return lgs.get_level_goal(current_user.id, learning_lang)


@router.patch("")
async def set_level_goal(data: SetTargetLevelRequest, current_user=Depends(get_current_user)):
    learning_lang = _learning_lang(current_user.id)
    try:
        return lgs.set_target_level(current_user.id, learning_lang, data.target_level.lower())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
