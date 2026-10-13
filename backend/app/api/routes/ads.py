"""
backend/app/api/routes/ads.py

Odullu reklam (AdMob rewarded) bonusu. Mobil istemci, kullanici reklami sonuna
kadar izleyip odulu kazandiginda (onUserEarnedReward) bu ucu cagirir ve kucuk
bir bonus XP alir.

Kotuye kullanim sinirlari (istemci self-report eder, o yuzden sunucu tarafi
sinir sart):
  - gunde en fazla DAILY_LIMIT kez,
  - iki odul arasinda en az MIN_INTERVAL_SECONDS (bir reklam izlemek zaten
    onlarca saniye surer, bundan hizli ardisik cagri sahte kabul edilir).
Premium kullanicilar reklam gormedigi icin bu ucu kullanmaz; yine de
cagirirlarsa reddedilmez (zararsiz), ayni sinirlar uygulanir.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.services.xp_service import award_xp

router = APIRouter()

DAILY_LIMIT = 5
MIN_INTERVAL_SECONDS = 20


@router.get("/reward-status")
async def reward_status(current_user=Depends(get_current_user)):
    used = _today_count(current_user.id)
    return {"used_today": used, "daily_limit": DAILY_LIMIT, "remaining": max(0, DAILY_LIMIT - used)}


def _today_events(user_id: str):
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        supabase_admin.table("xp_events")
        .select("created_at")
        .eq("user_id", user_id)
        .eq("source_type", "ad_reward")
        .gte("created_at", start.isoformat())
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )


def _today_count(user_id: str) -> int:
    return len(_today_events(user_id))


@router.post("/reward")
async def claim_reward(current_user=Depends(get_current_user)):
    events = _today_events(current_user.id)
    if len(events) >= DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="Daily ad reward limit reached")
    if events:
        last = datetime.fromisoformat(events[0]["created_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) - last < timedelta(seconds=MIN_INTERVAL_SECONDS):
            raise HTTPException(status_code=429, detail="Too many requests")
    result = await award_xp(user_id=current_user.id, source_type="ad_reward")
    return {
        "xp_awarded": result.amount_awarded,
        "total_xp": result.total_xp,
        "level": result.level,
        "remaining": max(0, DAILY_LIMIT - len(events) - 1),
    }
