import base64
import json

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from supabase import create_client
from app.core.config import settings
from app.core.database import supabase_admin
from app.core.auth import get_current_user
from app.services import otp_service

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

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str
    purpose: Literal["login", "register"]

class ResendOtpRequest(BaseModel):
    email: EmailStr
    purpose: Literal["login", "register"]

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

def _bootstrap_session(email: str, password: str):
    """
    Kullanıcı için bir Supabase session (access/refresh token) bootstraplar.

    KRİTİK: Bunun için supabase_admin (service_role client) DEĞİL, anon key ile
    yeni ve ayrı bir client kullanılır. supabase-py'de aynı client örneği
    üzerinde .auth.sign_in_with_password() çağırmak, o client'ın sonraki
    .table() isteklerinin service_role yerine giriş yapan kullanıcının JWT'siyle
    gönderilmesine sebep oluyor (client'ın paylaşılan oturum durumu değişiyor).
    supabase_admin uygulama boyunca paylaşılan tek bir global client olduğu için
    bunu asla mutasyona uğratmamak gerekiyor — aksi halde otp_codes gibi
    service_role'e özel tablolara yazarken RLS ihlali (42501) alınıyor.
    """
    temp_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    result = temp_client.auth.sign_in_with_password({"email": email, "password": password})
    if not result.session:
        return None, None
    return result.session.access_token, result.session.refresh_token

def _decode_jwt_payload(token: str) -> dict:
    """JWT'nin payload kısmını (doğrulama yapmadan) çözer — imzayı kontrol etmeye
    gerek yok çünkü bu token'ı zaten kendi Supabase Auth'umuz üretti."""
    try:
        payload_b64 = token.split(".")[1]
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        return json.loads(base64.urlsafe_b64decode(padded))
    except Exception:
        return {}

@router.post("/register", status_code=201)
async def register(req: RegisterRequest):
    try:
        # KRİTİK: sign_up da supabase_admin ÜZERİNDE çağrılırsa (autoconfirm açık
        # olduğu için sign_up doğrudan bir session döndürüyor) supabase_admin'in
        # paylaşılan oturumu yine kirlenir — bu yüzden sign_up de ayrı bir
        # (anon key'li) temp client ile yapılıyor, supabase_admin sadece
        # .table() işlemleri için service_role olarak temiz kalıyor.
        temp_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        result = temp_client.auth.sign_up({
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
            supabase_admin.table("profiles").upsert({
                "id": result.user.id,
                "display_name": req.display_name,
                "native_lang": req.native_lang or "tr",
                "learning_lang": req.learning_lang or "en",
                "username": req.username or req.email.split("@")[0],
            }).execute()
        except Exception as e:
            print(f"REGISTER profile update warning: {e}")

        # sign_up autoconfirm açıkken zaten bir session döndürüyor — genelde
        # ayrıca sign_in yapmaya gerek yok, ama garanti olsun diye session yoksa
        # (ör. autoconfirm kapalıysa) ayrı bir temp client ile fallback deneniyor.
        access_token = result.session.access_token if result.session else None
        refresh_token = result.session.refresh_token if result.session else None

        if not access_token:
            try:
                access_token, refresh_token = _bootstrap_session(req.email, req.password)
            except Exception as e:
                print(f"REGISTER session bootstrap warning: {e}")
                access_token, refresh_token = None, None

        otp_service.create_otp(
            email=req.email,
            purpose="register",
            access_token=access_token,
            refresh_token=refresh_token,
        )

        return {
            "pending": True,
            "email": req.email,
            "purpose": "register",
            "message": "Kayıt başarılı. Doğrulama kodu e-postana gönderildi.",
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"REGISTER ERROR: {e}")
        raise HTTPException(status_code=400, detail=_friendly_auth_error(str(e)))

@router.post("/login")
async def login(req: LoginRequest):
    try:
        access_token, refresh_token = _bootstrap_session(req.email, req.password)
        if not access_token:
            raise HTTPException(status_code=401, detail="Email veya şifre hatalı.")

        otp_service.create_otp(
            email=req.email,
            purpose="login",
            access_token=access_token,
            refresh_token=refresh_token,
        )

        return {
            "pending": True,
            "email": req.email,
            "purpose": "login",
            "message": "Doğrulama kodu e-postana gönderildi.",
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"LOGIN ERROR: {e}")
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı.")

@router.post("/verify-otp")
async def verify_otp(req: VerifyOtpRequest):
    row = otp_service.verify_otp(email=req.email, purpose=req.purpose, code=req.code)

    access_token = row.get("session_access_token")
    refresh_token = row.get("session_refresh_token")
    if not access_token:
        raise HTTPException(
            status_code=500,
            detail="Oturum oluşturulamadı, lütfen tekrar giriş/kayıt yapmayı deneyin.",
        )

    # NOT: Burada bilerek supabase_admin.auth.get_user() KULLANILMIYOR — o çağrı da
    # supabase_admin'in paylaşılan oturumunu kirletirdi. Kullanıcı bilgisi, zaten
    # sahip olduğumuz taze JWT'nin payload'ından doğrudan okunuyor.
    payload = _decode_jwt_payload(access_token)
    user_payload = {
        "id": payload.get("sub", ""),
        "email": payload.get("email", row.get("email", req.email)),
        "display_name": (payload.get("user_metadata") or {}).get("display_name", ""),
    }

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user_payload,
    }

@router.post("/resend-otp")
async def resend_otp(req: ResendOtpRequest):
    otp_service.resend_otp(email=req.email, purpose=req.purpose)
    return {"message": "Kod tekrar gönderildi."}

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
            "id": current_user.id,
            "email": current_user.email,
            "display_name": data.get("display_name", ""),
            "username": data.get("username", ""),
            "role": data.get("role", "user"),
            "daily_goal": data.get("daily_goal", 5),
            "native_lang": data.get("native_lang", "tr"),
            "learning_lang": data.get("learning_lang", "en"),
            "is_admin": data.get("role") == "admin",
            "created_at": data.get("created_at", ""),
            "is_premium": data.get("is_premium", False),
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
        "id": current_user.id,
        "email": new_email,
        "display_name": d.get("display_name", ""),
        "username": d.get("username", ""),
        "role": d.get("role", "user"),
        "daily_goal": d.get("daily_goal", 5),
        "native_lang": d.get("native_lang", "tr"),
        "learning_lang": d.get("learning_lang", "en"),
        "is_admin": d.get("role") == "admin",
        "created_at": d.get("created_at", ""),
        "is_premium": d.get("is_premium", False),
        "premium_until": d.get("premium_until"),
    }
