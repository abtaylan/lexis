"""
backend/app/api/routes/push_tokens.py

Mobil uygulama Faz 1 — push bildirim altyapısının temeli (bkz. mobil kapsam
dokümanı, Bölüm 4.3/7 ve migration 017_push_tokens.sql). Bu route SADECE
token kaydını saklar/siler; gerçek bildirim GÖNDERİMİ (Expo Push API'sine
istek atan tetikleyiciler) Faz 2/3'te sosyal olaylar eklendiğinde ayrı bir
notification_sender servisi olarak eklenecek.

Bir kullanıcının birden fazla cihazı olabilir, bu yüzden upsert token
üzerinden yapılır (aynı fiziksel cihaz farklı bir hesapla giriş yaparsa
token'ın sahibi güncellenir).
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import supabase_admin

router = APIRouter()


class PushTokenRegister(BaseModel):
    token: str
    platform: Literal["ios", "android"]
    device_name: str | None = None


class PushTokenUnregister(BaseModel):
    token: str


@router.post("/push-tokens", status_code=201)
async def register_push_token(data: PushTokenRegister, current_user=Depends(get_current_user)):
    payload = {
        "user_id": current_user.id,
        "token": data.token,
        "platform": data.platform,
        "device_name": data.device_name,
    }
    try:
        result = (
            supabase_admin.table("push_tokens")
            .upsert(payload, on_conflict="token")
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=500, detail="Push token kaydedilemedi.")
        return {"message": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"REGISTER_PUSH_TOKEN ERROR: {e}")
        raise HTTPException(status_code=500, detail="Push token kaydedilemedi.")


@router.delete("/push-tokens", status_code=204)
async def unregister_push_token(data: PushTokenUnregister, current_user=Depends(get_current_user)):
    supabase_admin.table("push_tokens").delete().eq("token", data.token).eq(
        "user_id", current_user.id
    ).execute()
