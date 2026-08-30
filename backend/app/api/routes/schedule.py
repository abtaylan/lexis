from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import supabase_admin

router = APIRouter()

# Madde 3a — görev bazında hatırlatma tercihi. None = hatırlatma kapalı.
ReminderLead = Literal["15min", "1hour", "day_start"]

# Program aktivitelerinin bağlanabileceği kaynak kategorileri.
# learning_resources tablosundaki 'category' alanıyla eşleşir.
ACTIVITY_CATEGORIES = [
    "news_reading",
    "technical_article",
    "video_analysis",
    "audio_practice",
    "general_review",
]

class ScheduleItem(BaseModel):
    day_of_week: int
    time_slot: str
    activity: str
    duration_min: int = 30
    link_url: str | None = None
    activity_key: str | None = None
    reminder_lead: ReminderLead | None = None

class ScheduleUpdate(BaseModel):
    day_of_week: int | None = None
    time_slot: str | None = None
    activity: str | None = None
    duration_min: int | None = None
    link_url: str | None = None
    activity_key: str | None = None
    is_active: bool | None = None
    reminder_lead: ReminderLead | None = None
    # reminder_lead'i "kapalı"ya (NULL) döndürmek için ayrı bir bayrak gerekiyor —
    # model_dump(exclude_none=True) normal update akışında None alanları zaten
    # atlıyor, bu yüzden reminder_lead=None göndermek "değiştirme" anlamına gelir.
    clear_reminder: bool | None = None

# ── Aşama 4: Kişiye özel şablonlar ───────────────────────────

class ScheduleTemplateCreate(BaseModel):
    name: str
    items: list[ScheduleItem]

@router.get("/templates")
async def get_templates(current_user=Depends(get_current_user)):
    """
    Kullanıcının kendi kaydettiği özel şablonları döner.
    """
    result = (
        supabase_admin.table("schedule_templates")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"templates": result.data}

@router.post("/templates", status_code=201)
async def create_template(data: ScheduleTemplateCreate, current_user=Depends(get_current_user)):
    """
    Mevcut programı (veya elle girilen bir etkinlik listesini) isimli bir
    özel şablon olarak kaydeder. Şablon şu şablon seçici modalinde
    "Şablonlarım" altında görünür ve tekrar uygulanabilir.
    """
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Şablon adı zorunludur.")
    if not data.items:
        raise HTTPException(status_code=400, detail="Şablon en az 1 etkinlik içermeli.")

    payload = {
        "user_id": current_user.id,
        "name": name,
        "items": [item.model_dump() for item in data.items],
    }
    try:
        result = supabase_admin.table("schedule_templates").insert(payload).execute()
        return result.data[0]
    except Exception as e:
        print(f"CREATE_TEMPLATE ERROR: {e}")
        raise HTTPException(status_code=500, detail="Şablon kaydedilemedi.")

@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(template_id: str, current_user=Depends(get_current_user)):
    supabase_admin.table("schedule_templates").delete().eq("id", template_id).eq(
        "user_id", current_user.id
    ).execute()

# ── Çok dilli program kaynakları ─────────────────────────────

def _get_learning_lang(user_id: str) -> str:
    """
    current_user (get_current_user) ham Supabase Auth kullanıcısını döner —
    learning_lang alanı orada YOK, profiles tablosunda user_id ile tutuluyor.
    Bu yüzden ayrıca sorgulanması gerekiyor.
    """
    try:
        result = (
            supabase_admin.table("profiles")
            .select("learning_lang")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return (result.data or {}).get("learning_lang") or "en"
    except Exception as e:
        print(f"GET_LEARNING_LANG ERROR: {e}")
        return "en"

@router.get("/resources")
async def get_resources(category: str | None = None, current_user=Depends(get_current_user)):
    """
    Kullanıcının öğrendiği dile (learning_lang) göre kaynak listesini döner.
    category verilirse sadece o kategoriyle filtrelenir; verilmezse tüm
    kategoriler döner (activity_key seçici UI'ında kullanılabilir).
    """
    learning_lang = _get_learning_lang(current_user.id)
    query = (
        supabase_admin.table("learning_resources")
        .select("*")
        .eq("language_code", learning_lang)
        .eq("is_active", True)
    )
    if category:
        query = query.eq("category", category)
    result = query.order("category").execute()
    return {"resources": result.data, "categories": ACTIVITY_CATEGORIES}

def _resolve_resource(activity_key: str | None, learning_lang: str) -> dict | None:
    """
    Bir program maddesinin activity_key'ine ve kullanıcının learning_lang'ine
    göre uygun bir kaynağı çözer. Eşleşme yoksa None döner (frontend, kayıtlı
    sabit link_url'e düşer).
    """
    if not activity_key:
        return None
    result = (
        supabase_admin.table("learning_resources")
        .select("*")
        .eq("language_code", learning_lang or "en")
        .eq("category", activity_key)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None

# ── Mevcut program (haftalık etkinlikler) ────────────────────

@router.get("")
async def get_schedule(current_user=Depends(get_current_user)):
    result = (
        supabase_admin.table("study_schedule")
        .select("*")
        .eq("user_id", current_user.id)
        .eq("is_active", True)
        .order("day_of_week")
        .execute()
    )
    items = result.data
    learning_lang = _get_learning_lang(current_user.id)
    for item in items:
        resource = _resolve_resource(item.get("activity_key"), learning_lang)
        if resource:
            item["resolved_link_url"] = resource["url"]
            item["resolved_resource_title"] = resource["title"]
        else:
            # activity_key yok ya da bu dil için kaynak tanımlanmamış:
            # kayıtlı sabit link_url'e düş (geriye dönük uyumluluk).
            item["resolved_link_url"] = item.get("link_url")
            item["resolved_resource_title"] = None
    return {"items": items}

@router.post("", status_code=201)
async def create_schedule_item(item: ScheduleItem, current_user=Depends(get_current_user)):
    data = item.model_dump()
    data["user_id"] = current_user.id
    result = supabase_admin.table("study_schedule").insert(data).execute()
    return result.data[0]

# ── Aşama 3: Yeni endpoint ───────────────────────────────────

@router.patch("/{item_id}")
async def update_schedule_item(
    item_id: str,
    data: ScheduleUpdate,
    current_user=Depends(get_current_user),
):
    """
    Schedule item günceller. is_active toggle + alan güncellemeleri için.
    """
    clear_reminder = data.clear_reminder
    update_data = data.model_dump(exclude_none=True, exclude={"clear_reminder"})
    if clear_reminder:
        update_data["reminder_lead"] = None
    if not update_data:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok.")
    try:
        result = (
            supabase_admin.table("study_schedule")
            .update(update_data)
            .eq("id", item_id)
            .eq("user_id", current_user.id)  # başkasının verisine erişimi engelle
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"UPDATE_SCHEDULE ERROR: {e}")
        raise HTTPException(status_code=500, detail="Güncellenemedi.")

@router.delete("/{item_id}", status_code=204)
async def delete_schedule_item(item_id: str, current_user=Depends(get_current_user)):
    supabase_admin.table("study_schedule").update({"is_active": False}).eq("id", item_id).eq("user_id", current_user.id).execute()
