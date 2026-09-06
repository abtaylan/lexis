import logging
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import supabase_admin

logger = logging.getLogger(__name__)
security = HTTPBearer()


def _touch_last_seen(user_id: str) -> None:
    """
    profiles.last_seen_at'i günceller — admin panelin "şu an aktif kullanıcı"
    sayacı (bkz. admin_platform.py::live_activity) bu alana bakıyor. Kolon
    şemada zaten vardı ama hiçbir yerden yazılmıyordu (4 Eylül 2026'da admin
    panel incelemesinde fark edildi). Web ve mobil AYNI backend'i kullandığı
    için buraya tek bir yerden eklemek ikisini de kapsıyor.

    Best-effort: burası her authenticated istekte çalıştığından bir hata
    asla auth akışını bozmamalı — sadece logla ve devam et. Trafik büyürse
    (şu an ~60 kullanıcı) bu senkron update'i throttle etmek/kuyruğa almak
    gerekebilir; şimdilik gerekli değil.
    """
    try:
        supabase_admin.table("profiles").update(
            {"last_seen_at": datetime.now(UTC).isoformat()}
        ).eq("id", user_id).execute()
    except Exception:
        logger.warning("last_seen_at güncellenemedi (user_id=%s)", user_id, exc_info=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """JWT token'ı doğrula, kullanıcıyı döndür."""
    token = credentials.credentials
    try:
        user = supabase_admin.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Geçersiz token"
            )
        _touch_last_seen(user.user.id)
        return user.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token doğrulanamadı"
        )


def _get_role(user_id: str) -> str | None:
    profile = (
        supabase_admin.table("profiles")
        .select("role")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return profile.data.get("role") if profile.data else None


# Madde 1d — Admin panel RBAC: 'admin' (tam yetki) ve 'admin_readonly'
# (salt görüntüleme) rolleri var (bkz. supabase/migrations/013_admin_platform.sql).
ADMIN_ROLES = {"admin", "admin_readonly"}


async def get_current_admin(current_user=Depends(get_current_user)):
    """
    Herhangi bir admin rolünü kabul eder ('admin' ya da 'admin_readonly').
    Sadece OKUMA (GET) endpoint'lerinde kullanılmalı — mutasyon yapan
    endpoint'ler için get_current_admin_full kullanılmalı.
    """
    role = _get_role(current_user.id)
    if role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin yetkisi gerekli"
        )
    return current_user


async def get_current_admin_full(current_user=Depends(get_current_user)):
    """
    Sadece tam yetkili 'admin' rolünü kabul eder — 'admin_readonly' burada
    reddedilir. Kullanıcı oluşturma/rol değiştirme/deaktif etme, kelime
    havuzu düzenleme gibi TÜM mutasyon endpoint'leri bunu kullanmalı.
    """
    role = _get_role(current_user.id)
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için tam admin yetkisi gerekli (salt-okunur admin yetersiz)."
        )
    return current_user
