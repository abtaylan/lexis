from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.database import supabase_admin
from app.core.auth import get_current_user

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    username: Optional[str] = None
    native_lang: Optional[str] = "tr"
    learning_lang: Optional[str] = "en"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    daily_goal: Optional[int] = None
    native_lang: Optional[str] = None
    learning_lang: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None


def _friendly_auth_error(msg: str) -> str:
    low = msg.lower()
    if "already" in low or "registered" in low or "exists" in low:
        return "Bu e-posta zaten kayıtlı."
    if "password" in low and "weak" in low:
        return "Şifre çok zayıf, en az 6 karakter girin."
    if "invalid" in low and "email" in low:
        return "Geçersiz e-posta adresi."
    return "Kayıt başarısız. Lütfen bilgilerinizi kontrol edin."


@router.post("/register", status_code=201)
async def register(req: RegisterRequest):
    try:
        result = supabase_admin.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {"data": {
                "display_name": req.display_name,
                "username": req.username or req.email.split("@")[0],
            }}
        })
        if result.user is None:
            raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı.")

        # Dil tercihlerini profiles'a yaz (trigger sadece id/display_name/username ekliyor)
        try:
            supabase_admin.table("profiles").update({
                "native_lang":   req.native_lang or "tr",
                "learning_lang": req.learning_lang or "en",
                "username":      req.username or req.email.split("@")[0],
            }).eq("id", result.user.id).execute()
        except Exception as e:
            print(f"REGISTER profile update warning: {e}")

        return {"message": "Kayıt başarılı."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"REGISTER ERROR: {e}")
        raise HTTPException(status_code=400, detail=_friendly_auth_error(str(e)))


@router.post("/login")
async def login(req: LoginRequest):
    try:
        result = supabase_admin.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        if not result.session:
            raise HTTPException(status_code=401, detail="Email veya şifre hatalı.")
        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "user": {
                "id": result.user.id,
                "email": result.user.email,
                "display_name": result.user.user_metadata.get("display_name", ""),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"LOGIN ERROR: {e}")
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı.")


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    try:
        result = supabase_admin.auth.refresh_session(refresh_token)
        return {"access_token": result.session.access_token}
    except Exception:
        raise HTTPException(status_code=401, detail="Token yenilenemedi.")


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    try:
        profile = (
            supabase_admin.table("profiles")
            .select("*")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        data = profile.data or {}
        return {
            "id":            current_user.id,
            "email":         current_user.email,
            "display_name":  data.get("display_name", ""),
            "username":      data.get("username", ""),
            "role":          data.get("role", "user"),
            "daily_goal":    data.get("daily_goal", 5),
            "native_lang":   data.get("native_lang", "tr"),
            "learning_lang": data.get("learning_lang", "en"),
            "is_admin":      data.get("role") == "admin",
            "created_at":    data.get("created_at", ""),
            "is_premium":    data.get("is_premium", False),
            "premium_until": data.get("premium_until"),
        }
    except Exception as e:
        print(f"GET_ME ERROR: {e}")
        raise HTTPException(status_code=500, detail="Profil alınamadı.")


@router.patch("/profile")
async def update_profile(data: ProfileUpdate, current_user=Depends(get_current_user)):
    payload = data.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok.")

    # ── Auth tarafı: e-posta / şifre (auth.users'da tutulur) ──
    auth_update = {}
    if "email" in payload:
        auth_update["email"] = payload.pop("email")
    if "password" in payload:
        pwd = payload.pop("password")
        if len(pwd) < 6:
            raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalı.")
        auth_update["password"] = pwd

    if auth_update:
        try:
            supabase_admin.auth.admin.update_user_by_id(current_user.id, auth_update)
        except Exception as e:
            msg = str(e).lower()
            if "already" in msg or "registered" in msg or "exists" in msg:
                raise HTTPException(status_code=409, detail="Bu e-posta zaten kullanılıyor.")
            print(f"UPDATE_PROFILE auth error: {e}")
            raise HTTPException(status_code=400, detail="E-posta / şifre güncellenemedi.")

    # ── Profiles tablosu: display_name, username, daily_goal, diller ──
    if payload:
        # username benzersizlik kontrolü
        if "username" in payload:
            dup = (
                supabase_admin.table("profiles")
                .select("id")
                .eq("username", payload["username"])
                .neq("id", current_user.id)
                .execute()
            )
            if dup.data:
                raise HTTPException(status_code=409, detail="Bu kullanıcı adı alınmış.")
        try:
            supabase_admin.table("profiles").update(payload).eq("id", current_user.id).execute()
        except Exception as e:
            print(f"UPDATE_PROFILE profile error: {e}")
            raise HTTPException(status_code=500, detail="Profil güncellenemedi.")

    # Güncel profili döndür
    profile = (
        supabase_admin.table("profiles").select("*").eq("id", current_user.id).single().execute()
    )
    d = profile.data or {}
    new_email = auth_update.get("email", current_user.email)
    return {
        "id":            current_user.id,
        "email":         new_email,
        "display_name":  d.get("display_name", ""),
        "username":      d.get("username", ""),
        "role":          d.get("role", "user"),
        "daily_goal":    d.get("daily_goal", 5),
        "native_lang":   d.get("native_lang", "tr"),
        "learning_lang": d.get("learning_lang", "en"),
        "is_admin":      d.get("role") == "admin",
        "created_at":    d.get("created_at", ""),
        "is_premium":    d.get("is_premium", False),
        "premium_until": d.get("premium_until"),
    }
