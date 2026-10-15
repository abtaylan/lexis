"""
backend/app/api/routes/study_notes.py

Kullanici istegi (15 Ekim 2026): "Calisma Notlarim" sayfasi. Takvimde bir
gun "Yapildi" olarak isaretlenince (schedule_day_completions, bkz.
schedule.py), o gun Calisma Notlarim'da bir tarih karti olarak belirir.
Kullanici o tarihe girince Gemini / NotebookLM butonlariyla, o gunun
konu basligi + tarihi otomatik doldurulmus bir prompt metni gorur; bu
metni kopyalayip ilgili siteye yapistirir, oradan aldigi ozeti de buraya
("manual" / "gemini" / "notebooklm" kaynak etiketiyle) yapistirip kaydeder.

Bu dosya kasitli olarak NotebookLM/Gemini ile canli bir API entegrasyonu
YAPMIYOR -- ikisinin de bu is icin genel kullanima acik, ucretsiz bir API'si
yok (kullanici onceden soru uretimi icin odemeli bir LLM API'sini iptal
etmisti, ayni maliyete tekrar girmek istemiyor). Bunun yerine prompt metni
frontend'de (web/src/lib/studyNotesPrompts.ts) uretiliyor, bu dosya sadece
"hangi tarihte hangi konu calisildi" baglamini ve kullanicinin yapistirdigi
notlari saklamayi saglıyor.

Bkz. migration 087_study_notes.sql.
"""

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.api.routes.schedule import _roadmap_slot_content
from app.core.auth import get_current_user
from app.core.database import supabase_admin

router = APIRouter()

NoteSource = Literal["gemini", "notebooklm", "manual"]


def _topic_context_for_date(date_iso: str, weeks: list[dict]) -> dict:
    """Verilen tarihin dustugu Program Haritasi haftasini bulup o gunun ana
    konu basligini + o gun icin planlanmis aktivitelerin (temizlenmis,
    "+N konu daha" icermeyen) listesini dondurur. Tarih hicbir haftaya
    denk gelmiyorsa (program henuz kurulmamis/bos) ikisi de bos doner --
    frontend bu durumda genel bir baslik gosterir.
    """
    week = next(
        (w for w in weeks if w.get("start_date") and w.get("end_date") and w["start_date"] <= date_iso <= w["end_date"]),
        None,
    )
    if not week:
        return {"topic_title": None, "activities": []}

    titles = (week.get("topic_title_tr") or "").split(" • ") if week.get("topic_title_tr") else []
    topic_title = titles[0] if titles else None

    activities: list[str] = []
    for item in week.get("schedule_items") or []:
        if item.get("date") != date_iso:
            continue
        ak = item.get("activity_key")
        content = _roadmap_slot_content(ak, week) if ak else None
        activity_text = content["activity"] if content else item.get("activity")
        if activity_text and activity_text not in activities:
            activities.append(activity_text)

    return {"topic_title": topic_title, "activities": activities}


def _load_weeks(user_id: str) -> list[dict]:
    result = (
        supabase_admin.table("study_roadmap_weeks")
        .select("*")
        .eq("user_id", user_id)
        .order("week_number")
        .execute()
    )
    return result.data or []


@router.get("")
async def list_study_days(current_user=Depends(get_current_user)):
    """Calisma Notlarim ana sayfasi -- "Yapildi" isaretlenmis her tarih icin
    kisa bir ozet kart (tarih, konu basligi, o gune ait not kaynaklari)."""
    completions = (
        supabase_admin.table("schedule_day_completions")
        .select("date")
        .eq("user_id", current_user.id)
        .eq("is_done", True)
        .order("date", desc=True)
        .execute()
    ).data or []
    done_dates = [c["date"] for c in completions]
    if not done_dates:
        return {"days": []}

    weeks = _load_weeks(current_user.id)

    notes = (
        supabase_admin.table("study_notes")
        .select("date,source,updated_at")
        .eq("user_id", current_user.id)
        .in_("date", done_dates)
        .execute()
    ).data or []
    notes_by_date: dict[str, list[str]] = {}
    for n in notes:
        notes_by_date.setdefault(n["date"], []).append(n["source"])

    days = []
    for d in done_dates:
        ctx = _topic_context_for_date(d, weeks)
        days.append(
            {
                "date": d,
                "topic_title": ctx["topic_title"],
                "activities": ctx["activities"],
                "note_sources": notes_by_date.get(d, []),
            }
        )
    return {"days": days}


@router.get("/{date}")
async def get_study_day(date: str, current_user=Depends(get_current_user)):
    weeks = _load_weeks(current_user.id)
    ctx = _topic_context_for_date(date, weeks)
    notes = (
        supabase_admin.table("study_notes")
        .select("*")
        .eq("user_id", current_user.id)
        .eq("date", date)
        .execute()
    ).data or []
    return {
        "date": date,
        "topic_title": ctx["topic_title"],
        "activities": ctx["activities"],
        "notes": notes,
    }


class StudyNoteUpsert(BaseModel):
    date: str  # YYYY-MM-DD
    source: NoteSource
    content: str
    topic_title: str | None = None

    @field_validator("content")
    @classmethod
    def _content_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Not içeriği boş olamaz.")
        return v[:20000]


@router.post("", status_code=201)
async def upsert_study_note(data: StudyNoteUpsert, current_user=Depends(get_current_user)):
    payload = {
        "user_id": current_user.id,
        "date": data.date,
        "source": data.source,
        "topic_title": (data.topic_title or "").strip()[:200] or None,
        "content": data.content,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        result = (
            supabase_admin.table("study_notes")
            .upsert(payload, on_conflict="user_id,date,source")
            .execute()
        )
        return result.data[0] if result.data else payload
    except Exception as e:
        print(f"UPSERT_STUDY_NOTE ERROR: {e}")
        raise HTTPException(status_code=500, detail="Not kaydedilemedi.")


@router.delete("/{date}/{source}", status_code=204)
async def delete_study_note(date: str, source: NoteSource, current_user=Depends(get_current_user)):
    supabase_admin.table("study_notes").delete().eq("user_id", current_user.id).eq(
        "date", date
    ).eq("source", source).execute()
