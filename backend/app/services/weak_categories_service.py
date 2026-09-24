"""
backend/app/services/weak_categories_service.py

Madde 4b (24 Eylül 2026) -- "haftalık AI zayıf kategori özeti e-postası"
için, önceden sadece app/api/routes/words.py::weak_word_types ve
app/api/routes/games.py::weak_difficulty_levels route handler'larının
İÇİNDE yaşayan sorgu/hesaplama mantığı buraya, user_id parametresi alan
saf (route/Depends'ten bağımsız) fonksiyonlar olarak taşındı -- HİÇBİR
davranış değişikliği yok, iki route de artık bu fonksiyonları çağırıyor.

Neden şimdi ayrıldı: weekly_weak_categories_email.py (yeni haftalık
e-posta script'i) TÜM aktif kullanıcılar için bu hesaplamaları çağırması
gerekiyor, ama route fonksiyonları get_current_user Depends'ine bağlı --
FastAPI dependency injection'ı olmadan çağrılamazlar. user_report_service.py
zaten AYNI desende (route'suz, user_id parametreli servis fonksiyonları) --
buradaki iki fonksiyon o dosyadaki get_user_report/get_user_growth_report
ile aynı mimari yaklaşımı izliyor.

Sınav/konu bazlı zayıflık (exams.py::weak_topics, user_report_service.py'de
zaten "exam.weak_topics" olarak var) BİLEREK bu haftalık e-postaya dahil
EDİLMEDİ -- sadece tr-native/en-learning kullanıcılarına açık dar bir
alan (bkz. exams.py::_exam_area_enabled) ve dashboard'da zaten kendi ayrı
"Zayıf Konuların" widget'ı var. Buradaki iki kategori (kelime türü +
oyun zorluk seviyesi) TÜM kullanıcılara uygulanabilir olduğu için haftalık
özet e-postası için seçildi.
"""

from datetime import UTC, datetime, timedelta

from app.core.database import supabase_admin

_EASE_FACTOR_DEFAULT = 2.5


def get_weak_word_types(user_id: str, active_lang: str, days: int = 30, limit: int = 5) -> list[dict]:
    """words.py::weak_word_types ile AYNI hesaplama (bkz. o route'un
    docstring'i) -- kelime türü bazında ortalama ease_factor 2.5'in
    altında kalanlar "zayıf" sayılır. Dönüş: [{word_type, word_count,
    avg_ease_factor}, ...], en zayıftan en güçlüye sıralı."""
    days = max(1, min(days, 365))
    limit = max(1, min(limit, 20))
    since_iso = (datetime.now(UTC) - timedelta(days=days)).isoformat()

    rows = (
        supabase_admin.table("words")
        .select("word_type, ease_factor")
        .eq("user_id", user_id)
        .eq("source_lang", active_lang)
        .not_.is_("word_type", "null")
        .not_.is_("last_reviewed_at", "null")
        .gte("last_reviewed_at", since_iso)
        .execute()
        .data
    ) or []

    buckets: dict[str, dict[str, float]] = {}
    for r in rows:
        wt = (r.get("word_type") or "").strip().lower()
        if not wt:
            continue
        b = buckets.setdefault(wt, {"count": 0, "ease_sum": 0.0})
        b["count"] += 1
        b["ease_sum"] += float(r.get("ease_factor") or _EASE_FACTOR_DEFAULT)

    items = [
        {
            "word_type": wt,
            "word_count": int(b["count"]),
            "avg_ease_factor": round(b["ease_sum"] / b["count"], 2),
        }
        for wt, b in buckets.items()
        if (b["ease_sum"] / b["count"]) < _EASE_FACTOR_DEFAULT
    ]
    items.sort(key=lambda i: i["avg_ease_factor"])
    return items[:limit]


def get_weak_difficulty_levels(user_id: str, days: int = 30, limit: int = 5) -> list[dict]:
    """games.py::weak_difficulty_levels ile AYNI hesaplama (bkz. o
    route'un docstring'i) -- sadece pool_source='general' denemeleri
    sayılır. Dönüş: [{difficulty_level, total_count, wrong_count,
    accuracy_ratio}, ...], en çok yanlıştan en aza sıralı."""
    days = max(1, min(days, 365))
    limit = max(1, min(limit, 20))
    since_iso = (datetime.now(UTC) - timedelta(days=days)).isoformat()

    session_ids = [
        s["id"]
        for s in (
            supabase_admin.table("game_sessions")
            .select("id")
            .eq("user_id", user_id)
            .gte("started_at", since_iso)
            .execute()
            .data
            or []
        )
    ]
    if not session_ids:
        return []

    attempts = (
        supabase_admin.table("game_attempts")
        .select("general_word_id, is_correct")
        .in_("session_id", session_ids)
        .not_.is_("general_word_id", "null")
        .execute()
        .data
    ) or []
    if not attempts:
        return []

    general_word_ids = list({a["general_word_id"] for a in attempts})
    pool_rows = (
        supabase_admin.table("general_word_pool")
        .select("id, difficulty_level")
        .in_("id", general_word_ids)
        .execute()
        .data
    ) or []
    difficulty_by_id = {p["id"]: p.get("difficulty_level") for p in pool_rows}

    counts: dict[str, dict[str, int]] = {}
    for a in attempts:
        level = difficulty_by_id.get(a["general_word_id"])
        if not level:
            continue
        bucket = counts.setdefault(level, {"total": 0, "wrong": 0})
        bucket["total"] += 1
        if not a["is_correct"]:
            bucket["wrong"] += 1

    rows = [
        {"difficulty_level": level, "total_count": c["total"], "wrong_count": c["wrong"]}
        for level, c in counts.items()
        if c["wrong"] > 0
    ]
    rows.sort(key=lambda r: (-r["wrong_count"], r["wrong_count"] / r["total_count"]))
    rows = rows[:limit]

    return [
        {
            "difficulty_level": r["difficulty_level"],
            "total_count": r["total_count"],
            "wrong_count": r["wrong_count"],
            "accuracy_ratio": round((r["total_count"] - r["wrong_count"]) / r["total_count"], 4),
        }
        for r in rows
    ]
