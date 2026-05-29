from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date
from app.core.auth import get_current_admin
from app.core.database import supabase_admin

router = APIRouter()


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    role: Optional[str] = "user"
    daily_goal: Optional[int] = 5
    native_lang: Optional[str] = "tr"
    learning_lang: Optional[str] = "en"


# ── Kullanıcı listesi ─────────────────────────────────────────
@router.get("/users")
async def list_users(admin=Depends(get_current_admin)):
    result = (
        supabase_admin.table("profiles")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    # E-posta auth.users'da tutuluyor — admin API'den eşleştir
    email_map = {}
    try:
        page = supabase_admin.auth.admin.list_users()
        users = page if isinstance(page, list) else getattr(page, "users", [])
        for u in users:
            email_map[u.id] = u.email
    except Exception as e:
        print(f"LIST_USERS email map warning: {e}")

    enriched = []
    for p in (result.data or []):
        enriched.append({
            **p,
            "email": email_map.get(p["id"], p.get("email", "")),
            # Şifre asla düz/hash olarak dışarı verilemez — maskelenmiş gösterilir
            "password_masked": "••••••••••",
        })

    return {"users": enriched, "total": len(enriched)}


# ── Kullanıcı detayı ──────────────────────────────────────────
@router.get("/users/{user_id}")
async def get_user_detail(user_id: str, admin=Depends(get_current_admin)):
    profile = (
        supabase_admin.table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    email = profile.data.get("email", "")
    try:
        au = supabase_admin.auth.admin.get_user_by_id(user_id)
        if au and au.user:
            email = au.user.email
    except Exception:
        pass

    words = (
        supabase_admin.table("words")
        .select("status, list_type, created_at")
        .eq("user_id", user_id)
        .execute()
    )
    word_list = words.data or []
    today = date.today().isoformat()

    return {
        **profile.data,
        "email":         email,
        "password_masked": "••••••••••",
        "total_words":   len(word_list),
        "learned":       sum(1 for w in word_list if w.get("status") == "learned"),
        "learning":      sum(1 for w in word_list if w.get("status") == "learning"),
        "words_today":   sum(1 for w in word_list if (w.get("created_at") or "")[:10] == today),
        "active_words":  sum(1 for w in word_list if w.get("list_type") == "active"),
        "passive_words": sum(1 for w in word_list if w.get("list_type") == "passive"),
    }


# ── Yeni kullanıcı oluştur ────────────────────────────────────
@router.post("/users", status_code=201)
async def create_user(req: CreateUserRequest, admin=Depends(get_current_admin)):
    # Önce e-posta zaten var mı kontrol et — net hata için
    try:
        page = supabase_admin.auth.admin.list_users()
        existing = page if isinstance(page, list) else getattr(page, "users", [])
        if any((u.email or "").lower() == req.email.lower() for u in existing):
            raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"CREATE_USER precheck warning: {e}")

    try:
        result = supabase_admin.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
            "user_metadata": {"display_name": req.display_name},
        })
        if not result.user:
            raise HTTPException(status_code=400, detail="Kullanıcı oluşturulamadı.")

        user_id = result.user.id
        supabase_admin.table("profiles").update({
            "display_name":  req.display_name,
            "username":      req.email.split("@")[0],
            "role":          req.role,
            "daily_goal":    req.daily_goal,
            "native_lang":   req.native_lang,
            "learning_lang": req.learning_lang,
        }).eq("id", user_id).execute()

        return {"message": "Kullanıcı oluşturuldu.", "id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        msg = str(e).lower()
        if "already" in msg or "registered" in msg or "exists" in msg:
            raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı.")
        print(f"CREATE_USER ERROR: {e}")
        raise HTTPException(status_code=400, detail="Kullanıcı oluşturulamadı.")


# ── Rol güncelle ──────────────────────────────────────────────
@router.patch("/users/{user_id}/role")
async def change_role(user_id: str, role: str, admin=Depends(get_current_admin)):
    supabase_admin.table("profiles").update({"role": role}).eq("id", user_id).execute()
    return {"message": f"Rol güncellendi: {role}"}


# ── Deaktif et ────────────────────────────────────────────────
@router.delete("/users/{user_id}")
async def deactivate_user(user_id: str, admin=Depends(get_current_admin)):
    supabase_admin.table("profiles").update({"is_active": False}).eq("id", user_id).execute()
    return {"message": "Kullanıcı deaktif edildi"}


# ── Yeniden aktif et ──────────────────────────────────────────
@router.patch("/users/{user_id}/activate")
async def activate_user(user_id: str, admin=Depends(get_current_admin)):
    supabase_admin.table("profiles").update({"is_active": True}).eq("id", user_id).execute()
    return {"message": "Kullanıcı aktifleştirildi"}


# ── Platform istatistikleri ───────────────────────────────────
@router.get("/stats")
async def admin_stats(admin=Depends(get_current_admin)):
    today = date.today().isoformat()
    users    = supabase_admin.table("profiles").select("*", count="exact").execute()
    active   = supabase_admin.table("profiles").select("*", count="exact").eq("is_active", True).execute()
    words    = supabase_admin.table("words").select("*", count="exact").execute()
    words_td = supabase_admin.table("words").select("*", count="exact").gte("created_at", today).execute()
    return {
        "total_users":  users.count or 0,
        "active_users": active.count or 0,
        "total_words":  words.count or 0,
        "words_today":  words_td.count or 0,
    }
