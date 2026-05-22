from fastapi import APIRouter, Depends
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


@router.delete("/{item_id}", status_code=204)
async def delete_schedule_item(item_id: str, current_user=Depends(get_current_user)):
    supabase_admin.table("study_schedule").update({"is_active": False}).eq("id", item_id).eq("user_id", current_user.id).execute()
