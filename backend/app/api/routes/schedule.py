import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.config import settings
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


# ── Takvime Abonelik (ICS feed) — 9 Ekim 2026 kullanıcı isteği: "çalışma
# programı telefonda kullanılan takvim uygulamasına entegre olsun" ────────
# Gerçek bir Google/Apple Calendar OAuth entegrasyonu yerine, hiçbir native
# mobil izin/rebuild gerektirmeyen "URL ile abone ol" (webcal/ics feed)
# yöntemi seçildi — Google Calendar, Apple Calendar ve Outlook'un üçü de
# bunu destekliyor, EAS native build kotası/izin akışı hiç devreye girmiyor.
# /ics/{token} endpoint'i KASITLI OLARAK auth gerektirmiyor (takvim
# uygulamaları arka planda periyodik çekerken Bearer token gönderemiyor) —
# koruma, profiles.calendar_feed_token'daki uzun rastgele token'ın kendisi
# (bkz. migration 085_calendar_feed_token.sql).
_DOW_TO_ICS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]  # app day_of_week 0=Pazar..6=Cumartesi
_CAL_DEFAULT_TIMEZONE = "Europe/Istanbul"


def _cal_safe_zone(tz_name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name or _CAL_DEFAULT_TIMEZONE)
    except ZoneInfoNotFoundError:
        return ZoneInfo(_CAL_DEFAULT_TIMEZONE)


def _ics_escape(text: str) -> str:
    return (text or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _get_or_create_calendar_token(user_id: str) -> str:
    row = (
        supabase_admin.table("profiles")
        .select("calendar_feed_token")
        .eq("id", user_id)
        .single()
        .execute()
        .data
    ) or {}
    token = row.get("calendar_feed_token")
    if token:
        return token
    token = secrets.token_urlsafe(24)
    supabase_admin.table("profiles").update({"calendar_feed_token": token}).eq("id", user_id).execute()
    return token


def _build_ics(items: list[dict], tz_name: str | None) -> str:
    tz = _cal_safe_zone(tz_name)
    today_local = datetime.now(tz).date()
    now_utc = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    tzid = tz_name or _CAL_DEFAULT_TIMEZONE

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Lexis//Calisma Programi//TR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Lexis Calisma Programim",
        f"X-WR-TIMEZONE:{tzid}",
    ]

    for item in items:
        try:
            hh, mm = item["time_slot"].strip().split(":")
            hh, mm = int(hh), int(mm)
        except (ValueError, AttributeError, KeyError):
            continue

        py_weekday = (item["day_of_week"] - 1) % 7  # app 0=Pazar -> python weekday() 6 (Pazar)
        days_ahead = (py_weekday - today_local.weekday()) % 7
        first_date = today_local + timedelta(days=days_ahead)
        dtstart = f"{first_date.strftime('%Y%m%d')}T{hh:02d}{mm:02d}00"
        duration_min = item.get("duration_min") or 30
        by_day = _DOW_TO_ICS[item["day_of_week"]]

        lines += [
            "BEGIN:VEVENT",
            f"UID:{item['id']}@lexiswords.com",
            f"DTSTAMP:{now_utc}",
            f"DTSTART;TZID={tzid}:{dtstart}",
            f"DURATION:PT{duration_min}M",
            f"RRULE:FREQ=WEEKLY;BYDAY={by_day}",
            f"SUMMARY:{_ics_escape(item['activity'])} (Lexis)",
            "DESCRIPTION:Lexis calisma programi",
        ]
        lead = item.get("reminder_lead")
        if lead in ("15min", "1hour"):
            trigger = "-PT15M" if lead == "15min" else "-PT1H"
            lines += [
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                "DESCRIPTION:Hatirlatma",
                f"TRIGGER:{trigger}",
                "END:VALARM",
            ]
        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


@router.get("/calendar-feed")
async def get_calendar_feed(current_user=Depends(get_current_user)):
    """
    Kullanicinin calisma programini telefon/masaustu takvim uygulamasina
    "URL ile abone ol" seklinde baglamasi icin webcal/https linklerini
    doner (token yoksa olusturur).
    """
    token = _get_or_create_calendar_token(current_user.id)
    base = settings.BACKEND_PUBLIC_URL.rstrip("/")
    https_url = f"{base}/api/v1/schedule/ics/{token}"
    webcal_url = https_url.replace("https://", "webcal://").replace("http://", "webcal://")
    return {"feed_url": https_url, "webcal_url": webcal_url}


@router.get("/ics/{token}")
async def get_ics_feed(token: str):
    """
    KASITLI OLARAK auth gerektirmiyor -- takvim uygulamalari bu URL'yi
    periyodik olarak arka planda, Bearer token gonderemeden cekiyor.
    Koruma, tahmin edilemez rastgele token'in kendisi.
    """
    profile = (
        supabase_admin.table("profiles")
        .select("id, timezone")
        .eq("calendar_feed_token", token)
        .limit(1)
        .execute()
        .data
    ) or []
    if not profile:
        raise HTTPException(status_code=404, detail="Takvim bulunamadi.")
    user_id = profile[0]["id"]
    items = (
        supabase_admin.table("study_schedule")
        .select("id, day_of_week, time_slot, activity, duration_min, reminder_lead")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
        .data
    ) or []
    ics_text = _build_ics(items, profile[0].get("timezone"))
    return Response(
        content=ics_text,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": "inline; filename=lexis-calisma-programi.ics"},
    )
