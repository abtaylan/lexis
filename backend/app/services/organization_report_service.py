"""
backend/app/services/organization_report_service.py

İstatistik & Raporlama V2 öncelik #3, madde B — "B2B/kurum raporu": bir
kurumun (organizations/organization_members, bkz. routes/organizations.py)
TÜM üyeleri genelinde toplu bir dönemsel özet. user_report_service.py'nin
(madde A, "Kullanıcı Raporu") aynı dönem-karşılaştırma desenini (bu hafta/ay
vs bir önceki eşit uzunluktaki dönem) kurum seviyesine taşır.

KAPSAM NOTU: organizations.py'nin kendi docstring'i, kurum-scope'lu LİG
oluşturmanın (V2 §6.3 Faz 3d'nin geri kalanı — "B2B Kurumsal Lig arayüzü",
V2 öncelik #4) bilinçli olarak yapılmadığını söylüyor; bu servis SADECE
raporlama katmanı, kurum yönetimi/lig özelliklerine dokunmuyor. Bu oturumda
canlı DB'de HİÇ organizasyon yoktu (organizations tablosu boş) — mantık bir
test kurumu oluşturulup canlı Supabase'de doğrulandı (bkz. devir notu).

Bilinçli kapsam dışı: profiles.country yok, o yüzden "kurumun hangi
şehir/bölgeden" gibi bir kırılım burada değil.

MADDE G (KVKK onay mekanizması, aynı gün eklendi): `top_learners` bölümü
üyeleri İSİMLİ gösteriyor ve artık PDF/CSV/Excel'e export edilip
e-postayla gönderilebiliyor (madde F) — bu yüzden sadece
`organization_members.report_consent_at IS NOT NULL` olan (yani rapor
paylaşımına AÇIKÇA onay vermiş) üyeler `top_learners`'a dahil ediliyor.
Onay vermemiş üyelerin XP'si sayılmıyor/gösterilmiyor (aggregate
`study`/`accuracy`/`vocabulary` bölümleri isimsiz/toplu olduğu için
onaydan etkilenmiyor). Dönen dict'e şeffaflık için `consent_summary`
eklendi — bkz. routes/organizations.py::set_report_consent, migration 067.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from app.core.database import supabase_admin

Period = Literal["week", "month"]

_MIN_TOPIC_ATTEMPTS = 5  # kurum genelinde zayıf konu sayılmak için en az bu kadar deneme (toplamda)


def _pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None if current == 0 else 100.0
    return round((current - previous) / previous * 100)


def _period_bounds(period: Period) -> tuple[datetime, datetime, datetime]:
    now = datetime.now(timezone.utc)
    days = 30 if period == "month" else 7
    current_start = now - timedelta(days=days)
    previous_start = now - timedelta(days=2 * days)
    return previous_start, current_start, now


def _bucket(rows: list[dict], key: str, start: datetime, end: datetime) -> list[dict]:
    return [r for r in rows if start.isoformat() <= r[key] < end.isoformat()]


async def get_organization_report(org_id: str, period: Period = "week") -> dict[str, Any]:
    previous_start, current_start, now = _period_bounds(period)

    org_res = (
        supabase_admin.table("organizations")
        .select("id, name, plan, created_at")
        .eq("id", org_id)
        .single()
        .execute()
    )
    org = org_res.data or {}

    member_rows = (
        supabase_admin.table("organization_members")
        .select("user_id, role, joined_at, report_consent_at")
        .eq("org_id", org_id)
        .execute()
    ).data or []
    member_ids = [m["user_id"] for m in member_rows]
    consented_ids = {m["user_id"] for m in member_rows if m.get("report_consent_at")}

    if not member_ids:
        # Boş kurum — hiçbir alt sorguya gerek yok (supabase-py'de bos bir
        # .in_() listesi PostgREST hatasi verir, bu yuzden erken donuyoruz).
        return {
            "org": {"id": org.get("id", org_id), "name": org.get("name"), "plan": org.get("plan")},
            "period": period,
            "member_count": 0,
            "active_member_count": 0,
            "study": {"minutes_current": 0, "minutes_previous": 0, "minutes_change_pct": None,
                      "sessions_current": 0, "sessions_previous": 0, "sessions_change_pct": None},
            "accuracy": {"current": None, "previous": None},
            "vocabulary": {"new_words_current": 0, "new_words_previous": 0, "new_words_change_pct": None},
            "top_learners": [],
            "weak_topics": [],
            "badges_earned_current": 0,
            "consent_summary": {"consented_count": 0, "total_count": 0},
        }

    profiles_by_id: dict[str, dict] = {}
    profile_rows = (
        supabase_admin.table("profiles")
        .select("id, username, learning_lang")
        .in_("id", member_ids)
        .execute()
    ).data or []
    profiles_by_id = {p["id"]: p for p in profile_rows}

    # ── Çalışma süresi + oturum sayısı ──
    sessions = (
        supabase_admin.table("study_sessions")
        .select("user_id, started_at, duration_secs")
        .in_("user_id", member_ids)
        .gte("started_at", previous_start.isoformat())
        .execute()
    ).data or []
    sess_current = _bucket(sessions, "started_at", current_start, now)
    sess_previous = _bucket(sessions, "started_at", previous_start, current_start)
    minutes_current = round(sum(s.get("duration_secs") or 0 for s in sess_current) / 60)
    minutes_previous = round(sum(s.get("duration_secs") or 0 for s in sess_previous) / 60)

    # ── Sınav/konu doğruluğu (topic_practice_attempts) — kurum genelinde ──
    topic_attempts = (
        supabase_admin.table("topic_practice_attempts")
        .select("user_id, topic_tag, is_correct, created_at")
        .in_("user_id", member_ids)
        .execute()
    ).data or []
    topic_current = _bucket(topic_attempts, "created_at", current_start, now)
    topic_previous = _bucket(topic_attempts, "created_at", previous_start, current_start)
    accuracy_current = (
        round(sum(1 for t in topic_current if t["is_correct"]) / len(topic_current) * 100)
        if topic_current else None
    )
    accuracy_previous = (
        round(sum(1 for t in topic_previous if t["is_correct"]) / len(topic_previous) * 100)
        if topic_previous else None
    )

    by_topic: dict[str, dict[str, int]] = {}
    for t in topic_current:
        tag = t["topic_tag"]
        bucket = by_topic.setdefault(tag, {"total": 0, "correct": 0})
        bucket["total"] += 1
        if t["is_correct"]:
            bucket["correct"] += 1
    weak_topics = sorted(
        (
            {"topic_tag": tag, "attempts": d["total"], "accuracy": round(d["correct"] / d["total"] * 100)}
            for tag, d in by_topic.items()
            if d["total"] >= _MIN_TOPIC_ATTEMPTS
        ),
        key=lambda x: x["accuracy"],
    )[:5]

    # ── Kelime hazinesi (yeni eklenen) ──
    words = (
        supabase_admin.table("words")
        .select("user_id, created_at")
        .in_("user_id", member_ids)
        .gte("created_at", previous_start.isoformat())
        .execute()
    ).data or []
    new_words_current = len(_bucket(words, "created_at", current_start, now))
    new_words_previous = len(_bucket(words, "created_at", previous_start, current_start))

    # ── En aktif üyeler (dönem içinde kazanılan XP'ye göre) ──
    xp_rows = (
        supabase_admin.table("xp_events")
        .select("user_id, amount, created_at")
        .in_("user_id", member_ids)
        .gte("created_at", current_start.isoformat())
        .execute()
    ).data or []
    xp_by_user: dict[str, int] = {}
    for row in xp_rows:
        if row["user_id"] not in consented_ids:
            continue  # madde G: rapor paylaşımına onay vermemiş üye isimli listelenmiyor
        xp_by_user[row["user_id"]] = xp_by_user.get(row["user_id"], 0) + (row.get("amount") or 0)
    top_learners = sorted(
        (
            {
                "user_id": uid,
                "username": profiles_by_id.get(uid, {}).get("username"),
                "xp_gained": xp,
            }
            for uid, xp in xp_by_user.items()
        ),
        key=lambda x: -x["xp_gained"],
    )[:5]

    # ── Aktif üye sayısı (dönem içinde en az bir çalışma/pratik kaydı olan) ──
    active_ids = {s["user_id"] for s in sess_current} | {t["user_id"] for t in topic_current}
    game_rows = (
        supabase_admin.table("game_sessions")
        .select("user_id, started_at")
        .in_("user_id", member_ids)
        .gte("started_at", current_start.isoformat())
        .execute()
    ).data or []
    active_ids |= {g["user_id"] for g in game_rows}

    # ── Bu dönem kazanılan rozet sayısı (kurum genelinde) ──
    badge_rows = (
        supabase_admin.table("user_badges")
        .select("user_id, earned_at")
        .in_("user_id", member_ids)
        .gte("earned_at", current_start.isoformat())
        .execute()
    ).data or []

    return {
        "org": {"id": org.get("id", org_id), "name": org.get("name"), "plan": org.get("plan")},
        "period": period,
        "member_count": len(member_ids),
        "active_member_count": len(active_ids),
        "study": {
            "minutes_current": minutes_current,
            "minutes_previous": minutes_previous,
            "minutes_change_pct": _pct_change(minutes_current, minutes_previous),
            "sessions_current": len(sess_current),
            "sessions_previous": len(sess_previous),
            "sessions_change_pct": _pct_change(len(sess_current), len(sess_previous)),
        },
        "accuracy": {"current": accuracy_current, "previous": accuracy_previous},
        "vocabulary": {
            "new_words_current": new_words_current,
            "new_words_previous": new_words_previous,
            "new_words_change_pct": _pct_change(new_words_current, new_words_previous),
        },
        "top_learners": top_learners,
        "weak_topics": weak_topics,
        "badges_earned_current": len(badge_rows),
        "consent_summary": {"consented_count": len(consented_ids), "total_count": len(member_ids)},
    }
