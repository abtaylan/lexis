"""
backend/app/api/routes/exam_reminders.py

Kullanıcı isteği (8 Eylül 2026): "sınav hatırlatıcısı ekleyelim mobil
uygulama ve web uygulama sayfasına (tüm yabancı dil sınavları için
olmalı)". Kullanıcı YDS, YÖKDİL, e-YDS, TOEFL, IELTS vb. herhangi bir
yabancı dil sınavını (ad + tarih, serbest metin — ÖSYM sınav takvimi
zamanla değişebildiği için tarihi burada sabit kod olarak TUTMUYORUZ,
kullanıcı kendi başvurduğu tarihi giriyor) ekleyip sınava kalan gün
eşiklerinde (30/14/7/3/1/0 — bkz. backend/send_exam_reminders.py) hem
uygulama-içi hem gerçek push bildirimi alıyor.

Bkz. migration 022_exam_reminders.sql.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.core.auth import get_current_user
from app.core.database import supabase_admin

router = APIRouter()


class ExamReminderCreate(BaseModel):
    exam_name: str
    exam_date: date
    note: str | None = None

    @field_validator("exam_name")
    @classmethod
    def _name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Sınav adı boş olamaz.")
        return v[:100]

    @field_validator("exam_date")
    @classmethod
    def _date_not_past(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("Sınav tarihi geçmişte olamaz.")
        return v


@router.get("")
async def list_exam_reminders(current_user=Depends(get_current_user)):
    result = (
        supabase_admin.table("exam_reminders")
        .select("*")
        .eq("user_id", current_user.id)
        .order("exam_date", desc=False)
        .execute()
    )
    return {"exam_reminders": result.data}


@router.post("", status_code=201)
async def create_exam_reminder(data: ExamReminderCreate, current_user=Depends(get_current_user)):
    payload = {
        "user_id": current_user.id,
        "exam_name": data.exam_name,
        "exam_date": data.exam_date.isoformat(),
        "note": data.note.strip()[:300] if data.note else None,
    }
    try:
        result = supabase_admin.table("exam_reminders").insert(payload).execute()
        return result.data[0]
    except Exception as e:
        print(f"CREATE_EXAM_REMINDER ERROR: {e}")
        raise HTTPException(status_code=500, detail="Sınav hatırlatıcısı kaydedilemedi.")


@router.delete("/{reminder_id}", status_code=204)
async def delete_exam_reminder(reminder_id: str, current_user=Depends(get_current_user)):
    supabase_admin.table("exam_reminders").delete().eq("id", reminder_id).eq(
        "user_id", current_user.id
    ).execute()
