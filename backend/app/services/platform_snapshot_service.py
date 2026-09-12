"""
backend/app/services/platform_snapshot_service.py

İstatistik & Raporlama V2 öncelik #3, Faz 3 madde E — "Zaman bazlı
periyodik snapshot+cron" (bkz. migration 066_platform_daily_snapshots.sql).

Madde A/B/D'nin rapor hesaplamaları hep CANLI (raw tablolardan "bu dönem
vs bir önceki dönem" karşılaştırması) — geçmiş birçok dönem boyunca trend
görmek (ör. "son 30 gün DAU nasıl gitti") için uygun değil. Bu modüldeki
capture_daily_snapshot(), platform genelinde (bot hariç) bir günün özet
metriklerini platform_daily_snapshots tablosuna İDEMPOTENT şekilde yazar
(snapshot_date UNIQUE — aynı gün için tekrar çağrılırsa sadece o satırı
günceller, ikinci bir satır açmaz).

Üretimde GÜNLÜK olarak bir Claude scheduled task tarafından, bu
fonksiyonun SQL karşılığıyla tetikleniyor (bkz. devir notu) — bu repodaki
expire_premium.py/league_weekly_rollover.py/distribute_leaderboard_rewards.py
ile AYNI desen: backend'de "gerçek" Python fonksiyonu/scripti de var (yerel
geliştirme + referans için), ama üretimdeki periyodik çalıştırma VPS
cron'una hiç bağlanmadı — Claude scheduled task + Supabase MCP SQL
üzerinden yapılıyor (backend Railway'de ayrıca network gerektirmiyor,
sadece Supabase okuyup yazıyor).

is_bot=true kayıtlar (119 adet, hepsi total_xp=0 — bkz. madde D bulgusu,
user_report_service.py modül docstring'i) HER metrikten hariç tutuluyor,
aksi halde platform ortalamaları yapay şekilde bozulurdu.

Faz 3 madde I (12 Eylül 2026) — "Admin filtreleme/benchmark/takvim":
get_snapshot_benchmark(), bu tablodaki geçmiş satırları kullanarak seçilen
periyodu (days) bir önceki EŞİT UZUNLUKTAKİ periyotla karşılaştırır (madde
D/A'daki "_pct_change" ilkesiyle aynı — bkz. user_report_service.py).
"Takvim" (günlük yoğunluk ısı haritası) ve "filtreleme" (gün aralığı
seçici) tarafı SAF FRONTEND işi — ikisi de zaten var olan get_snapshots()
uç noktasının döndürdüğü ham satırlarla besleniyor, yeni bir backend
sorgusu gerektirmiyor. ÖNEMLİ: platform_daily_snapshots tablosu (madde E)
üretimde henüz sadece 1 gün veri içeriyor (cron 11 Eylül'de başladı) —
bu yüzden benchmark/takvim şu an "yeterli veri yok" durumunu gösterecek,
gün geçtikçe otomatik dolacak (bkz. _MIN_BENCHMARK_DAYS).
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from app.core.database import supabase_admin

# TR takvim gününe hizalamak için sabit +3 saatlik ofset — bu repodaki
# yerleşik konvansiyon (bkz. distribute_leaderboard_rewards.py'nin haftalık
# SQL'i, "now() + interval '3 hours'" ile aynı numara). Türkiye'de DST
# uygulanmıyor (sabit UTC+3), bu yüzden basit bir sabit ofset yeterli.
_TR_OFFSET = timedelta(hours=3)

# Bir periyotta bundan az gün veri varsa (mevcut VEYA önceki periyot)
# karşılaştırma istatistiksel olarak anlamsız kabul edilip
# insufficient_data=True işaretlenir.
_MIN_BENCHMARK_DAYS = 3


def _pct_change(current: float, previous: float) -> float | None:
    """previous=0 ise oran tanımsız — None döner (frontend "yeni" gösterir).
    previous>0 ise yüzde değişim, tam sayıya yuvarlanmış. Bkz.
    user_report_service.py'deki AYNI isimli fonksiyon (bilerek burada da
    ayrı tutuldu — iki servis arası gereksiz bir cross-import'tan kaçınmak
    için, bu repodaki yerleşik "her serviste kendi küçük yardımcıları"
    deseniyle tutarlı)."""
    if previous == 0:
        return None if current == 0 else 100.0
    return round((current - previous) / previous * 100)


def _tr_day_bounds(target_date: date | None) -> tuple[datetime, datetime, date]:
    """target_date verilmezse: TR takviminde "dün" (bu fonksiyonun günde bir
    kez, erken sabah UTC'de/cron ile çağrıldığı varsayımıyla — bkz. devir
    notundaki koşum saati). Döner: (gün_başlangıcı_utc, gün_bitişi_utc,
    snapshot_date).

    ÖNEMLİ — bu repodaki YERLEŞİK (distribute_leaderboard_rewards.py'nin
    haftalık SQL'iyle AYNI) yaklaşıklığı bilerek koruyor: "TR günü" burada
    tam olarak "UTC gece yarısı, ama tarihi +3 saat kaydırılmış" anlamına
    geliyor (gerçek TR gece yarısından ~3 saat SONRA başlıyor) — matematiksel
    olarak kusursuz bir TZ dönüşümü değil, ama zaten üretimde kullanılan
    haftalık lig/ödül job'larıyla TUTARLI, basit bir yaklaşıklık. Üretimdeki
    gerçek cron (Claude scheduled task) bu fonksiyonu DEĞİL, aynı mantığın
    SQL karşılığını çalıştırıyor — bkz. devir notu."""
    now_utc = datetime.now(UTC)
    now_tr_date = (now_utc + _TR_OFFSET).date()
    snap_date = target_date if target_date is not None else (now_tr_date - timedelta(days=1))
    day_start_utc = datetime(snap_date.year, snap_date.month, snap_date.day, tzinfo=UTC)
    day_end_utc = day_start_utc + timedelta(days=1)
    return day_start_utc, day_end_utc, snap_date


async def capture_daily_snapshot(target_date: date | None = None) -> dict[str, Any]:
    """target_date verilmezse TR takviminde dünü özetler (günlük cron'un
    normal kullanımı). Belirli bir günü yeniden hesaplamak/doldurmak için
    target_date verilebilir — idempotent (aynı satırı günceller)."""
    day_start, day_end, snap_date = _tr_day_bounds(target_date)
    day_start_iso = day_start.isoformat()
    day_end_iso = day_end.isoformat()

    non_bot_rows = (
        supabase_admin.table("profiles")
        .select("id, is_premium")
        .eq("is_bot", False)
        .eq("is_active", True)
        .execute()
    ).data or []
    non_bot_ids = [r["id"] for r in non_bot_rows]
    total_active_profiles = len(non_bot_rows)
    premium_users_count = sum(1 for r in non_bot_rows if r.get("is_premium"))

    new_signups_count = (
        supabase_admin.table("profiles")
        .select("id", count="exact")
        .eq("is_bot", False)
        .gte("created_at", day_start_iso)
        .lt("created_at", day_end_iso)
        .limit(1)
        .execute()
        .count
    ) or 0

    active_users_count = 0
    total_study_minutes = 0.0
    total_new_words = 0
    avg_topic_accuracy: int | None = None
    total_xp_awarded = 0

    if non_bot_ids:
        sessions = (
            supabase_admin.table("study_sessions")
            .select("user_id, duration_secs")
            .in_("user_id", non_bot_ids)
            .gte("started_at", day_start_iso)
            .lt("started_at", day_end_iso)
            .execute()
        ).data or []
        active_user_ids = {s["user_id"] for s in sessions}
        active_users_count = len(active_user_ids)
        total_study_minutes = round(sum((s.get("duration_secs") or 0) for s in sessions) / 60, 1)

        total_new_words = (
            supabase_admin.table("words")
            .select("id", count="exact")
            .in_("user_id", non_bot_ids)
            .gte("created_at", day_start_iso)
            .lt("created_at", day_end_iso)
            .limit(1)
            .execute()
            .count
        ) or 0

        topic_rows = (
            supabase_admin.table("topic_practice_attempts")
            .select("is_correct")
            .in_("user_id", non_bot_ids)
            .gte("created_at", day_start_iso)
            .lt("created_at", day_end_iso)
            .execute()
        ).data or []
        if topic_rows:
            avg_topic_accuracy = round(sum(1 for t in topic_rows if t["is_correct"]) / len(topic_rows) * 100)

        xp_rows = (
            supabase_admin.table("xp_events")
            .select("amount")
            .in_("user_id", non_bot_ids)
            .gte("created_at", day_start_iso)
            .lt("created_at", day_end_iso)
            .execute()
        ).data or []
        total_xp_awarded = sum((x.get("amount") or 0) for x in xp_rows)

    payload = {
        "snapshot_date": snap_date.isoformat(),
        "new_signups_count": new_signups_count,
        "active_users_count": active_users_count,
        "total_study_minutes": total_study_minutes,
        "total_new_words": total_new_words,
        "avg_topic_accuracy": avg_topic_accuracy,
        "total_xp_awarded": total_xp_awarded,
        "premium_users_count": premium_users_count,
        "total_active_profiles": total_active_profiles,
        "captured_at": datetime.now(UTC).isoformat(),
    }
    supabase_admin.table("platform_daily_snapshots").upsert(payload, on_conflict="snapshot_date").execute()
    return payload


async def get_snapshots(days: int = 30) -> list[dict[str, Any]]:
    days = max(1, min(days, 365))
    rows = (
        supabase_admin.table("platform_daily_snapshots")
        .select("*")
        .order("snapshot_date", desc=True)
        .limit(days)
        .execute()
        .data
    ) or []
    return rows


async def get_snapshot_benchmark(days: int = 30) -> dict[str, Any]:
    """Seçilen `days` periyodunu (bugün dahil, son N gün) bir önceki EŞİT
    UZUNLUKTAKİ periyotla karşılaştırır. Toplanabilir metrikler (yeni kayıt,
    çalışma dakikası, yeni kelime, XP) SUM; oransal/anlık durum metrikleri
    (aktif kullanıcı, konu doğruluğu, premium sayısı, toplam aktif profil)
    periyot içi ORTALAMA olarak alınıyor — bkz. modül docstring'i."""
    days = max(7, min(days, 180))
    today = datetime.now(UTC).date()
    current_start = today - timedelta(days=days)
    previous_start = today - timedelta(days=days * 2)

    all_rows = (
        supabase_admin.table("platform_daily_snapshots")
        .select("*")
        .gte("snapshot_date", previous_start.isoformat())
        .order("snapshot_date")
        .execute()
    ).data or []
    current_rows = [r for r in all_rows if r["snapshot_date"] >= current_start.isoformat()]
    previous_rows = [r for r in all_rows if r["snapshot_date"] < current_start.isoformat()]

    def _summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
        n = len(rows)
        if not n:
            return {
                "days_with_data": 0,
                "total_new_signups": 0,
                "avg_active_users": 0.0,
                "total_study_minutes": 0.0,
                "total_new_words": 0,
                "avg_topic_accuracy": None,
                "total_xp_awarded": 0,
                "avg_premium_users": 0.0,
                "avg_total_active_profiles": 0.0,
            }
        accuracy_vals = [r["avg_topic_accuracy"] for r in rows if r.get("avg_topic_accuracy") is not None]
        return {
            "days_with_data": n,
            "total_new_signups": sum(r.get("new_signups_count") or 0 for r in rows),
            "avg_active_users": round(sum(r.get("active_users_count") or 0 for r in rows) / n, 1),
            "total_study_minutes": round(sum(r.get("total_study_minutes") or 0 for r in rows), 1),
            "total_new_words": sum(r.get("total_new_words") or 0 for r in rows),
            "avg_topic_accuracy": round(sum(accuracy_vals) / len(accuracy_vals), 1) if accuracy_vals else None,
            "total_xp_awarded": sum(r.get("total_xp_awarded") or 0 for r in rows),
            "avg_premium_users": round(sum(r.get("premium_users_count") or 0 for r in rows) / n, 1),
            "avg_total_active_profiles": round(sum(r.get("total_active_profiles") or 0 for r in rows) / n, 1),
        }

    current = _summarize(current_rows)
    previous = _summarize(previous_rows)

    pct_fields = [
        "total_new_signups", "avg_active_users", "total_study_minutes", "total_new_words",
        "avg_topic_accuracy", "total_xp_awarded", "avg_premium_users", "avg_total_active_profiles",
    ]
    pct_change: dict[str, float | None] = {}
    for field in pct_fields:
        cur_val, prev_val = current[field], previous[field]
        pct_change[field] = None if cur_val is None or prev_val is None else _pct_change(cur_val, prev_val)

    return {
        "period_days": days,
        "current": current,
        "previous": previous,
        "pct_change": pct_change,
        "insufficient_data": current["days_with_data"] < _MIN_BENCHMARK_DAYS or previous["days_with_data"] < _MIN_BENCHMARK_DAYS,
    }
