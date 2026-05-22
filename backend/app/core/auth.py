from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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


async def get_current_admin(current_user=Depends(get_current_user)):
    """Admin rolünü kontrol et."""
    profile = (
        supabase_admin.table("profiles")
        .select("role")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    if not profile.data or profile.data.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin yetkisi gerekli"
        )
    return current_user
