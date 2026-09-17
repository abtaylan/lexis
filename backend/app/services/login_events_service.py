"""
backend/app/services/login_events_service.py

Her basarili giris/kayit TAMAMLANMA aninda (yani access token istemciye
verildigi an) bir satir kaydeder -- platform (web/ios/android) bazli
istatistikler icin, bkz. migration 075_signup_platform_and_login_events.

Cagiran kod (auth.py) bu fonksiyonu ASLA giris/kayit akisini bozmamali diye
kendi ici try/except ile korunuyor.
"""
from app.core.database import supabase_admin

VALID_PLATFORMS = {"web", "ios", "android"}


def normalize_platform(raw: str | None) -> str:
    """X-Client-Platform header'ini normallestirir; taninmayan/eksik deger
    icin guvenli varsayilan 'web' doner (ör. eski mobil build'ler ya da
    header gondermeyen dogrudan API cagirilari)."""
    value = (raw or "").strip().lower()
    return value if value in VALID_PLATFORMS else "web"


def log_login_event(user_id: str, platform: str | None) -> None:
    if not user_id:
        return
    try:
        supabase_admin.table("login_events").insert({
            "user_id": user_id,
            "platform": normalize_platform(platform),
        }).execute()
    except Exception as e:
        print(f"LOGIN_EVENT log warning: {e}")
