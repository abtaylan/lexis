import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException

from app.core.config import settings
from app.core.database import supabase_admin
from app.services.email_service import send_otp_email


def _generate_code() -> str:
    if settings.OTP_MODE != "real":
        return settings.OTP_FIXED_CODE
    return "".join(random.choices(string.digits, k=6))


def _parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _latest_pending(email: str, purpose: str) -> Optional[dict]:
    res = (
        supabase_admin.table("otp_codes")
        .select("*")
        .eq("email", email)
        .eq("purpose", purpose)
        .eq("verified", False)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def create_otp(
    email: str,
    purpose: str,
    access_token: Optional[str] = None,
    refresh_token: Optional[str] = None,
) -> str:
    """
    Yeni bir OTP kodu üretir, DB'ye yazar ve e-posta ile gönderir (OTP_MODE=real ise).
    access_token/refresh_token verilirse (login/register sırasında zaten bootstraplanan
    Supabase session'ı) doğrulama başarılı olduğunda client'a bu token'lar döndürülür.

    Aynı email+purpose için önceki doğrulanmamış kodlar geçersiz kılınır — böylece
    her zaman en fazla bir geçerli kod olur.
    """
    email = email.strip().lower()
    now = datetime.now(timezone.utc)

    try:
        supabase_admin.table("otp_codes").update({"expires_at": now.isoformat()}).eq(
            "email", email
        ).eq("purpose", purpose).eq("verified", False).execute()
    except Exception as e:
        print(f"OTP invalidate warning: {e}")

    code = _generate_code()
    expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    supabase_admin.table("otp_codes").insert(
        {
            "email": email,
            "code": code,
            "purpose": purpose,
            "session_access_token": access_token,
            "session_refresh_token": refresh_token,
            "expires_at": expires_at.isoformat(),
        }
    ).execute()

    send_otp_email(email, code, purpose)
    return code


def verify_otp(email: str, purpose: str, code: str) -> dict:
    email = email.strip().lower()
    row = _latest_pending(email, purpose)
    if not row:
        raise HTTPException(
            status_code=400,
            detail="Doğrulama kodu bulunamadı. Lütfen tekrar giriş/kayıt yapın.",
        )

    if datetime.now(timezone.utc) > _parse_dt(row["expires_at"]):
        raise HTTPException(status_code=400, detail="Kodun süresi doldu. Yeni kod isteyin.")

    if row["attempts"] >= settings.OTP_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429, detail="Çok fazla hatalı deneme yapıldı. Yeni kod isteyin."
        )

    if row["code"] != code.strip():
        supabase_admin.table("otp_codes").update({"attempts": row["attempts"] + 1}).eq(
            "id", row["id"]
        ).execute()
        raise HTTPException(status_code=400, detail="Kod hatalı.")

    supabase_admin.table("otp_codes").update({"verified": True}).eq("id", row["id"]).execute()
    return row


def resend_otp(email: str, purpose: str) -> None:
    email = email.strip().lower()
    row = _latest_pending(email, purpose)
    if not row:
        raise HTTPException(
            status_code=400, detail="Bekleyen bir doğrulama isteği bulunamadı."
        )

    elapsed = datetime.now(timezone.utc) - _parse_dt(row["created_at"])
    if elapsed < timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS):
        wait = settings.OTP_RESEND_COOLDOWN_SECONDS - int(elapsed.total_seconds())
        raise HTTPException(
            status_code=429, detail=f"Yeni kod istemeden önce {wait} saniye bekleyin."
        )

    create_otp(
        email=email,
        purpose=purpose,
        access_token=row.get("session_access_token"),
        refresh_token=row.get("session_refresh_token"),
    )
