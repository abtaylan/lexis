import random
import string
import time
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException

from app.core.config import settings
from app.core.database import supabase_admin
from app.services.email_service import send_otp_email
from app.services.notification_log import log_notification


def _generate_code(email: str) -> str:
    is_test = bool(settings.OTP_TEST_EMAIL_SUFFIX) and email.lower().endswith(settings.OTP_TEST_EMAIL_SUFFIX.lower())
    if settings.OTP_MODE != "real" or is_test:
        return settings.OTP_FIXED_CODE
    return "".join(random.choices(string.digits, k=6))


def _parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _latest_pending(email: str, purpose: str) -> dict | None:
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
    access_token: str | None = None,
    refresh_token: str | None = None,
) -> str:
    """
    Yeni bir OTP kodu üretir, DB'ye yazar ve e-posta ile gönderir (OTP_MODE=real ise).
    access_token/refresh_token verilirse (login/register sırasında zaten bootstraplanan
    Supabase session'ı) doğrulama başarılı olduğunda client'a bu token'lar döndürülür.

    Aynı email+purpose için önceki doğrulanmamış kodlar geçersiz kılınır — böylece
    her zaman en fazla bir geçerli kod olur.
    """
    email = email.strip().lower()
    now = datetime.now(UTC)

    try:
        supabase_admin.table("otp_codes").update({"expires_at": now.isoformat()}).eq(
            "email", email
        ).eq("purpose", purpose).eq("verified", False).execute()
    except Exception as e:
        print(f"OTP invalidate warning: {e}")

    code = _generate_code(email)
    expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    insert_payload = {
        "email": email,
        "code": code,
        "purpose": purpose,
        "session_access_token": access_token,
        "session_refresh_token": refresh_token,
        "expires_at": expires_at.isoformat(),
    }

    # KOK NEDEN (4 Ekim 2026 -- Behcet'in kendi giris raporu + Rukiye'nin sifre
    # sifirlama kodunun hic gelmemesi raporu): Railway<->Supabase arasinda ara
    # sira gorulen PostgREST "Thread killed by timeout manager" / gecici
    # baglanti hatalarinda bu insert ESKIDEN try/except'SIZ'di -- tek seferlik
    # bir hata direkt yukari (login()'deki genis except'e, ya da forgot_password
    # icindeki sessizce yutan except'e) firliyor, kullaniciya ya YANLIS "Email
    # veya sifre hatali" mesaji gosteriliyor ya da sifre sifirlama kodu hic
    # gonderilmeden endpoint yine de "kod gonderildi" diye basariyla donuyordu.
    # Simdi: kisa bir gecikmeyle BIR kez daha deniyoruz (gecici hatalarin cogu
    # boylece kendiliginden duzeliyor); yine de basarisiz olursa notification_log'a
    # 'failed' kaydi düşüyoruz (boylece Supabase SQL ile sonradan denetlenebilir,
    # sadece Railway'in gecici print log'larina bagli kalinmiyor) ve cagirana
    # (login/forgot_password) anlasilir, DURUMU GIZLEMEYEN bir hata firlatiyoruz.
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            supabase_admin.table("otp_codes").insert(insert_payload).execute()
            last_error = None
            break
        except Exception as e:
            last_error = e
            print(f"OTP insert error (attempt {attempt + 1}/2) for {email}/{purpose}: {e}")
            if attempt == 0:
                time.sleep(0.6)

    if last_error is not None:
        log_notification(
            "email",
            "otp",
            email,
            "failed",
            {"purpose": purpose, "stage": "db_insert", "error": str(last_error)},
        )
        raise HTTPException(
            status_code=503,
            detail="Kod oluşturulamadı, sunucuda geçici bir sorun oluştu. Lütfen birkaç saniye sonra tekrar deneyin.",
        )

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

    if datetime.now(UTC) > _parse_dt(row["expires_at"]):
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


def has_ever_verified(email: str, purpose: str) -> bool:
    """
    Bu email+purpose için daha önce BAŞARIYLA doğrulanmış (verified=True) bir
    OTP kaydı var mı? register() akışında "yarıda kalmış" kayıtları (auth.users'ta
    oluşturulmuş ama kullanıcı ağ kopması/uygulama kapanması vb. yüzünden OTP
    ekranını hiç tamamlayamamış) gerçek/tamamlanmış kayıtlardan ayırt etmek için
    kullanılır — bkz. auth.py register(), 31 Ağustos 2026 gerçek kullanıcı raporu.
    """
    email = email.strip().lower()
    res = (
        supabase_admin.table("otp_codes")
        .select("id")
        .eq("email", email)
        .eq("purpose", purpose)
        .eq("verified", True)
        .limit(1)
        .execute()
    )
    return bool(res.data)


def resend_otp(email: str, purpose: str) -> None:
    email = email.strip().lower()
    row = _latest_pending(email, purpose)
    if not row:
        raise HTTPException(
            status_code=400, detail="Bekleyen bir doğrulama isteği bulunamadı."
        )

    elapsed = datetime.now(UTC) - _parse_dt(row["created_at"])
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
