from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.database import supabase_admin
from pydantic import BaseModel
from typing import Optional

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
            .eq("user_id", current_user.id)   # başkasının verisine erişimi engelle
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