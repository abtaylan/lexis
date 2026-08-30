from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import supabase_admin

security = HTTPBearer()


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
        return user.user
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
