"""
backend/app/api/routes/daily_challenge.py

"Gunluk Kelime Avi" -- kullanici-yuzu uclar. Gunun kelimesinin URETIMI
burada YAPILMAZ (cron.py::run_generate_daily_challenges +
daily_challenge_service.generate_daily_word_challenges), bu dosya sadece
oturum acmis kullanicinin BUGUNKU durumunu okur / harf tahmini gonderir.

Yetkilendirilmis kullanicinin dilleri games.py::_get_profile_langs ile
AYNI desende profiles.learning_lang / profiles.native_lang'den okunur.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.daily_challenge import (
    DailyChallengeGuessRequest,
    DailyChallengeGuessResponse,
    DailyChallengeState,
)
from app.services import daily_challenge_service

router = APIRouter()


def _get_profile_langs(user_id: str) -> tuple[str, str]:
    """games.py::_get_profile_langs ile BIREBIR AYNI (kasitli kucuk
    tekrar -- iki dosyayi birbirine bagimli kilmamak icin, kod tabanindaki
    diger route dosyalarinda da (duels.py) ayni desen tekrarlanir)."""
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang, learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    data = profile.data or {}
    return data.get("learning_lang", "en"), data.get("native_lang", "tr")


@router.get("/today", response_model=DailyChallengeState | None)
async def get_today(current_user=Depends(get_current_user)):
    """Bugunun kelime avi durumu. Gunun kelimesi bu dil icin henuz
    olusturulmadiysa (cron henuz calismadi / uygun kelime bulunamadi) `null`
    doner -- istemci bunu CefrBadge/XPBar'daki AYNI soft-disable desenine
    gore ele alir (kart hic gosterilmez)."""
    learning_lang, native_lang = _get_profile_langs(current_user.id)
    result = daily_challenge_service.get_today_challenge(current_user.id, learning_lang, native_lang)
    return result


@router.post("/guess-letter", response_model=DailyChallengeGuessResponse)
async def guess_letter(
    guess_in: DailyChallengeGuessRequest, current_user=Depends(get_current_user)
):
    learning_lang, native_lang = _get_profile_langs(current_user.id)
    try:
        result = await daily_challenge_service.guess_letter(
            current_user.id, learning_lang, native_lang, guess_in.letter
        )
    except ValueError as e:
        if str(e) == "no_challenge_today":
            raise HTTPException(status_code=404, detail="Bugün için henüz bir kelime avi yok.")
        if str(e) == "already_finished":
            raise HTTPException(status_code=400, detail="Bugünün kelime avını zaten tamamladınız.")
        raise HTTPException(status_code=422, detail="Geçerli bir harf girin.")
    return result
