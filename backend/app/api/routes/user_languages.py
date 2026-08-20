"""
backend/app/api/routes/user_languages.py
Kullanicinin ayni anda birden fazla dil ogrenebilmesini saglayan endpoint'ler
(Kullanici istek listesi Madde 2). "/api/v1/me/languages" altinda:
  GET    ""         -> ogrenilen tum diller (+ hangisi aktif, dile ozel gunluk hedef)
  POST   ""         -> yeni bir ogrenme dili ekle
  DELETE "/{code}"  -> bir ogrenme dilini kaldir (en az 1 kalmali)
  PATCH  "/active"  -> aktif ogrenme dilini degistir
"""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.services import learning_languages

router = APIRouter()


class AddLanguageRequest(BaseModel):
    learning_lang: str
    daily_goal: Optional[int] = None


class SetActiveLanguageRequest(BaseModel):
    learning_lang: str


@router.get("")
async def get_my_languages(current_user=Depends(get_current_user)):
    langs = await learning_languages.list_languages(current_user.id)
    return {"languages": langs}


@router.post("", status_code=201)
async def add_my_language(data: AddLanguageRequest, current_user=Depends(get_current_user)):
    return await learning_languages.add_language(
        current_user.id, data.learning_lang, daily_goal=data.daily_goal
    )


@router.delete("/{code}", status_code=204)
async def remove_my_language(code: str, current_user=Depends(get_current_user)):
    await learning_languages.remove_language(current_user.id, code)


@router.patch("/active")
async def set_my_active_language(
    data: SetActiveLanguageRequest, current_user=Depends(get_current_user)
):
    return await learning_languages.set_active_language(current_user.id, data.learning_lang)
