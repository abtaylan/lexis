"""
backend/app/services/user_report_service.py

ÖNEMLİ: Bu dosya YANLIŞLIKLA report_service.py'nin üzerine yazılmıştı — o
dosya aslında Madde 6 şikayet/rapor (create_report, social.py::report_user
tarafından kullanılıyor) özelliğine ait, tamamen alakasız bir servis.
Çakışma fark edilip report_service.py git'ten geri yüklendi, bu kod ayrı bir
dosyaya (user_report_service.py) taşındı.

İstatistik & Raporlama V2 öncelik #3, madde A — "Kullanıcı raporu": toplam
çalışma süresi/oturum sayısı, seri (streak) durumu, kelime hazinesi
büyüklüğü+öğrenilmiş oranı, oyun performans trendi, görev haritası
ilerlemesi, kazanılan rozet sayısı, lig kademesi geçmişi — hepsi seçilen
döneme (hafta/ay) göre bir önceki eşit uzunluktaki döneme kıyasla %
değişimiyle.

Bilinçli kapsam dışı bırakılanlar:
- exam_attempts tablosu KULLANILMIYOR — bu tablo user_id'yi doğrudan
  taşımıyor (session_id -> exam_sessions -> user_id join'i gerekiyor,
  bkz. quests.py::_count_exam_attempts) VE hâlâ boş (0 satır, bkz. Faz 1
  bulgusu). Bunun yerine "sınav doğruluğu + zayıf/güçlü konular" için
  DOLU ve doğrudan user_id taşıyan topic_practice_attempts kullanılıyor.

Madde D — "ulusal/global içgörüler" (11 Eylül 2026, aynı gün üçüncü
ekleme) BURADA "platform" bölümü olarak eklendi, ama YENİDEN
YORUMLANARAK: profiles.country hâlâ yok VE canlı veride is_bot=false
olan TÜM 30 kullanıcı tek bir timezone'da (Europe/Istanbul — yani hepsi
Türkiye) — yani "ulusal" ile "global" şu an matematiksel olarak
birebir aynı olurdu. Bunun yerine daha somut ve hemen değerli olan
kısmı yapıldı: kullanıcının bu dönemki istatistiklerini PLATFORM
GENELİNDEKİ (aynı öğrenilen dili öğrenen, bot olmayan, aktif diğer
kullanıcılar) ortalamayla + genel XP yüzdelik dilimiyle karşılaştırma.
is_bot=true kayıtlar (119 adet, hepsi total_xp=0 — lig doldurma botları)
KESİNLİKLE hariç tutuluyor, yoksa her ortalama sıfıra yakın çıkıp
gerçek kullanıcıları yapay şekilde "platformun çok üstünde" gösterirdi.
`same_country_cohort` alanı bu varsayımı her çağrıda yeniden kontrol
eder (statik/hardcoded DEĞİL) — kullanıcı tabanı çeşitlenince (örn.
Korece/Çince lansmanından sonra) otomatik olarak false'a döner ve o an
gerçek bir "ulusal" ayrım (profiles.country ile) eklenmesi gerektiği
anlaşılır.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from app.core.database import supabase_admin

Period = Literal["week", "month"]

_MIN_TOPIC_ATTEMPTS = 3  # zayıf/güçlü konu sayılmak için en az bu kadar deneme


def _pct_change(current: float, previous: float) -> float | None:
    """previous=0 ise oran tanımsız — None döner (frontend "yeni" gösterir).
    previous>0 ise yüzde değişim, tam sayıya yuvarlanmış."""
    if previous == 0:
        return None if current == 0 else 100.0
    return round((current - previous) / previous * 100)


def _period_bounds(period: Period) -> tuple[datetime, datetime, datetime]:
    """(previous_start, current_start, now) — current dönem [current_start, now),
    previous dönem [previous_start, current_start)."""
    now = datetime.now(timezone.utc)
    days = 30 if period == "month" else 7
    current_start = now - timedelta(days=days)
    previous_start = now - timedelta(days=2 * days)
    return previous_start, current_start, now


def _get_profile(uid: str) -> dict[str, Any]:
    profile = (
        supabase_admin.table("profiles")
        .select("learning_lang, is_premium, premium_until, current_league_tier, total_xp")
        .eq("id", uid)
        .single()
        .execute()
    )
    return profile.data or {}


def _get_platform_comparison(
    user_id: str, active_lang: str, current_start: datetime, now: datetime, user_total_xp: int
) -> dict[str, Any]:
    """Madde D — platform genelinde karşılaştırma (bkz. modül docstring'i:
    "ulusal" ayrımı şu an anlamsız, bunun yerine bot hariç platform
    ortalaması + XP yüzdelik dilimi). is_bot=true kayıtlar HER ZAMAN hariç
    tutulur (aksi halde ortalamalar botların total_xp=0 olmasından dolayı
    yapay şekilde sıfıra çeker)."""
    cohort_rows = (
        supabase_admin.table("profiles")
        .select("id")
        .eq("is_bot", False)
        .eq("is_active", True)
        .eq("learning_lang", active_lang)
        .neq("id", user_id)
        .execute()
    ).data or []
    cohort_ids = [r["id"] for r in cohort_rows]

    avg_minutes = None
    avg_new_words = None
    active_peers_current = 0
    if cohort_ids:
        sessions = (
            supabase_admin.table("study_sessions")
            .select("user_id, duration_secs")
            .eq("learning_lang", active_lang)
            .in_("user_id", cohort_ids)
            .gte("started_at", current_start.isoformat())
            .execute()
        ).data or []
        active_peer_ids = {s["user_id"] for s in sessions}
        active_peers_current = len(active_peer_ids)
        if active_peer_ids:
            total_minutes = sum((s.get("duration_secs") or 0) for s in sessions) / 60
            avg_minutes = round(total_minutes / len(active_peer_ids), 1)

        words = (
            supabase_admin.table("words")
            .select("user_id")
            .eq("source_lang", active_lang)
            .in_("user_id", cohort_ids)
            .gte("created_at", current_start.isoformat())
            .execute()
        ).data or []
        if words:
            word_counts: dict[str, int] = {}
            for w in words:
                word_counts[w["user_id"]] = word_counts.get(w["user_id"], 0) + 1
            avg_new_words = round(sum(word_counts.values()) / len(word_counts), 1)

    avg_accuracy = None
    all_peer_rows = (
        supabase_admin.table("profiles")
        .select("id, total_xp, timezone")
        .eq("is_bot", False)
        .eq("is_active", True)
        .execute()
    ).data or []
    all_peer_ids = [r["id"] for r in all_peer_rows if r["id"] != user_id]
    if all_peer_ids:
        topic_rows = (
            supabase_admin.table("topic_practice_attempts")
            .select("is_correct")
            .in_("user_id", all_peer_ids)
            .gte("created_at", current_start.isoformat())
            .execute()
        ).data or []
        if topic_rows:
            avg_accuracy = round(sum(1 for t in topic_rows if t["is_correct"]) / len(topic_rows) * 100)

    all_xp_values = [r.get("total_xp") or 0 for r in all_peer_rows] + [user_total_xp]
    xp_percentile = None
    if len(all_xp_values) > 1:
        lower = sum(1 for x in all_xp_values if x < user_total_xp)
        xp_percentile = round(lower / (len(all_xp_values) - 1) * 100)

    distinct_timezones = {r.get("timezone") for r in all_peer_rows if r.get("timezone")}

    return {
        "cohort_size": len(cohort_ids),
        "active_peers_current": active_peers_current,
        "avg_minutes_current": avg_minutes,
        "avg_new_words_current": avg_new_words,
        "avg_accuracy_current": avg_accuracy,
        "xp_percentile": xp_percentile,
        "same_country_cohort": len(distinct_timezones) <= 1,
    }


async def get_user_report(user_id: str, period: Period = "week") -> dict[str, Any]:
    previous_start, current_start, now = _period_bounds(period)
    profile = _get_profile(user_id)
    active_lang = profile.get("learning_lang", "en")

    # ── Çalışma süresi + oturum sayısı (study_sessions: flashcard oturumları) ──
    sessions = (
        supabase_admin.table("study_sessions")
        .select("started_at, duration_secs, words_studied, correct_count, wrong_count")
        .eq("user_id", user_id)
        .eq("learning_lang", active_lang)
        .gte("started_at", previous_start.isoformat())
        .execute()
    ).data or []

    def _bucket(rows: list[dict], start: datetime, end: datetime) -> list[dict]:
        return [r for r in rows if start.isoformat() <= r["started_at"] < end.isoformat()]

    sess_current = _bucket(sessions, current_start, now)
    sess_previous = _bucket(sessions, previous_start, current_start)
    study_minutes_current = round(sum(s.get("duration_secs") or 0 for s in sess_current) / 60)
    study_minutes_previous = round(sum(s.get("duration_secs") or 0 for s in sess_previous) / 60)

    # ── Seri (streak) ──
    progress_rows = (
        supabase_admin.table("daily_progress")
        .select("date, streak_day")
        .eq("user_id", user_id)
        .eq("learning_lang", active_lang)
        .order("date", desc=True)
        .limit(1)
        .execute()
    ).data or []
    current_streak = progress_rows[0]["streak_day"] if progress_rows else 0
    longest_row = (
        supabase_admin.table("daily_progress")
        .select("streak_day")
        .eq("user_id", user_id)
        .eq("learning_lang", active_lang)
        .order("streak_day", desc=True)
        .limit(1)
        .execute()
    ).data or []
    longest_streak = longest_row[0]["streak_day"] if longest_row else current_streak

    # ── Kelime hazinesi ──
    words = (
        supabase_admin.table("words")
        .select("status, created_at")
        .eq("user_id", user_id)
        .eq("source_lang", active_lang)
        .execute()
    ).data or []
    total_words = len(words)
    learned_words = sum(1 for w in words if w["status"] == "learned")
    learned_pct = round((learned_words / total_words) * 100) if total_words else 0
    new_words_current = sum(1 for w in words if w["created_at"] >= current_start.isoformat())
    new_words_previous = sum(
        1 for w in words if previous_start.isoformat() <= w["created_at"] < current_start.isoformat()
    )

    # ── Oyun performans trendi (game_sessions) ──
    games = (
        supabase_admin.table("game_sessions")
        .select("started_at, score, xp_earned")
        .eq("user_id", user_id)
        .eq("learning_lang", active_lang)
        .gte("started_at", previous_start.isoformat())
        .execute()
    ).data or []
    games_current = _bucket(games, current_start, now)
    games_previous = _bucket(games, previous_start, current_start)
    games_avg_score_current = (
        round(sum(g.get("score") or 0 for g in games_current) / len(games_current), 1) if games_current else 0
    )
    games_avg_score_previous = (
        round(sum(g.get("score") or 0 for g in games_previous) / len(games_previous), 1) if games_previous else 0
    )

    # ── Sınav/konu doğruluğu + zayıf/güçlü konular (topic_practice_attempts) ──
    topic_attempts = (
        supabase_admin.table("topic_practice_attempts")
        .select("topic_tag, is_correct, created_at")
        .eq("user_id", user_id)
        .execute()
    ).data or []
    topic_current = _bucket(topic_attempts, current_start, now)
    topic_previous = _bucket(topic_attempts, previous_start, current_start)
    accuracy_current = (
        round(sum(1 for t in topic_current if t["is_correct"]) / len(topic_current) * 100)
        if topic_current
        else None
    )
    accuracy_previous = (
        round(sum(1 for t in topic_previous if t["is_correct"]) / len(topic_previous) * 100)
        if topic_previous
        else None
    )

    by_topic: dict[str, dict[str, int]] = {}
    for t in topic_attempts:
        tag = t["topic_tag"]
        bucket = by_topic.setdefault(tag, {"total": 0, "correct": 0})
        bucket["total"] += 1
        if t["is_correct"]:
            bucket["correct"] += 1
    topic_accuracy = [
        {"topic_tag": tag, "attempts": d["total"], "accuracy": round(d["correct"] / d["total"] * 100)}
        for tag, d in by_topic.items()
        if d["total"] >= _MIN_TOPIC_ATTEMPTS
    ]
    weak_topics = sorted(topic_accuracy, key=lambda x: x["accuracy"])[:3]
    strong_topics = sorted(topic_accuracy, key=lambda x: -x["accuracy"])[:3]

    # ── Görev haritası ilerlemesi ──
    total_active_nodes = (
        supabase_admin.table("quest_nodes")
        .select("id", count="exact")
        .eq("is_active", True)
        .execute()
    ).count or 0
    quest_progress = (
        supabase_admin.table("user_quest_progress")
        .select("completed_at")
        .eq("user_id", user_id)
        .execute()
    ).data or []
    quests_completed_total = len(quest_progress)
    quests_completed_current = sum(1 for q in quest_progress if q["completed_at"] >= current_start.isoformat())
    quests_completed_previous = sum(
        1 for q in quest_progress if previous_start.isoformat() <= q["completed_at"] < current_start.isoformat()
    )

    # ── Rozetler ──
    badge_rows = (
        supabase_admin.table("user_badges")
        .select("badge_code, earned_at")
        .eq("user_id", user_id)
        .execute()
    ).data or []
    badges_total = len({b["badge_code"] for b in badge_rows})
    badges_current = sum(1 for b in badge_rows if b["earned_at"] >= current_start.isoformat())

    # ── Lig kademesi geçmişi (son 12 hafta) ──
    # NOT: supabase-py'de embed edilmiş (foreign table) bir sütuna göre
    # .order() güvenilir değil — bu yüzden hepsi çekilip Python'da
    # leagues.week_start'a göre azalan sıralanıp son 12'si alınıyor
    # (bir kullanıcının haftalık lig geçmişi zaten küçük bir sayı).
    league_history_rows = (
        supabase_admin.table("league_memberships")
        .select("outcome, final_rank, final_xp, leagues(tier_slug, week_start, week_end)")
        .eq("user_id", user_id)
        .execute()
    ).data or []
    league_history_rows.sort(key=lambda row: (row.get("leagues") or {}).get("week_start") or "", reverse=True)
    league_history = [
        {
            "week_start": (row.get("leagues") or {}).get("week_start"),
            "tier_slug": (row.get("leagues") or {}).get("tier_slug"),
            "outcome": row.get("outcome"),
            "final_rank": row.get("final_rank"),
            "final_xp": row.get("final_xp"),
        }
        for row in league_history_rows[:12]
    ]

    return {
        "period": period,
        "learning_lang": active_lang,
        "range": {
            "current_start": current_start.isoformat(),
            "previous_start": previous_start.isoformat(),
            "now": now.isoformat(),
        },
        "study": {
            "minutes_current": study_minutes_current,
            "minutes_previous": study_minutes_previous,
            "minutes_change_pct": _pct_change(study_minutes_current, study_minutes_previous),
            "sessions_current": len(sess_current),
            "sessions_previous": len(sess_previous),
            "sessions_change_pct": _pct_change(len(sess_current), len(sess_previous)),
        },
        "streak": {"current": current_streak, "longest": longest_streak},
        "vocabulary": {
            "total_words": total_words,
            "learned_words": learned_words,
            "learned_pct": learned_pct,
            "new_words_current": new_words_current,
            "new_words_previous": new_words_previous,
            "new_words_change_pct": _pct_change(new_words_current, new_words_previous),
        },
        "games": {
            "sessions_current": len(games_current),
            "sessions_previous": len(games_previous),
            "sessions_change_pct": _pct_change(len(games_current), len(games_previous)),
            "avg_score_current": games_avg_score_current,
            "avg_score_previous": games_avg_score_previous,
        },
        "exam": {
            "accuracy_current": accuracy_current,
            "accuracy_previous": accuracy_previous,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
        },
        "quests": {
            "completed_total": quests_completed_total,
            "completed_current": quests_completed_current,
            "completed_previous": quests_completed_previous,
            "total_active_nodes": total_active_nodes,
            "progress_pct": round(quests_completed_total / total_active_nodes * 100) if total_active_nodes else 0,
        },
        "badges": {
            "total_earned": badges_total,
            "earned_current": badges_current,
        },
        "league": {
            "current_tier": profile.get("current_league_tier"),
            "history": league_history,
        },
        "subscription": {
            "is_premium": profile.get("is_premium", False),
            "premium_until": profile.get("premium_until"),
        },
        "platform": _get_platform_comparison(
            user_id, active_lang, current_start, now, profile.get("total_xp") or 0
        ),
    }
