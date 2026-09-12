"""
backend/app/services/subscription_segment_service.py

İstatistik & Raporlama V2 öncelik #3, Faz 3 madde H — "Abonelik-segment
korelasyonu": premium (profiles.is_premium=true) ile free kullanıcıların
katılım/performans metriklerini karşılaştırır — admin panelinden "premium
kullanıcı gerçekten daha mı aktif/başarılı?" sorusuna kaba bir cevap.

is_bot=true kayıtlar (119 adet, hepsi total_xp=0 — bkz. madde D/E bulgusu,
platform_snapshot_service.py / user_report_service.py) HER ZAMAN hariç
tutuluyor, aksi halde free segmenti yapay şekilde bozulurdu (bot havuzu
zaten hep is_premium=false).

ÖNEMLİ — 12 Eylül 2026 canlı veri bulgusu #1: profiles.is_premium=true VE
subscriptions tablosunda HİÇ satır YOK (web Premium akışı kapatıldı, mobil
IAP premium hâlâ Play Console kapalı testinde — ~18 Eylül'de dolacak, bkz.
devir notu). Yani bu endpoint şu an "premium" segmentini 0 kullanıcıyla
dönecek. BİLİNÇLİ OLARAK ertelenmedi — segment boşken/küçükken
"insufficient_data" bayrağını (bkz. _MIN_SEGMENT_USERS) net şekilde
göstermek ve ilk gerçek premium kullanıcılar oluştuğunda KOD DEĞİŞİKLİĞİ
GEREKMEDEN doğru sonuç üretmeye başlamak, özelliği veri gelene kadar hiç
yazmamaktan daha doğru bir tasarım kararı — bkz. madde C'nin "yeterli veri
yok" deseniyle aynı yaklaşım (content_flag_service.py).

ÖNEMLİ — 12 Eylül 2026 canlı veri bulgusu #2 (bu maddeyi tasarlarken
keşfedildi, madde D/Faz 1'deki "boş tablo" bulgularıyla AYNI ailede —
zero-data findings pattern, bkz. devir notu/topic_practice_attempts +
exam_attempts): study_sessions tablosu ÜRETİMDE TAMAMEN BOŞ (0 satır,
hiç doldurulmamış) VE topic_practice_attempts tablosu da BOŞ (0 satır) —
yani bu iki tablo, kod tabanındaki diğer bazı raporların (user_report_
service.py, platform_snapshot_service.py) "çalışma süresi/oturum sayısı"
ve "konu doğruluğu" metriklerinin dayandığı kaynaklar, ama gerçekte hiç
veri üretmiyorlar (muhtemelen mobil/web tarafında bu event'lerin hiç
gönderilmediği bir enstrümantasyon boşluğu — bu servisin kapsamı dışında,
ayrı bir inceleme gerektirir). BU YÜZDEN bu modül BİLEREK bu iki tabloya
DAYANMIYOR — bunun yerine GERÇEKTEN DOLU olan tabloları kullanıyor:
daily_progress (aktiflik + kelime tekrar sayısı + seri), words (yeni
kelime ekleme olayları), xp_events (kazanılan XP). "Aktif kullanıcı"
tanımı, stats_detailed()'in retention tanımıyla AYNI ilke: "dönem içinde
en az bir daily_progress kaydı üreten kullanıcı". avg_topic_accuracy_
percent alanı yine de tutuluyor (topic_practice_attempts dolarsa otomatik
çalışır) ama şu an her zaman None dönüyor — bu bilerek bırakılmış, yanlış
bir "0%" göstermekten daha doğru.

`by_plan` alanı: subscriptions tablosunda status='active' olan satırları
plan_code'a göre gruplar — şu an her zaman boş liste ([]) döner (tablo
boş), ama gerçek abonelikler oluştuğunda otomatik dolar; premium/free ana
ayrımı için KULLANILMIYOR (o hâlâ profiles.is_premium — bu repodaki
yerleşik kaynak, bkz. platform_snapshot_service.py), sadece ek bilgi.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.database import supabase_admin

# Bir segmentteki kullanıcı sayısı bunun altındaysa ortalamalar/oranlar
# istatistiksel olarak anlamsız kabul edilip insufficient_data=True
# işaretlenir (frontend bunu görünce "yeterli veri yok" gösteriyor).
_MIN_SEGMENT_USERS = 5


def _segment_metrics(user_ids: list[str], since_iso: str, since_date: str) -> dict[str, Any]:
    total_users = len(user_ids)
    if not user_ids:
        return {
            "total_users": 0,
            "active_users": 0,
            "active_rate_percent": 0.0,
            "avg_words_reviewed_per_active_user": 0.0,
            "avg_new_words_per_active_user": 0.0,
            "avg_topic_accuracy_percent": None,
            "avg_xp_per_active_user": 0.0,
            "avg_current_streak": 0.0,
            "insufficient_data": True,
        }

    # ── Aktiflik + kelime tekrar sayısı (daily_progress — bkz. modül
    # docstring'i: study_sessions boş olduğu için "aktif kullanıcı" burada
    # stats_detailed()'in retention tanımıyla AYNI ilkeyle belirleniyor). ──
    progress_rows = (
        supabase_admin.table("daily_progress")
        .select("user_id, words_reviewed")
        .in_("user_id", user_ids)
        .gte("date", since_date)
        .execute()
    ).data or []
    active_ids = {r["user_id"] for r in progress_rows}
    active_count = len(active_ids)
    total_words_reviewed = sum((r.get("words_reviewed") or 0) for r in progress_rows)

    total_new_words = (
        supabase_admin.table("words")
        .select("id", count="exact")
        .in_("user_id", user_ids)
        .gte("created_at", since_iso)
        .limit(1)
        .execute()
        .count
    ) or 0

    # Şu an her zaman boş dönüyor (bkz. modül docstring'i, bulgu #2) —
    # tablo dolarsa kod değişikliği gerekmeden çalışmaya başlar.
    topic_rows = (
        supabase_admin.table("topic_practice_attempts")
        .select("is_correct")
        .in_("user_id", user_ids)
        .gte("created_at", since_iso)
        .execute()
    ).data or []
    avg_topic_accuracy = (
        round(sum(1 for t in topic_rows if t["is_correct"]) / len(topic_rows) * 100, 1)
        if topic_rows
        else None
    )

    xp_rows = (
        supabase_admin.table("xp_events")
        .select("amount")
        .in_("user_id", user_ids)
        .gte("created_at", since_iso)
        .execute()
    ).data or []
    total_xp = sum((x.get("amount") or 0) for x in xp_rows)

    # Güncel seri (streak): her kullanıcının EN SON daily_progress satırındaki
    # streak_day'i — bkz. user_report_service.py::current_streak ile aynı
    # tanım, burada tüm segment için tek sorguda toplu çıkarılıyor (rows
    # date'e göre azalan sırayla geldiği için bir user_id'nin İLK karşılaşılan
    # satırı zaten onun en güncel satırıdır). Bilerek raporlama PERİYODUNA
    # (since_date) bağlı değil — "şu an kaçıncı günündesin" periyottan
    # bağımsız bir anlık durumdur. Ortalama TÜM segment üzerinden alınıyor
    # (hiç daily_progress'i olmayan/uzun süredir pasif kullanıcı 0 seri ile
    # sayılır) — sadece aktif kullanıcılar üzerinden almak segmentin gerçek
    # "tipik" serisini olduğundan yüksek gösterirdi.
    latest_rows = (
        supabase_admin.table("daily_progress")
        .select("user_id, date, streak_day")
        .in_("user_id", user_ids)
        .order("date", desc=True)
        .execute()
    ).data or []
    latest_streak_by_user: dict[str, int] = {}
    for row in latest_rows:
        uid = row["user_id"]
        if uid not in latest_streak_by_user:
            latest_streak_by_user[uid] = row.get("streak_day") or 0
    avg_streak = round(sum(latest_streak_by_user.values()) / total_users, 1)

    return {
        "total_users": total_users,
        "active_users": active_count,
        "active_rate_percent": round(active_count / total_users * 100, 1),
        "avg_words_reviewed_per_active_user": round(total_words_reviewed / active_count, 1) if active_count else 0.0,
        "avg_new_words_per_active_user": round(total_new_words / active_count, 1) if active_count else 0.0,
        "avg_topic_accuracy_percent": avg_topic_accuracy,
        "avg_xp_per_active_user": round(total_xp / active_count, 1) if active_count else 0.0,
        "avg_current_streak": avg_streak,
        "insufficient_data": total_users < _MIN_SEGMENT_USERS,
    }


async def get_subscription_segments(days: int = 30) -> dict[str, Any]:
    days = max(7, min(days, 180))
    since_dt = datetime.now(UTC) - timedelta(days=days)
    since_iso = since_dt.isoformat()
    since_date = since_dt.date().isoformat()

    profiles = (
        supabase_admin.table("profiles")
        .select("id, is_premium")
        .eq("is_bot", False)
        .eq("is_active", True)
        .execute()
    ).data or []
    premium_ids = [p["id"] for p in profiles if p.get("is_premium")]
    free_ids = [p["id"] for p in profiles if not p.get("is_premium")]

    premium = _segment_metrics(premium_ids, since_iso, since_date)
    free = _segment_metrics(free_ids, since_iso, since_date)

    plan_rows = (
        supabase_admin.table("subscriptions")
        .select("plan_code")
        .eq("status", "active")
        .execute()
    ).data or []
    by_plan_counts: dict[str, int] = {}
    for row in plan_rows:
        code = row.get("plan_code") or "unknown"
        by_plan_counts[code] = by_plan_counts.get(code, 0) + 1
    by_plan = [
        {"plan_code": code, "active_count": count}
        for code, count in sorted(by_plan_counts.items())
    ]

    return {
        "period_days": days,
        "premium": premium,
        "free": free,
        "by_plan": by_plan,
    }
