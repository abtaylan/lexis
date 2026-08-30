from fastapi import APIRouter

from app.core.database import supabase_admin

router = APIRouter()


@router.get("")
async def list_languages():
    """Aktif dilleri döner (kayıt ekranı için)."""
    try:
        result = (
            supabase_admin.table("languages")
            .select("code, name_native, name_en, flag_emoji, is_active")
            .eq("is_active", True)
            .order("name_native")
            .execute()
        )
        return {"languages": result.data or []}
    except Exception as e:
        print(f"LIST_LANGUAGES ERROR: {e}")
        # Fallback — DB erişilemezse en azından tr/en dönsün
        return {"languages": [
            {"code": "en", "name_native": "English", "name_en": "English", "flag_emoji": "🇬🇧", "is_active": True},
            {"code": "tr", "name_native": "Türkçe", "name_en": "Turkish", "flag_emoji": "🇹🇷", "is_active": True},
        ]}
