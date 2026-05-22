from fastapi import APIRouter, Depends
from app.core.auth import get_current_admin, get_current_user
from app.core.database import supabase_admin

router = APIRouter()


@router.get("/users")
async def list_users(admin=Depends(get_current_admin)):
    result = supabase_admin.table("profiles").select("*").order("created_at", desc=True).execute()
    return {"users": result.data, "total": len(result.data)}


@router.patch("/users/{user_id}/role")
async def change_role(user_id: str, role: str, admin=Depends(get_current_admin)):
    supabase_admin.table("profiles").update({"role": role}).eq("id", user_id).execute()
    return {"message": f"Rol güncellendi: {role}"}


@router.delete("/users/{user_id}")
async def deactivate_user(user_id: str, admin=Depends(get_current_admin)):
    supabase_admin.table("profiles").update({"is_active": False}).eq("id", user_id).execute()
    return {"message": "Kullanıcı deaktif edildi"}


@router.get("/stats")
async def admin_stats(admin=Depends(get_current_admin)):
    users = supabase_admin.table("profiles").select("*", count="exact").execute()
    words = supabase_admin.table("words").select("*", count="exact").execute()
    return {
        "total_users": users.count,
        "total_words": words.count,
    }
