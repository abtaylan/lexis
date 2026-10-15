"""
backend/app/api/routes/study_notes.py

Kullanici istegi (15 Ekim 2026): "Calisma Notlarim" sayfasi. Takvimde bir
gun "Yapildi" olarak isaretlenince (schedule_day_completions, bkz.
schedule.py), o gun Calisma Notlarim'da bir tarih karti olarak belirir.
Kullanici o tarihe girince Gemini / NotebookLM butonlariyla, o gunun
konu basligi + tarihi otomatik doldurulmus bir prompt metni gorur; bu
metni kopyalayip ilgili siteye yapistirir, oradan aldigi ozeti de buraya
("manual" / "gemini" / "notebooklm" kaynak etiketiyle) yapistirip kaydeder.

16 Ekim 2026 kullanici istegi: metin ozetinin yaninda gorsel de
yuklenebilsin ("buralara metin disinda ek olarak resimler yukleyecegiz")
-- ornegin Gemini'nin urettigi infografik gorseli ya da NotebookLM zihin
haritasinin ekran goruntusu. Gorseller study-notes-images adli public
Supabase Storage bucket'ina backend'in service role anahtariyla
yukleniyor, URL'leri study_notes.image_urls dizisinde saklaniyor (bkz.
migration 088_study_notes_images.sql).

Bu dosya kasitli olarak NotebookLM/Gemini ile canli bir API entegrasyonu
YAPMIYOR -- ikisinin de bu is icin genel kullanima acik, ucretsiz bir API'si
yok (kullanici onceden soru uretimi icin odemeli bir LLM API'sini iptal
etmisti, ayni maliyete tekrar girmek istemiyor). Bunun yerine prompt metni
frontend'de (web/src/lib/studyNotesPrompts.ts) uretiliyor, bu dosya sadece
"hangi tarihte hangi konu calisildi" baglamini ve kullanicinin yapistirdigi
notlari / yukledigi gorselleri saklamayi saglıyor.

Bkz. migration 087_study_notes.sql, 088_study_notes_images.sql.
"""

import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, field_validator

from app.api.routes.schedule import _roadmap_slot_content
from app.core.auth import get_current_user
from app.core.database import supabase_admin

router = APIRouter()

NoteSource = Literal["gemini", "notebooklm", "manual"]

# Gorsel yukleme (16 Ekim 2026) -- bkz. migration 088_study_notes_images.sql
# (public storage bucket, RLS gerekmiyor cunku yazma/silme sadece service
# role anahtariyla backend uzerinden yapiliyor).
STUDY_NOTES_IMAGE_BUCKET = "study-notes-images"
ALLOWED_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB


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


def _extract_storage_path(public_url: str) -> str | None:
    """Supabase public URL'den (.../object/public/<bucket>/<path>) storage
    path'ini cikarir -- gorsel silinirken storage'dan da kaldirmak icin."""
    marker = f"/{STUDY_NOTES_IMAGE_BUCKET}/"
    idx = public_url.find(marker)
    if idx == -1:
        return None
    return public_url[idx + len(marker):]


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


@router.post("/{date}/{source}/images", status_code=201)
async def upload_study_note_images(
    date: str,
    source: NoteSource,
    files: list[UploadFile] = File(...),
    current_user=Depends(get_current_user),
):
    """Bir gun + kaynak icin bir ya da daha fazla gorsel yukler (ornegin
    Gemini'nin urettigi infografik, NotebookLM zihin haritasi ekran
    goruntusu) ve study_notes satirina ekler. Metin ozeti henuz girilmemis
    olsa bile tek basina kaydedilebilir (content '' ile baslar)."""
    if not files:
        raise HTTPException(status_code=400, detail="En az bir görsel seçmelisin.")

    uploaded_urls: list[str] = []
    for f in files:
        content_type = f.content_type or ""
        if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise HTTPException(
                status_code=400, detail=f"Desteklenmeyen görsel türü: {content_type or 'bilinmiyor'}"
            )
        data = await f.read()
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail=f"'{f.filename}' 8MB sınırını aşıyor.")
        ext = (f.filename or "").rsplit(".", 1)[-1].lower() if f.filename and "." in f.filename else "png"
        path = f"{current_user.id}/{date}/{source}/{uuid.uuid4().hex}.{ext}"
        try:
            supabase_admin.storage.from_(STUDY_NOTES_IMAGE_BUCKET).upload(
                path, data, {"content-type": content_type}
            )
        except Exception as e:
            print(f"STUDY_NOTE_IMAGE_UPLOAD ERROR: {e}")
            raise HTTPException(status_code=500, detail="Görsel yüklenemedi.")
        uploaded_urls.append(supabase_admin.storage.from_(STUDY_NOTES_IMAGE_BUCKET).get_public_url(path))

    existing = (
        supabase_admin.table("study_notes")
        .select("*")
        .eq("user_id", current_user.id)
        .eq("date", date)
        .eq("source", source)
        .execute()
    ).data
    existing_row = existing[0] if existing else None
    merged_images = [*((existing_row.get("image_urls") if existing_row else None) or []), *uploaded_urls]

    payload = {
        "user_id": current_user.id,
        "date": date,
        "source": source,
        "content": (existing_row.get("content") if existing_row else None) or "",
        "topic_title": existing_row.get("topic_title") if existing_row else None,
        "image_urls": merged_images,
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
        print(f"UPSERT_STUDY_NOTE_IMAGES ERROR: {e}")
        raise HTTPException(status_code=500, detail="Görsel kaydedilemedi.")


@router.delete("/{date}/{source}/images", status_code=200)
async def delete_study_note_image(
    date: str,
    source: NoteSource,
    image_url: str,
    current_user=Depends(get_current_user),
):
    existing = (
        supabase_admin.table("study_notes")
        .select("*")
        .eq("user_id", current_user.id)
        .eq("date", date)
        .eq("source", source)
        .execute()
    ).data
    if not existing:
        raise HTTPException(status_code=404, detail="Not bulunamadı.")
    row = existing[0]
    remaining = [u for u in (row.get("image_urls") or []) if u != image_url]

    storage_path = _extract_storage_path(image_url)
    if storage_path:
        try:
            supabase_admin.storage.from_(STUDY_NOTES_IMAGE_BUCKET).remove([storage_path])
        except Exception as e:
            print(f"STUDY_NOTE_IMAGE_DELETE_STORAGE ERROR: {e}")

    result = (
        supabase_admin.table("study_notes")
        .update({"image_urls": remaining, "updated_at": datetime.now(timezone.utc).isoformat()})
        .eq("user_id", current_user.id)
        .eq("date", date)
        .eq("source", source)
        .execute()
    )
    return result.data[0] if result.data else {"image_urls": remaining}
