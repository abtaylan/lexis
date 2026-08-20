"""
send_schedule_reminders.py
Madde 3a — Program (schedule) görevleri için hatırlatma e-postası +
Dashboard bildirimi gönderir.

expire_premium.py ile aynı desen: VPS'te gerçek bir sistem cron'u ile
periyodik çalıştırılmak üzere tasarlanmış, bağımsız bir script (in-process
scheduler/Celery YOK — bu proje için gereksiz bir altyapı yükü olurdu).

Kullanim:
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python send_schedule_reminders.py

Onerilen cron satiri (5 dakikada bir yeterli — REMINDER_WINDOW_MINUTES ile
uyumlu olmalı, aşağıya bakın):
  */5 * * * * cd /path/to/lexis/backend && venv/bin/python send_schedule_reminders.py >> /var/log/lexis_reminders.log 2>&1

Nasıl çalışır:
  1. reminder_lead dolu (15min/1hour/day_start) ve is_active=true olan tüm
     study_schedule kayıtları çekilir.
  2. Her kayıt için kullanıcının profiles.timezone'ına göre "şu an" hesaplanır
     (zoneinfo, stdlib — ekstra bağımlılık yok).
  3. Bugün o kaydın day_of_week'ine denk geliyorsa ve "tetiklenme zamanı"
     [now, now+REMINDER_WINDOW_MINUTES) penceresindeyse hatırlatma gönderilir.
  4. Aynı görev + aynı gün için tekrar göndermemek için notifications
     tablosundaki (schedule_item_id, reminder_date) UNIQUE index'i dedup
     görevi görür — script önce var mı diye bakar, DB constraint'i de
     ikinci bir güvenlik ağı olarak duruyor.

Sınırlama (bilinçli, kapsam dışı bırakıldı): 15min/1hour hatırlatmaları gece
yarısını geçen (örn. 00:10'daki bir görev için 23:55'te hatırlatma) sınır
durumlarını hesaba katmıyor — sadece "bugünün" görevleri kontrol ediliyor.
Bu, "orta büyüklük, izole" kapsamında kabul edilebilir bir basitleştirme.
"""

from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.database import supabase_admin
from app.services.email_service import send_schedule_reminder_email

# Script'in ne sıklıkla çalıştığı varsayımı — cron satırıyla eşleşmeli.
REMINDER_WINDOW_MINUTES = 5

# 'day_start' hatırlatmasının gönderileceği sabit yerel saat.
DAY_START_REMINDER_TIME = "07:00"

LEAD_MINUTES = {"15min": 15, "1hour": 60}
LEAD_LABELS = {"15min": "15 dakika sonra", "1hour": "1 saat sonra", "day_start": "bugün"}

DEFAULT_TIMEZONE = "Europe/Istanbul"


def _safe_zone(tz_name: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name or DEFAULT_TIMEZONE)
    except ZoneInfoNotFoundError:
        return ZoneInfo(DEFAULT_TIMEZONE)


def _app_day_of_week(dt: datetime) -> int:
    """Python weekday() (Pzt=0..Paz=6) -> uygulamanın day_of_week'i (Pazar=0..Cumartesi=6)."""
    return (dt.weekday() + 1) % 7


def _trigger_time_today(now_local: datetime, time_slot: str, reminder_lead: str) -> datetime | None:
    try:
        hh, mm = time_slot.strip().split(":")
        task_dt = now_local.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
    except (ValueError, AttributeError):
        return None

    if reminder_lead == "day_start":
        ds_hh, ds_mm = DAY_START_REMINDER_TIME.split(":")
        return now_local.replace(hour=int(ds_hh), minute=int(ds_mm), second=0, microsecond=0)

    lead_min = LEAD_MINUTES.get(reminder_lead)
    if lead_min is None:
        return None
    return task_dt - timedelta(minutes=lead_min)


def _already_sent(schedule_item_id: str, reminder_date: date) -> bool:
    result = (
        supabase_admin.table("notifications")
        .select("id")
        .eq("schedule_item_id", schedule_item_id)
        .eq("reminder_date", reminder_date.isoformat())
        .limit(1)
        .execute()
    )
    return bool(result.data)


def main():
    items = (
        supabase_admin.table("study_schedule")
        .select("id, user_id, day_of_week, time_slot, activity, reminder_lead")
        .not_.is_("reminder_lead", "null")
        .eq("is_active", True)
        .execute()
    ).data or []

    if not items:
        print("Hatırlatma tercihi olan aktif görev yok, çıkılıyor.")
        return

    user_ids = sorted({it["user_id"] for it in items})
    profiles = (
        supabase_admin.table("profiles")
        .select("id, timezone")
        .in_("id", user_ids)
        .execute()
    ).data or []
    tz_map = {p["id"]: p.get("timezone") or DEFAULT_TIMEZONE for p in profiles}

    # E-posta auth.users'da tutuluyor — admin.py'deki aynı desenle eşleştir.
    email_map = {}
    try:
        page = supabase_admin.auth.admin.list_users()
        users = page if isinstance(page, list) else getattr(page, "users", [])
        for u in users:
            email_map[u.id] = u.email
    except Exception as e:
        print(f"REMINDERS email map warning: {e}")

    sent_count = 0
    for item in items:
        tz = _safe_zone(tz_map.get(item["user_id"], DEFAULT_TIMEZONE))
        now_local = datetime.now(tz)

        if item["day_of_week"] != _app_day_of_week(now_local):
            continue

        trigger_dt = _trigger_time_today(now_local, item["time_slot"], item["reminder_lead"])
        if trigger_dt is None:
            continue

        window_end = trigger_dt + timedelta(minutes=REMINDER_WINDOW_MINUTES)
        if not (trigger_dt <= now_local < window_end):
            continue

        reminder_date = now_local.date()
        if _already_sent(item["id"], reminder_date):
            continue

        to_email = email_map.get(item["user_id"])
        lead_label = LEAD_LABELS.get(item["reminder_lead"], item["reminder_lead"])
        title = f"Hatırlatma: {item['activity']}"
        message = f"\"{item['activity']}\" görevin {lead_label} başlıyor (saat {item['time_slot']})."

        try:
            supabase_admin.table("notifications").insert(
                {
                    "user_id": item["user_id"],
                    "type": "schedule_reminder",
                    "title": title,
                    "message": message,
                    "schedule_item_id": item["id"],
                    "reminder_date": reminder_date.isoformat(),
                }
            ).execute()
        except Exception as e:
            # UNIQUE(schedule_item_id, reminder_date) — yarış durumunda burada
            # düşer, sessizce atla (zaten gönderilmiş demektir).
            print(f"NOTIFICATION INSERT SKIP ({item['id']}): {e}")
            continue

        if to_email:
            send_schedule_reminder_email(to_email, item["activity"], item["time_slot"], lead_label)
        else:
            print(f"REMINDERS: {item['user_id']} için e-posta bulunamadı, sadece bildirim oluşturuldu.")

        sent_count += 1

    print(f"[{datetime.now(ZoneInfo(DEFAULT_TIMEZONE)).isoformat()}] {sent_count} hatırlatma gönderildi "
          f"({len(items)} aday görev kontrol edildi).")


if __name__ == "__main__":
    main()
