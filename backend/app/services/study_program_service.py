"""
backend/app/services/study_program_service.py

Adaptif Ogrenme Motoru -- Madde 2 (24 Eylul 2026): haftalik, ROLLING genel
calisma programi (gramer + kelime birlesik).

NE URETIR (kullanici + ogrenilen dil + hafta basina bir kez, Pazartesi
Turkiye saatiyle yeni hafta):
  1. 3-5 odak gramer konusu (topic_tag):
     - once ZAYIF konular: son WEAK_LOOKBACK_DAYS gunde sinav/seviye tespit
       (exam_attempts) + konu pratigi (topic_practice_attempts) cevaplarinda
       en az bir yanlis yapilmis ve dogrulugu STRONG_ACCURACY altinda kalan
       konular; en cok yanlis yapilan once, esitlikte grammar_topics.
       sort_order'a gore.
     - yeterli zayif konu yoksa (yeni kullanici / az veri) "siradaki"
       konular: kullanicinin CEFR seviyesine en yakin, henuz ustalasmadigi
       konular (Ingilizce icin grammar_topics.level + sort_order, diger
       diller icin seviye tespit sorularinin topic_tag'leri -- bu dillerde
       gramer rehberi henuz yok).
     Sadece en az MIN_QUESTIONS_PER_TOPIC onayli sorusu olan konular secilir
     (pratik ekrani bos kalmasin).
  2. Gunluk yeni kelime hedefi (10-15, user_learning_languages.daily_goal'a
     gore) + vadesi gelen SM-2 tekrar sayisi (kelime oyunu Madde 1 geregi
     tekrarlari zaten %70 oncelikle getiriyor).
  3. Hafta sonu kisa quiz: odak konulardan karisik WEEKEND_QUIZ_SIZE soru,
     cevaplar topic_practice_attempts'e yazilir.

"ROLLING": program o haftanin ILK ziyaretinde uretilip study_programs'a
yazilir ve hafta boyunca sabit kalir (kullanici hedefin ortada degismesini
yasamasin); ilerleme her istekte canli hesaplanir. Ertesi hafta guncel
performansla bastan uretilir -- ustalasilan konular dogal olarak duser.
"""

from __future__ import annotations

import random
from datetime import UTC, date, datetime, time, timedelta, timezone
from typing import Any

from app.core.database import supabase_admin

CEFR_LEVEL_ORDER = ["a1", "a2", "b1", "b2", "c1", "c2"]
TR_TZ = timezone(timedelta(hours=3))  # Turkiye'de yaz saati uygulamasi yok

WEAK_LOOKBACK_DAYS = 28
STRONG_ACCURACY = 0.80
MASTERED_MIN_ATTEMPTS = 5
MAX_FOCUS_TOPICS = 5
MIN_FOCUS_TOPICS = 3
MIN_QUESTIONS_PER_TOPIC = 3
TOPIC_TARGET_ATTEMPTS = 5
TOPIC_DONE_ACCURACY = 0.60
WEEKEND_QUIZ_SIZE = 10
QUIZ_QUESTIONS_PER_TOPIC = 3
DEFAULT_LEVEL = "a2"


# ── zaman yardimcilari ──────────────────────────────────────────────────
def _now() -> datetime:
    return datetime.now(UTC)


def week_start_tr(now: datetime | None = None) -> date:
    local = (now or _now()).astimezone(TR_TZ)
    return (local - timedelta(days=local.weekday())).date()


def _tr_midnight_utc_iso(day: date) -> str:
    return datetime.combine(day, time(0), TR_TZ).astimezone(UTC).isoformat()


def humanize_tag(tag: str) -> str:
    return tag.replace("-", " ").replace("_", " ").strip().capitalize()


def _level_idx(level: str | None) -> int:
    return CEFR_LEVEL_ORDER.index(level) if level in CEFR_LEVEL_ORDER else CEFR_LEVEL_ORDER.index(DEFAULT_LEVEL)


# ── veri okuma ──────────────────────────────────────────────────────────
def _user_level(user_id: str, learning_lang: str) -> tuple[str | None, int]:
    rows = (
        supabase_admin.table("user_learning_languages")
        .select("current_level, placement_level, daily_goal")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
        .data
    ) or []
    if not rows:
        return None, 5
    row = rows[0]
    return row.get("current_level") or row.get("placement_level"), row.get("daily_goal") or 5


def _question_catalog(learning_lang: str) -> dict[str, dict[str, Any]]:
    """topic_tag -> {count, levels:set} (sadece onayli/aktif sorular)."""
    rows = (
        supabase_admin.table("exam_questions")
        .select("topic_tag, difficulty_level")
        .eq("learning_lang", learning_lang)
        .eq("is_active", True)
        .eq("status", "approved")
        .limit(5000)
        .execute()
        .data
    ) or []
    catalog: dict[str, dict[str, Any]] = {}
    for r in rows:
        tag = r.get("topic_tag")
        if not tag:
            continue
        entry = catalog.setdefault(tag, {"count": 0, "levels": set()})
        entry["count"] += 1
        if r.get("difficulty_level") in CEFR_LEVEL_ORDER:
            entry["levels"].add(r["difficulty_level"])
    return catalog


def _grammar_topics(learning_lang: str) -> dict[str, dict[str, Any]]:
    rows = (
        supabase_admin.table("grammar_topics")
        .select("slug, title_tr, level, sort_order")
        .eq("learning_lang", learning_lang)
        .eq("status", "published")
        .execute()
        .data
    ) or []
    return {r["slug"]: r for r in rows}


def _topic_answers(user_id: str, learning_lang: str, since_iso: str) -> list[dict[str, Any]]:
    """Kullanicinin since_iso'dan beri bu dildeki TUM konu-etiketli cevaplari:
    exam_attempts (sinav + seviye tespit) + topic_practice_attempts.
    Her eleman: {topic_tag, is_correct, created_at, source}."""
    answers: list[dict[str, Any]] = []

    session_ids = [
        s["id"]
        for s in (
            supabase_admin.table("exam_sessions")
            .select("id")
            .eq("user_id", user_id)
            .eq("learning_lang", learning_lang)
            .gte("started_at", since_iso)
            .execute()
            .data
            or []
        )
    ]
    exam_attempts: list[dict[str, Any]] = []
    if session_ids:
        exam_attempts = (
            supabase_admin.table("exam_attempts")
            .select("question_id, is_correct, created_at")
            .in_("session_id", session_ids)
            .gte("created_at", since_iso)
            .execute()
            .data
        ) or []

    practice = (
        supabase_admin.table("topic_practice_attempts")
        .select("topic_tag, question_id, is_correct, created_at")
        .eq("user_id", user_id)
        .gte("created_at", since_iso)
        .execute()
        .data
    ) or []

    question_ids = list(
        {a["question_id"] for a in exam_attempts if a.get("question_id")}
        | {p["question_id"] for p in practice if p.get("question_id")}
    )
    q_by_id: dict[str, dict[str, Any]] = {}
    if question_ids:
        for q in (
            supabase_admin.table("exam_questions")
            .select("id, topic_tag, learning_lang")
            .in_("id", question_ids)
            .execute()
            .data
            or []
        ):
            q_by_id[q["id"]] = q

    for a in exam_attempts:
        q = q_by_id.get(a["question_id"])
        if not q or not q.get("topic_tag"):
            continue
        answers.append(
            {"topic_tag": q["topic_tag"], "is_correct": bool(a.get("is_correct")),
             "created_at": a.get("created_at"), "source": "exam"}
        )
    for p in practice:
        q = q_by_id.get(p.get("question_id") or "")
        # topic_practice_attempts dil tasimiyor -- soru uzerinden dogrulanir.
        if not q or q.get("learning_lang") != learning_lang:
            continue
        answers.append(
            {"topic_tag": p["topic_tag"], "is_correct": bool(p.get("is_correct")),
             "created_at": p.get("created_at"), "source": "practice"}
        )
    return answers


def _stats_by_tag(answers: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    stats: dict[str, dict[str, int]] = {}
    for a in answers:
        s = stats.setdefault(a["topic_tag"], {"total": 0, "correct": 0})
        s["total"] += 1
        if a["is_correct"]:
            s["correct"] += 1
    return stats


# ── program uretimi ─────────────────────────────────────────────────────
def build_focus_topics(
    level: str | None,
    stats: dict[str, dict[str, int]],
    catalog: dict[str, dict[str, Any]],
    grammar: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Saf fonksiyon (DB'siz) -- test edilebilir. Odak konu listesini dondurur."""
    practicable = {t for t, c in catalog.items() if c["count"] >= MIN_QUESTIONS_PER_TOPIC}

    def sort_order(tag: str) -> int:
        g = grammar.get(tag)
        return g.get("sort_order") or 10_000 if g else 10_000

    def make(tag: str, reason: str) -> dict[str, Any]:
        g = grammar.get(tag)
        s = stats.get(tag, {"total": 0, "correct": 0})
        return {
            "topic_tag": tag,
            "reason": reason,
            "title": (g.get("title_tr") if g else None) or humanize_tag(tag),
            "grammar_slug": g["slug"] if g else None,
            "wrong_count": s["total"] - s["correct"],
            "total_count": s["total"],
        }

    weak = []
    for tag, s in stats.items():
        if tag not in practicable or s["total"] == 0:
            continue
        wrong = s["total"] - s["correct"]
        acc = s["correct"] / s["total"]
        if wrong > 0 and acc < STRONG_ACCURACY:
            weak.append((tag, wrong, acc))
    weak.sort(key=lambda w: (-w[1], w[2], sort_order(w[0]), w[0]))
    chosen = [make(tag, "weak") for tag, _, _ in weak[:MAX_FOCUS_TOPICS]]

    if len(chosen) < MIN_FOCUS_TOPICS:
        taken = {c["topic_tag"] for c in chosen}
        user_idx = _level_idx(level)

        def mastered(tag: str) -> bool:
            s = stats.get(tag)
            return bool(
                s and s["total"] >= MASTERED_MIN_ATTEMPTS
                and s["correct"] / s["total"] >= STRONG_ACCURACY
            )

        candidates: list[tuple[int, int, str]] = []
        grammar_backed = [t for t in grammar if t in practicable]
        if grammar_backed:
            for tag in grammar_backed:
                g = grammar[tag]
                dist = abs(_level_idx(g.get("level")) - user_idx)
                candidates.append((dist, sort_order(tag), tag))
        else:
            for tag in practicable:
                levels = catalog[tag]["levels"] or {DEFAULT_LEVEL}
                dist = min(abs(_level_idx(lv) - user_idx) for lv in levels)
                candidates.append((dist, 10_000, tag))
        candidates.sort()
        for _, _, tag in candidates:
            if len(chosen) >= MIN_FOCUS_TOPICS:
                break
            if tag in taken or mastered(tag):
                continue
            chosen.append(make(tag, "next"))
            taken.add(tag)
    return chosen


def daily_new_word_goal(daily_goal: int) -> int:
    return max(10, min(15, daily_goal))


def _generate(user_id: str, learning_lang: str, week_start: date) -> dict[str, Any]:
    level, daily_goal = _user_level(user_id, learning_lang)
    since_iso = (_now() - timedelta(days=WEAK_LOOKBACK_DAYS)).isoformat()
    stats = _stats_by_tag(_topic_answers(user_id, learning_lang, since_iso))
    focus = build_focus_topics(
        level, stats, _question_catalog(learning_lang), _grammar_topics(learning_lang)
    )
    row = {
        "user_id": user_id,
        "learning_lang": learning_lang,
        "week_start": week_start.isoformat(),
        "level": level,
        "focus_topics": focus,
        "daily_new_word_goal": daily_new_word_goal(daily_goal),
    }
    try:
        supabase_admin.table("study_programs").insert(row).execute()
    except Exception as e:  # es zamanli iki istek -- UNIQUE ihlali, digeri yazdi
        print(f"STUDY_PROGRAM_INSERT_RACE: {e}")
    existing = _load(user_id, learning_lang, week_start)
    return existing or row


def _load(user_id: str, learning_lang: str, week_start: date) -> dict[str, Any] | None:
    rows = (
        supabase_admin.table("study_programs")
        .select("*")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .eq("week_start", week_start.isoformat())
        .execute()
        .data
    ) or []
    return rows[0] if rows else None


def get_or_create_program(user_id: str, learning_lang: str) -> dict[str, Any]:
    ws = week_start_tr()
    return _load(user_id, learning_lang, ws) or _generate(user_id, learning_lang, ws)


# ── canli ilerleme ──────────────────────────────────────────────────────
def _count(table: str, filters: list[tuple[str, str, Any]]) -> int:
    q = supabase_admin.table(table).select("id", count="exact")
    for op, col, val in filters:
        q = getattr(q, op)(col, val)
    return q.limit(1).execute().count or 0


def build_progress(user_id: str, learning_lang: str, program: dict[str, Any]) -> dict[str, Any]:
    now = _now()
    ws = date.fromisoformat(str(program["week_start"])[:10])
    week_since = _tr_midnight_utc_iso(ws)
    # Ilerleme programin OLUSTURULDUGU andan itibaren sayilir: programi
    # ureten (konuyu "zayif" yapan) ayni haftanin eski cevaplari hedefe
    # sayilmasin.
    created = program.get("created_at")
    if created and str(created) > week_since:
        week_since = str(created)
    this_week = _topic_answers(user_id, learning_lang, week_since)
    week_stats = _stats_by_tag(this_week)

    topics = []
    completed = 0
    for t in program.get("focus_topics") or []:
        s = week_stats.get(t["topic_tag"], {"total": 0, "correct": 0})
        done = (
            s["total"] >= TOPIC_TARGET_ATTEMPTS
            and s["correct"] / s["total"] >= TOPIC_DONE_ACCURACY
        )
        completed += 1 if done else 0
        topics.append(
            {**t, "practiced_count": s["total"], "practiced_correct": s["correct"],
             "target_count": TOPIC_TARGET_ATTEMPTS, "done": done}
        )

    today_local = now.astimezone(TR_TZ).date()
    today_since = _tr_midnight_utc_iso(today_local)
    new_words_today = _count(
        "words",
        [("eq", "user_id", user_id), ("eq", "source_lang", learning_lang),
         ("gte", "created_at", today_since)],
    )
    reviews_due = _count(
        "words",
        [("eq", "user_id", user_id), ("eq", "source_lang", learning_lang),
         ("neq", "status", "archived"), ("lte", "next_review_at", now.isoformat())],
    )

    weekend_available = now.astimezone(TR_TZ).weekday() >= 5
    saturday_since = _tr_midnight_utc_iso(ws + timedelta(days=5))
    focus_tags = {t["topic_tag"] for t in program.get("focus_topics") or []}
    quiz_answered = sum(
        1 for a in this_week
        if a["source"] == "practice" and a["topic_tag"] in focus_tags
        and (a.get("created_at") or "") >= saturday_since
    )

    return {
        "focus_topics": topics,
        "completed_topics": completed,
        "today": {
            "new_words_today": new_words_today,
            "new_word_goal": program.get("daily_new_word_goal") or 10,
            "reviews_due": reviews_due,
        },
        "weekend_quiz": {
            "available": weekend_available,
            "answered_count": min(quiz_answered, WEEKEND_QUIZ_SIZE),
            "target_count": WEEKEND_QUIZ_SIZE,
            "done": quiz_answered >= WEEKEND_QUIZ_SIZE,
        },
    }


def weekly_quiz_questions(learning_lang: str, focus_tags: list[str]) -> list[dict[str, Any]]:
    if not focus_tags:
        return []
    rows = (
        supabase_admin.table("exam_questions")
        .select("id, exam_type, question_text, options, correct_option, explanation, topic_tag")
        .eq("learning_lang", learning_lang)
        .eq("is_active", True)
        .eq("status", "approved")
        .in_("topic_tag", focus_tags)
        .limit(500)
        .execute()
        .data
    ) or []
    by_tag: dict[str, list[dict[str, Any]]] = {}
    for r in rows:
        by_tag.setdefault(r["topic_tag"], []).append(r)
    picked: list[dict[str, Any]] = []
    for tag in focus_tags:
        pool = by_tag.get(tag, [])
        random.shuffle(pool)
        picked.extend(pool[:QUIZ_QUESTIONS_PER_TOPIC])
    random.shuffle(picked)
    return picked[:WEEKEND_QUIZ_SIZE]
