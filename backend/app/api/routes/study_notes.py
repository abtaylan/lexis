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

16 Ekim 2026, IKINCI kullanici istegi (ayni gun, Program Haritasi
numaralandirmasindan hemen sonra): bir gunun GERCEK mufredati 1 ana +
genelde birden fazla "ilgili" Gramer Rehberi konusundan olusuyor (bkz.
schedule.py ROADMAP_KEYS/topic_slugs). Su ana kadar Gemini/NotebookLM
prompt'u VE kaydedilen ozet/gorseller sadece GUNE baglanmisti (tek bir
"gunluk" not satiri, sadece ana konuyu temsil ediyordu) -- kullanici artik
HER KONU icin AYRI bir prompt + ayri kaydedilen ozet/gorsel seti istiyor
("ayri ayri her biri icin link olmali, bu kutu icinde 1-2-3-4-5 seklinde
her birinin ayri basligi olmali, tiklayinca her biri icin gemini ve
notebooklm ozet ekleme ekrani cikacak"). Bu yuzden study_notes artik
(user_id, date, source, topic_slug) benzersizligiyle saklaniyor (bkz.
migration 090_study_notes_topic_slug.sql) -- GET /study-notes/{date} artik
tek bir "topic_title" degil, o gunun TUM konularini (ana + ilgili, her biri
kendi notes listesiyle) bir "topics" dizisi olarak donduruyor.

Bu dosya kasitli olarak NotebookLM/Gemini ile canli bir API entegrasyonu
YAPMIYOR -- ikisinin de bu is icin genel kullanima acik, ucretsiz bir API'si
yok (kullanici onceden soru uretimi icin odemeli bir LLM API'sini iptal
etmisti, ayni maliyete tekrar girmek istemiyor). Bunun yerine prompt metni
frontend'de (web/src/lib/studyNotesPrompts.ts) uretiliyor, bu dosya sadece
"hangi tarihte hangi konu(lar) calisildi" baglamini ve kullanicinin her
konu icin yapistirdigi notlari / yukledigi gorselleri saklamayi sagliyor.

Bkz. migration 087_study_notes.sql, 088_study_notes_images.sql,
090_study_notes_topic_slug.sql.
"""

import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, field_validator

from app.api.routes.grammar import _topic_number_map
from app.api.routes.schedule import _get_learning_lang, _roadmap_slot_content
from app.core.auth import get_current_user
from app.core.database import supabase_admin

router = APIRouter()

NoteSource = Literal["gemini", "notebooklm", "manual"]

# Gercek bir Gramer Rehberi konusuna baglanmayan "genel program" gunleri
# icin sabit yer tutucu slug (ornegin sadece kelime tekrari/dinleme gibi
# aktivitelerin oldugu gunler) -- study_notes.topic_slug NOT NULL oldugu
# icin bu gunlerde de bir deger gerekiyor.
GENERAL_TOPIC_SLUG = "genel"

# Gorsel yukleme (16 Ekim 2026) -- bkz. migration 088_study_notes_images.sql
# (public storage bucket, RLS gerekmiyor cunku yazma/silme sadece service
# role anahtariyla backend uzerinden yapiliyor).
STUDY_NOTES_IMAGE_BUCKET = "study-notes-images"
ALLOWED_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB

# Video yukleme (21 Ekim 2026 kullanici istegi) -- gunun TUM konularini tek
# bir videoda ozetleyen 'Bugunun Ozet Videosu' karti icin. KONU bazli degil
# GUN bazli (study_notes'tan farkli, bkz. study_day_videos tablosu / migration
# 091_study_day_videos.sql).
STUDY_DAY_VIDEO_BUCKET = "study-notes-videos"
ALLOWED_VIDEO_CONTENT_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_VIDEO_BYTES = 200 * 1024 * 1024  # 200 MB -- NotebookLM Video Ozeti indirmeleri genelde bunun cok altinda.


def _topic_context_for_date(date_iso: str, weeks: list[dict], number_map: dict[str, int] | None = None) -> dict:
    """Verilen tarihin dustugu Program Haritasi haftasini bulup o gunun ana
    konu basligi + slug'ini, o haftaya bagli ilgili konulari ve o gun icin
    planlanmis aktivitelerin (temizlenmis, "+N konu daha" icermeyen)
    listesini dondurur. Tarih hicbir haftaya denk gelmiyorsa (program henuz
    kurulmamis/bos) hepsi bos doner -- frontend bu durumda genel bir baslik
    gosterir.

    16 Ekim 2026, kullanici sorusu ("tek konu mu calismam gerekiyor, yoksa
    diğerlerine de mi?"): bir haftaya Gramer Rehberi'nden 1 ana + genelde
    birden fazla "ilgili" konu bagli (bkz. schedule.py ROADMAP_KEYS/
    topic_slugs) -- bunlarin HEPSI gercek mufredat konusu, sadece referans
    linki degil."""
    week = next(
        (w for w in weeks if w.get("start_date") and w.get("end_date") and w["start_date"] <= date_iso <= w["end_date"]),
        None,
    )
    if not week:
        return {
            "topic_title": None,
            "main_slug": None,
            "activities": [],
            "topic_number": None,
            "related_topics": [],
            "week_topic_count": 0,
        }

    number_map = number_map or {}
    titles = (week.get("topic_title_tr") or "").split(" • ") if week.get("topic_title_tr") else []
    topic_title = titles[0] if titles else None
    main_slug = week.get("topic_slug")

    activities: list[str] = []
    related_topics: list[dict] = []
    for item in week.get("schedule_items") or []:
        if item.get("date") != date_iso:
            continue
        ak = item.get("activity_key")
        content = _roadmap_slot_content(ak, week, number_map) if ak else None
        activity_text = content["activity"] if content else item.get("activity")
        if activity_text and activity_text not in activities:
            activities.append(activity_text)
        if content:
            for rt in content.get("related_topics") or []:
                if not any(r["slug"] == rt["slug"] for r in related_topics):
                    related_topics.append(rt)

    return {
        "topic_title": topic_title,
        "main_slug": main_slug,
        "activities": activities,
        "topic_number": number_map.get(main_slug) if main_slug else None,
        "related_topics": related_topics,
        "week_topic_count": len(week.get("topic_slugs") or []) or (1 if main_slug else 0),
    }


def _topics_for_date(date_iso: str, weeks: list[dict], number_map: dict[str, int], notes: list[dict]) -> tuple[dict, list[dict]]:
    """_topic_context_for_date()'in sonucunu, o gun icin kaydedilmis TUM
    notlarla birlestirip frontend'in dogrudan render edebilecegi bir
    "topics" listesine cevirir -- her oge kendi slug/title/topic_number/
    link_url + sadece o konuya ait notes listesine sahip. Ana konu her
    zaman ilk sirada (is_main=True)."""
    ctx = _topic_context_for_date(date_iso, weeks, number_map)

    notes_by_slug: dict[str, list[dict]] = {}
    for n in notes:
        notes_by_slug.setdefault(n.get("topic_slug") or GENERAL_TOPIC_SLUG, []).append(n)

    topics: list[dict] = []
    if ctx["topic_title"] and ctx["main_slug"]:
        topics.append(
            {
                "slug": ctx["main_slug"],
                "title": ctx["topic_title"],
                "topic_number": ctx["topic_number"],
                "link_url": f"/exam-grammar/{ctx['main_slug']}",
                "is_main": True,
                "notes": notes_by_slug.get(ctx["main_slug"], []),
            }
        )
    elif ctx["activities"]:
        # Gercek bir Gramer Rehberi konusuna baglanmayan "genel program"
        # gunu -- yine de kullanicinin o gun icin bir ozet/not kaydedebilmesi
        # icin sabit bir yer tutucu "konu" olarak gosteriliyor.
        topics.append(
            {
                "slug": GENERAL_TOPIC_SLUG,
                "title": None,
                "topic_number": None,
                "link_url": None,
                "is_main": True,
                "notes": notes_by_slug.get(GENERAL_TOPIC_SLUG, []),
            }
        )

    for rt in ctx["related_topics"]:
        topics.append(
            {
                "slug": rt["slug"],
                "title": rt["title"],
                "topic_number": rt.get("topic_number"),
                "link_url": rt.get("link_url"),
                "is_main": False,
                "notes": notes_by_slug.get(rt["slug"], []),
            }
        )

    return ctx, topics


def _load_weeks(user_id: str) -> list[dict]:
    result = (
        supabase_admin.table("study_roadmap_weeks")
        .select("*")
        .eq("user_id", user_id)
        .order("week_number")
        .execute()
    )
    return result.data or []


def _extract_storage_path(public_url: str, bucket: str = STUDY_NOTES_IMAGE_BUCKET) -> str | None:
    """Supabase public URL'den (.../object/public/<bucket>/<path>) storage
    path'ini cikarir -- gorsel/video silinirken storage'dan da kaldirmak icin."""
    marker = f"/{bucket}/"
    idx = public_url.find(marker)
    if idx == -1:
        return None
    return public_url[idx + len(marker):]


@router.get("")
async def list_study_days(current_user=Depends(get_current_user)):
    """Calisma Notlarim ana sayfasi -- "Yapildi" isaretlenmis her tarih icin
    kisa bir ozet kart (tarih, ana konu basligi, o gune ait TUM konulardan
    herhangi birinde not bulunan kaynaklar). Gun bazli ozet kaldigi icin
    (konu bazli degil) burada bir degisiklik gerekmiyor -- tiklanince acilan
    gun detayinda (get_study_day) artik her konu ayri gosteriliyor."""
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
    number_map = _topic_number_map(_get_learning_lang(current_user.id))

    notes = (
        supabase_admin.table("study_notes")
        .select("date,source,updated_at")
        .eq("user_id", current_user.id)
        .in_("date", done_dates)
        .execute()
    ).data or []
    notes_by_date: dict[str, list[str]] = {}
    for n in notes:
        sources = notes_by_date.setdefault(n["date"], [])
        if n["source"] not in sources:
            sources.append(n["source"])

    days = []
    for d in done_dates:
        ctx = _topic_context_for_date(d, weeks, number_map)
        days.append(
            {
                "date": d,
                "topic_title": ctx["topic_title"],
                "activities": ctx["activities"],
                "note_sources": notes_by_date.get(d, []),
                "topic_number": ctx["topic_number"],
                "related_topics": ctx["related_topics"],
                "week_topic_count": ctx["week_topic_count"],
            }
        )
    return {"days": days}


@router.get("/{date}")
async def get_study_day(date: str, current_user=Depends(get_current_user)):
    weeks = _load_weeks(current_user.id)
    number_map = _topic_number_map(_get_learning_lang(current_user.id))
    notes = (
        supabase_admin.table("study_notes")
        .select("*")
        .eq("user_id", current_user.id)
        .eq("date", date)
        .execute()
    ).data or []
    ctx, topics = _topics_for_date(date, weeks, number_map, notes)
    # 21 Ekim 2026 kullanici istegi -- gunun TUM konularini tek bir videoda
    # ozetleyen "Bugunun Ozet Videosu" karti, KONU degil GUN basina tek satir
    # (bkz. study_day_videos / migration 091_study_day_videos.sql).
    video_rows = (
        supabase_admin.table("study_day_videos")
        .select("video_url,updated_at")
        .eq("user_id", current_user.id)
        .eq("date", date)
        .execute()
    ).data or []
    return {
        "date": date,
        "activities": ctx["activities"],
        "week_topic_count": ctx["week_topic_count"],
        "topics": topics,
        "day_video": video_rows[0] if video_rows else None,
    }


class StudyNoteUpsert(BaseModel):
    date: str  # YYYY-MM-DD
    source: NoteSource
    topic_slug: str
    content: str
    topic_title: str | None = None

    @field_validator("topic_slug")
    @classmethod
    def _topic_slug_not_blank(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("topic_slug gerekli.")
        return v[:200]

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
        "topic_slug": data.topic_slug,
        "topic_title": (data.topic_title or "").strip()[:200] or None,
        "content": data.content,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        result = (
            supabase_admin.table("study_notes")
            .upsert(payload, on_conflict="user_id,date,source,topic_slug")
            .execute()
        )
        return result.data[0] if result.data else payload
    except Exception as e:
        print(f"UPSERT_STUDY_NOTE ERROR: {e}")
        raise HTTPException(status_code=500, detail="Not kaydedilemedi.")


@router.delete("/{date}/{source}/{topic_slug}", status_code=204)
async def delete_study_note(date: str, source: NoteSource, topic_slug: str, current_user=Depends(get_current_user)):
    supabase_admin.table("study_notes").delete().eq("user_id", current_user.id).eq("date", date).eq(
        "source", source
    ).eq("topic_slug", topic_slug).execute()


@router.post("/{date}/{source}/{topic_slug}/images", status_code=201)
async def upload_study_note_images(
    date: str,
    source: NoteSource,
    topic_slug: str,
    files: list[UploadFile] = File(...),
    current_user=Depends(get_current_user),
):
    """Bir gun + kaynak + konu icin bir ya da daha fazla gorsel yukler
    (ornegin Gemini'nin urettigi infografik, NotebookLM zihin haritasi ekran
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
        path = f"{current_user.id}/{date}/{source}/{topic_slug}/{uuid.uuid4().hex}.{ext}"
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
        .eq("topic_slug", topic_slug)
        .execute()
    ).data
    existing_row = existing[0] if existing else None
    merged_images = [*((existing_row.get("image_urls") if existing_row else None) or []), *uploaded_urls]

    payload = {
        "user_id": current_user.id,
        "date": date,
        "source": source,
        "topic_slug": topic_slug,
        "content": (existing_row.get("content") if existing_row else None) or "",
        "topic_title": existing_row.get("topic_title") if existing_row else None,
        "image_urls": merged_images,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        result = (
            supabase_admin.table("study_notes")
            .upsert(payload, on_conflict="user_id,date,source,topic_slug")
            .execute()
        )
        return result.data[0] if result.data else payload
    except Exception as e:
        print(f"UPSERT_STUDY_NOTE_IMAGES ERROR: {e}")
        raise HTTPException(status_code=500, detail="Görsel kaydedilemedi.")


@router.delete("/{date}/{source}/{topic_slug}/images", status_code=200)
async def delete_study_note_image(
    date: str,
    source: NoteSource,
    topic_slug: str,
    image_url: str,
    current_user=Depends(get_current_user),
):
    existing = (
        supabase_admin.table("study_notes")
        .select("*")
        .eq("user_id", current_user.id)
        .eq("date", date)
        .eq("source", source)
        .eq("topic_slug", topic_slug)
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
        .eq("topic_slug", topic_slug)
        .execute()
    )
    return result.data[0] if result.data else {"image_urls": remaining}


# ── Bugunun Ozet Videosu (21 Ekim 2026 kullanici istegi) ──────────────────
# Gunun TUM konularini (1-5 arasi, bkz. migration 090) tek bir videoda
# ozetleyen kart: kullanici NotebookLM Studio'nun "Video Ozeti" aracini,
# o gunun butun konularini kapsayan ozel bir talimatla (bkz.
# buildDaySummaryVideoPrompt, web/src/lib/studyNotesPrompts.ts) calistirip
# indirdigi mp4'u buraya yukluyor. study_notes'tan farkli olarak KONU bazli
# degil GUN bazli -- bir gun icin tek video (yeniden yuklenirse oncekinin
# hem storage dosyasi hem satiri yerini alir, bkz. unique(user_id, date)).
@router.post("/{date}/video", status_code=201)
async def upload_study_day_video(
    date: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    content_type = file.content_type or ""
    if content_type not in ALLOWED_VIDEO_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Desteklenmeyen video türü: {content_type or 'bilinmiyor'}")
    data = await file.read()
    if len(data) > MAX_VIDEO_BYTES:
        raise HTTPException(status_code=400, detail="Video 200MB sınırını aşıyor.")

    existing = (
        supabase_admin.table("study_day_videos")
        .select("video_url")
        .eq("user_id", current_user.id)
        .eq("date", date)
        .execute()
    ).data
    if existing:
        old_path = _extract_storage_path(existing[0]["video_url"], STUDY_DAY_VIDEO_BUCKET)
        if old_path:
            try:
                supabase_admin.storage.from_(STUDY_DAY_VIDEO_BUCKET).remove([old_path])
            except Exception as e:
                print(f"STUDY_DAY_VIDEO_REPLACE_STORAGE ERROR: {e}")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "mp4"
    path = f"{current_user.id}/{date}/{uuid.uuid4().hex}.{ext}"
    try:
        supabase_admin.storage.from_(STUDY_DAY_VIDEO_BUCKET).upload(path, data, {"content-type": content_type})
    except Exception as e:
        print(f"STUDY_DAY_VIDEO_UPLOAD ERROR: {e}")
        raise HTTPException(status_code=500, detail="Video yüklenemedi.")
    video_url = supabase_admin.storage.from_(STUDY_DAY_VIDEO_BUCKET).get_public_url(path)

    payload = {
        "user_id": current_user.id,
        "date": date,
        "video_url": video_url,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        result = (
            supabase_admin.table("study_day_videos")
            .upsert(payload, on_conflict="user_id,date")
            .execute()
        )
        return result.data[0] if result.data else payload
    except Exception as e:
        print(f"UPSERT_STUDY_DAY_VIDEO ERROR: {e}")
        raise HTTPException(status_code=500, detail="Video kaydedilemedi.")


@router.delete("/{date}/video", status_code=204)
async def delete_study_day_video(date: str, current_user=Depends(get_current_user)):
    existing = (
        supabase_admin.table("study_day_videos")
        .select("video_url")
        .eq("user_id", current_user.id)
        .eq("date", date)
        .execute()
    ).data
    if existing:
        path = _extract_storage_path(existing[0]["video_url"], STUDY_DAY_VIDEO_BUCKET)
        if path:
            try:
                supabase_admin.storage.from_(STUDY_DAY_VIDEO_BUCKET).remove([path])
            except Exception as e:
                print(f"STUDY_DAY_VIDEO_DELETE_STORAGE ERROR: {e}")
    supabase_admin.table("study_day_videos").delete().eq("user_id", current_user.id).eq("date", date).execute()
