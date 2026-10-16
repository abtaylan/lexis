import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from app.api.routes.grammar import _topic_number_map
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

# 15 Ekim 2026 -- roadmap_* activity_key'li maddeler için ortak çekirdek.
# Hem _resolve_roadmap_slot (GÜNCEL hafta -- Liste görünümü /schedule) hem de
# GET /schedule/roadmap (TÜM haftalar -- Program Haritası + Takvim görünümü)
# bu fonksiyonu kullanır; böylece "(+N konu daha)" yer tutucusu yerine her ek
# konunun gerçek adı+linki (related_topics) HER YERDE aynı şekilde üretilir.
ROADMAP_KEYS = {
    "roadmap_intro",
    "roadmap_reinforce",
    "roadmap_practice_short",
    "roadmap_passage",
    "roadmap_practice_long",
}

def _roadmap_related_for(
    key: str, extra_slugs: list[str], extra_titles: list[str], number_map: dict[str, int] | None = None
) -> list[dict]:
    """Ek konular için, slot'un türüne uygun gerçek bir link üretir (ör.
    roadmap_intro için gramer anlatım sayfası, roadmap_reinforce için
    pekiştirme pratiği vb.) -- böylece her ek konu da kendi doğru sayfasına
    gider, genel bir yer tutucu değil. 16 Ekim 2026: number_map verilirse her
    ek konuya da Gramer Rehberi'ndeki GLOBAL numarasini (topic_number) ekler
    -- bkz. grammar.py::_topic_number_map. Kullanici bunlarin "bence bunlara
    da calismam gerekiyordu" dedigi GERCEK mufredat konulari oldugunu, sade
    bir referans linki degil, netlestirmek icin."""
    number_map = number_map or {}
    out = []
    for s, t in zip(extra_slugs, extra_titles):
        if key == "roadmap_intro":
            lnk = f"/exam-grammar/{s}"
        elif key == "roadmap_reinforce":
            lnk = f"/exam-topic-practice?topic_tag={s}&limit=6"
        elif key == "roadmap_practice_short":
            lnk = f"/exam-topic-practice?topic_tag={s}&limit=5"
        elif key == "roadmap_passage":
            lnk = f"/exam-grammar/{s}?focus=passage"
        elif key == "roadmap_practice_long":
            lnk = f"/exam-topic-practice?topic_tag={s}&limit=10"
        else:
            continue
        out.append({"slug": s, "title": t, "link_url": lnk, "topic_number": number_map.get(s)})
    return out

def _roadmap_slot_content(activity_key: str | None, week: dict, number_map: dict[str, int] | None = None) -> dict | None:
    """Verilen TEK bir study_roadmap_weeks satırı için activity/link_url/
    related_topics üretir. Haftayı BULMA işi burada yapılmaz -- çağıran
    fonksiyon (güncel hafta ya da tüm haftalar) hangi week dict'ini
    vereceğine kendi karar verir."""
    if activity_key not in ROADMAP_KEYS:
        return None

    slug = week.get("topic_slug")
    titles = (week.get("topic_title_tr") or "").split(" • ") if week.get("topic_title_tr") else []
    slugs = week.get("topic_slugs") or []
    # 15 Ekim 2026 kullanıcı geri bildirimi -- "Liste gösterimde de +4 konu
    # yazılmış, bu gösterim iyi değil, o konuların ismi yazılmalı ve
    # onlarında linki olmalı": artık başlıkta "(+N konu daha)" YAZMIYORUZ --
    # yalnızca haftanın ANA konusunun adını kullanıyoruz, ek konular ise
    # aşağıda `related_topics` listesinde kendi isim+linkleriyle dönüyor.
    disp = titles[0] if titles else ""

    if not slug:
        # Faz'sız hafta (Sınav Öncesi Son Tekrar): genel/karışık içerik.
        fallback = {
            "roadmap_intro": ("Zayıf Gramer Konuları Tekrarı (Gramer Rehberi'nden)", "/exam-grammar"),
            "roadmap_reinforce": ("Sınav Hazırlık: Süreli Karma Pratik", "/exam-topic-practice?topic_tag=weekly-quiz"),
            "roadmap_practice_short": ("Sınav Hazırlık: Süreli Pratik (Kısa)", "/exam-topic-practice?topic_tag=weekly-quiz"),
            "roadmap_passage": ("Son Hafta: Genel Gözden Geçirme", "/exam-grammar"),
            "roadmap_practice_long": ("Tam Deneme (Süreli, 50 Soru — Gerçek Sınav Temposu)", "/exam-topic-practice?topic_tag=weekly-quiz"),
        }
        activity, link = fallback[activity_key]
        return {"activity": activity, "link_url": link, "related_topics": [], "topic_number": None, "week_topic_count": 0}

    import json as _json
    from urllib.parse import quote as _quote

    also_param = ""
    if len(slugs) > 1 and len(titles) > 1:
        also_payload = _json.dumps(
            [[s, t] for s, t in zip(slugs[1:], titles[1:])],
            ensure_ascii=False,
            separators=(",", ":"),
        )
        also_param = f"also={_quote(also_payload)}"

    related_topics = (
        _roadmap_related_for(activity_key, slugs[1:], titles[1:], number_map) if len(slugs) > 1 and len(titles) > 1 else []
    )
    number_map = number_map or {}
    topic_number = number_map.get(slug)
    week_topic_count = len(slugs) if slugs else 1

    if activity_key == "roadmap_intro":
        activity = f"Gramer: {disp} — Giriş & Kural Anlatımı"
        link = f"/exam-grammar/{slug}"
        if also_param:
            link = f"{link}?{also_param}"
    elif activity_key == "roadmap_reinforce":
        activity = f"Gramer: {disp} — Pekiştirme & Soru Çözme"
        link = f"/exam-topic-practice?topic_tag={slug}&limit=6"
    elif activity_key == "roadmap_practice_short":
        activity = f"Sınav Hazırlık: YÖKDİL Kısa Pratik — {disp}"
        link = f"/exam-topic-practice?topic_tag={slug}&limit=5"
    elif activity_key == "roadmap_passage":
        activity = f"Günün Okuma Parçası: {disp} Üzerine"
        link = f"/exam-grammar/{slug}?focus=passage"
    elif activity_key == "roadmap_practice_long":
        activity = f"Sınav Hazırlık: Uzun Pratik + Hata Analizi — {disp}"
        link = f"/exam-topic-practice?topic_tag={slug}&limit=10"
    else:
        return None

    return {
        "activity": activity,
        "link_url": link,
        "related_topics": related_topics,
        "topic_number": topic_number,
        "week_topic_count": week_topic_count,
    }

def _resolve_roadmap_slot(activity_key: str | None, user_id: str) -> dict | None:
    """
    15 Ekim 2026: 'Yökdil Genel Çalışma' tek şablonunun roadmap_* activity_key'li
    maddeleri için, study_roadmap_weeks'ten GÜNCEL haftayı (bugünün tarihine göre)
    bulup activity metnini ve link_url'i o haftanın GERÇEK konusuna göre YENİDEN
    üretir. Böylece study_schedule'daki satırlar statik kalsa da Program sayfası
    her çağrıda haftaya uygun, başlığıyla tutarlı içerik gösterir — cron'a ihtiyaç
    yok, ve Pazartesi/Çarşamba/Perşembe/Cuma/Cumartesi artık gerçekten farklı
    sayfalara gider (bkz. kullanıcı şikayeti: "hepsi aynı sayfayı gösteriyor").
    activity_key roadmap_* değilse None döner (frontend kayıtlı link_url'e düşer).
    """
    if activity_key not in ROADMAP_KEYS:
        return None

    from datetime import date as _date

    today = _date.today().isoformat()
    try:
        result = (
            supabase_admin.table("study_roadmap_weeks")
            .select("*")
            .eq("user_id", user_id)
            .lte("start_date", today)
            .gte("end_date", today)
            .limit(1)
            .execute()
        )
        week = result.data[0] if result.data else None
        if not week:
            all_weeks = (
                supabase_admin.table("study_roadmap_weeks")
                .select("*")
                .eq("user_id", user_id)
                .order("week_number")
                .execute()
            ).data or []
            if not all_weeks:
                return None
            week = all_weeks[0] if today < all_weeks[0]["start_date"] else all_weeks[-1]
    except Exception as e:
        print(f"RESOLVE_ROADMAP_SLOT ERROR: {e}")
        return None

    learning_lang = _get_learning_lang(user_id)
    number_map = _topic_number_map(learning_lang)
    return _roadmap_slot_content(activity_key, week, number_map)

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

    # 15 Ekim 2026 kullanıcı geri bildirimi -- "bugün başlangıç olduğu için
    # bugünden önceki günler burada boş liste olmalı": Liste görünümü
    # study_schedule'ı HAFTALIK TEKRARLI bir şablon olarak gösterir (gerçek
    # bir tarihi yok, sadece day_of_week). Frontend'in "bu günün kutusu
    # programın başlangıcından önce mi?" diye karar verebilmesi için programın
    # GERÇEK başlangıç tarihini (study_roadmap_weeks'teki en erken start_date)
    # her maddeye ekliyoruz -- sadece "bugünden önce" değil, "programın
    # başladığı günden önce" olması gerekiyor, yoksa bu mantık her hafta
    # geçmiş günleri yanlışlıkla boşaltırdı.
    program_start_date = None
    try:
        earliest = (
            supabase_admin.table("study_roadmap_weeks")
            .select("start_date")
            .eq("user_id", current_user.id)
            .order("start_date")
            .limit(1)
            .execute()
        )
        if earliest.data:
            program_start_date = earliest.data[0]["start_date"]
    except Exception as e:
        print(f"GET_SCHEDULE program_start_date ERROR: {e}")

    for item in items:
        item["program_start_date"] = program_start_date
        roadmap_slot = _resolve_roadmap_slot(item.get("activity_key"), current_user.id)
        if roadmap_slot:
            # Program Haritası'ndaki GÜNCEL haftaya göre yeniden üretilen başlık/link —
            # böylece her gün başlığıyla uyumlu, birbirinden farklı bir sayfaya gider.
            item["activity"] = roadmap_slot["activity"]
            item["link_url"] = roadmap_slot["link_url"]
            item["resolved_link_url"] = roadmap_slot["link_url"]
            item["resolved_resource_title"] = None
            # 15 Ekim 2026 -- "+N konu daha" yer tutucusu yerine gerçek
            # konu adları + kendi linkleri (bkz. _resolve_roadmap_slot).
            item["related_topics"] = roadmap_slot.get("related_topics") or []
            # 16 Ekim 2026 -- Gramer Rehberi'ndeki GLOBAL konu numarası +
            # bu haftaya bağlı toplam konu sayısı (bkz. kullanıcı sorusu:
            # "tek konu mu çalışmam gerekiyor yoksa diğerlerine de mi?").
            item["topic_number"] = roadmap_slot.get("topic_number")
            item["week_topic_count"] = roadmap_slot.get("week_topic_count") or 0
            continue
        item["related_topics"] = []
        item["topic_number"] = None
        item["week_topic_count"] = 0
        resource = _resolve_resource(item.get("activity_key"), learning_lang)
        if resource:
            item["resolved_link_url"] = resource["url"]
            item["resolved_resource_title"] = resource["title"]
        else:
            # activity_key yok ya da bu dil için kaynak tanımlanmamış:
            # kayıtlı sabit link_url'e düş (geriye dönük uyumluluk).
            item["resolved_link_url"] = item.get("link_url")
            item["resolved_resource_title"] = None
    return {"items": items, "program_start_date": program_start_date}

@router.post("", status_code=201)
async def create_schedule_item(item: ScheduleItem, current_user=Depends(get_current_user)):
    data = item.model_dump()
    data["user_id"] = current_user.id
    result = supabase_admin.table("study_schedule").insert(data).execute()
    return result.data[0]

# ── Aşama 3: Yeni endpoint ───────────────────────────────────

# ── Canlı "Program Haritası" — 20 Haftalık Yol Haritası (15 Ekim 2026) ──────
# Kullanıcının "tüm 20 haftayı kaydırarak gezebileceği canlı bir ekran"
# isteği üzerine: study_roadmap_weeks tablosundaki (Gramer Rehberi sırasına
# göre, tek-konu/tek-hafta mantığıyla kurulmuş) 20 satırı döner. Ayrıca
# bugünün tarihine göre "şu an hangi haftadayım" bilgisini hesaplar, böylece
# web/mobil ekranı otomatik olarak güncel haftayı vurgulayıp açabilir.
@router.get("/roadmap")
async def get_roadmap(current_user=Depends(get_current_user)):
    from datetime import date as _date

    result = (
        supabase_admin.table("study_roadmap_weeks")
        .select("*")
        .eq("user_id", current_user.id)
        .order("week_number")
        .execute()
    )
    weeks = result.data or []

    # 15 Ekim 2026 kullanıcı geri bildirimi -- "+4 konu daha" yer tutucusu
    # Program Haritası'nda ve Takvim'de de kullanıcıya aynen gösteriliyordu
    # (DB'de kaydedildiği haliyle). _roadmap_slot_content ile HER haftanın
    # roadmap_* maddesini serve-time'da yeniden üretip related_topics
    # ekliyoruz -- Liste görünümüyle (_resolve_roadmap_slot) birebir aynı
    # çekirdek, tek fark burada TÜM haftalar için (sadece güncel hafta değil).
    # 16 Ekim 2026 -- aynı çekirdeğe artık GLOBAL konu numarası da ekleniyor
    # (bkz. grammar.py::_topic_number_map) -- tek sorgu, tüm haftalar için.
    learning_lang = _get_learning_lang(current_user.id)
    number_map = _topic_number_map(learning_lang)
    for w in weeks:
        for item in w.get("schedule_items") or []:
            ak = item.get("activity_key")
            content = _roadmap_slot_content(ak, w, number_map) if ak else None
            if content:
                item["activity"] = content["activity"]
                item["link_url"] = content["link_url"]
                item["related_topics"] = content["related_topics"]
                item["topic_number"] = content.get("topic_number")
                item["week_topic_count"] = content.get("week_topic_count") or 0
            else:
                item["related_topics"] = item.get("related_topics") or []
                item["topic_number"] = None
                item["week_topic_count"] = 0

    today = _date.today().isoformat()
    current_week_number = None
    for w in weeks:
        if w["start_date"] <= today <= w["end_date"]:
            current_week_number = w["week_number"]
            break
    if current_week_number is None and weeks:
        # Program henüz başlamadıysa ilk haftayı, bittiyse son haftayı öner.
        if today < weeks[0]["start_date"]:
            current_week_number = weeks[0]["week_number"]
        elif today > weeks[-1]["end_date"]:
            current_week_number = weeks[-1]["week_number"]

    return {
        "today": today,
        "current_week_number": current_week_number,
        "weeks": weeks,
    }


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


# ── Kaçırılan Gün/Etkinlik Takibi (15 Ekim 2026, kullanıcı isteği) ──────────
# "kaçırdığım gün ve program olursa, onu da işaretleyim, genel tekrar günü
# ya da öbür hafta bir güne eklensin." Tam otomatik yeniden zamanlama yerine
# (schedule_misses'tan yeni bir study_schedule satırı üretmek, programın
# haftalık-tekrarlı yapısıyla çakışır) kasıtlı olarak basit bir "işaretle +
# gör" modeli seçildi: kullanıcı bir etkinliği "kaçırdım" olarak işaretler,
# bu hafta içindeki tüm kaçırılanlar GET /missed ile listelenir (ör. Pazar
# "Haftalık Genel Tekrar" ekranında gösterilmek üzere) ve tamamlandığında
# resolve edilir. week_start = içinde bulunulan haftanın Pazar günü
# (day_of_week=0 ile tutarlı, bkz. dosya başındaki Pazar=0 kuralı).
def _week_start(d=None) -> str:
    from datetime import date as _date

    today = d or _date.today()
    days_since_sunday = (today.weekday() + 1) % 7  # Python: Pazartesi=0..Pazar=6
    return (today - timedelta(days=days_since_sunday)).isoformat()


class MarkMissedRequest(BaseModel):
    schedule_item_id: str


@router.post("/missed", status_code=201)
async def mark_missed(data: MarkMissedRequest, current_user=Depends(get_current_user)):
    item = (
        supabase_admin.table("study_schedule")
        .select("id, activity")
        .eq("id", data.schedule_item_id)
        .eq("user_id", current_user.id)
        .limit(1)
        .execute()
    )
    if not item.data:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı.")

    week_start = _week_start()
    existing = (
        supabase_admin.table("schedule_misses")
        .select("id")
        .eq("user_id", current_user.id)
        .eq("schedule_item_id", data.schedule_item_id)
        .eq("week_start", week_start)
        .is_("resolved_at", "null")
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]

    payload = {
        "user_id": current_user.id,
        "schedule_item_id": data.schedule_item_id,
        "activity_snapshot": item.data[0]["activity"],
        "week_start": week_start,
    }
    result = supabase_admin.table("schedule_misses").insert(payload).execute()
    return result.data[0]


@router.get("/missed")
async def list_missed(current_user=Depends(get_current_user)):
    """Bu haftanın ve geçen haftanın çözülmemiş 'kaçırıldı' kayıtlarını döner
    (geçen hafta da dahil — Pazar akşamı geç kaçırılan bir gün, haftanın son
    günü olduğu için hemen görülmeyebilir diye bir hafta tolerans var)."""
    from datetime import date as _date

    this_week = _week_start()
    last_week = _week_start(_date.today() - timedelta(days=7))
    result = (
        supabase_admin.table("schedule_misses")
        .select("*")
        .eq("user_id", current_user.id)
        .in_("week_start", [this_week, last_week])
        .is_("resolved_at", "null")
        .order("created_at", desc=True)
        .execute()
    )
    return {"items": result.data}


@router.post("/missed/{miss_id}/resolve")
async def resolve_missed(miss_id: str, current_user=Depends(get_current_user)):
    result = (
        supabase_admin.table("schedule_misses")
        .update({"resolved_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", miss_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
    return result.data[0]


# ── Takvim Gün Tamamlama Takibi (15 Ekim 2026 kullanıcı isteği) ────────────
# "Güne tıklayınca aşağıda çıkan yapılacak ders bilgisi kutusunun içinde
# yapıldı seçeneği olsun, işaretlenirse o gün yeşile döner, yapılmadıysa...
# kırmızı olsun" -- Takvim'deki gün-detay panelinde bir "Yapıldı" anahtarı;
# renklendirme mantığı (yeşil/turuncu/kırmızı/sarı) tamamen frontend'de
# hesaplanıyor (bkz. CalendarView), bu endpoint'ler sadece "bu GERÇEK tarih
# (day_of_week değil) yapıldı mı?" durumunu okur/yazar.
class DayCompletionRequest(BaseModel):
    date: str  # YYYY-MM-DD
    is_done: bool = True


@router.post("/day-completion")
async def set_day_completion(data: DayCompletionRequest, current_user=Depends(get_current_user)):
    payload = {
        "user_id": current_user.id,
        "date": data.date,
        "is_done": data.is_done,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = (
        supabase_admin.table("schedule_day_completions")
        .upsert(payload, on_conflict="user_id,date")
        .execute()
    )
    return result.data[0] if result.data else payload


@router.get("/day-completions")
async def list_day_completions(current_user=Depends(get_current_user)):
    """Kullanıcının tüm 'yapıldı' işaretlerini döner (tarih -> is_done) --
    20 haftalık program için en fazla ~140 satır, tek seferde çekmek aralık
    filtresi gerektirmeyecek kadar küçük."""
    result = (
        supabase_admin.table("schedule_day_completions")
        .select("date, is_done")
        .eq("user_id", current_user.id)
        .execute()
    )
    return {"items": result.data or []}


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
