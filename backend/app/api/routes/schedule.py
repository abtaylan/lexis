from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.database import supabase_admin
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class ScheduleItem(BaseModel):
    day_of_week: int
    time_slot: str
    activity: str
    duration_min: int = 30
    link_url: Optional[str] = None

class ScheduleUpdate(BaseModel):
    day_of_week: Optional[int] = None
    time_slot: Optional[str] = None
    activity: Optional[str] = None
    duration_min: Optional[int] = None
    link_url: Optional[str] = None
    is_active: Optional[bool] = None


# ── Aşama 4: Kişiye özel şablonlar ───────────────────────────

class ScheduleTemplateCreate(BaseModel):
    name: str
    items: List[ScheduleItem]


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
    return {"items": result.data}

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
    update_data = data.model_dump(exclude_none=True)
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
