"""
backend/app/services/content_flag_service.py

İstatistik & Raporlama V2 öncelik #3, Faz 3 madde C — "Veri doğruluğu/
güvenilirlik paneli" (bkz. migration 065_content_flags.sql).

Faz 1/2'nin content-accuracy view'ları (exam_question_stats,
system_word_stats, user_word_stats) sadece "doğruluk oranına göre sırala"
sağlıyor — düşük doğruluk hem "gerçekten zor içerik" hem de "muhtemelen
HATALI içerik" (yanlış cevap anahtarı, hatalı çeviri) anlamına gelebilir.

scan_content_flags(), bu view'ları tarayıp iki ayrı sinyalden anomali
tespit eder ve content_flags tablosuna (idempotent) yazar:

  - Sorular: option_counts'ta correct_option'tan DAHA ÇOK seçilen bir
    yanlış şık varsa → 'dominant_wrong_option' (cevap anahtarı hatalı
    olabilir — sadece zorluktan çok daha güçlü bir kanıt). Yoksa ama
    doğruluk eşiğin altındaysa → 'low_accuracy'.
  - Kelimeler (sistem havuzu + kullanıcı kelimeleri): option_counts verisi
    yok (game_attempts sadece is_correct tutuyor), tek sinyal çok düşük
    doğruluk + yeterli deneme sayısı → 'low_accuracy'.

Tarama admin panelde "Tara" butonu (POST /admin/content-accuracy/
flags/scan) ile MANUEL de tetiklenebilir, AMA 11 Eylül 2026'dan
itibaren (Faz 3 madde E — "zaman bazlı periyodik snapshot+cron")
artık GÜNLÜK bir Claude scheduled task tarafından da otomatik
çalıştırılıyor (bu fonksiyonun SQL karşılığıyla — bkz. devir notu).
Manuel buton, bir günü kaçırdıysa/hemen görmek isterse diye duruyor.

İdempotency: content_type+content_id başına tek satır (UNIQUE kısıtı).
Zaten 'open' durumdaki bir kayıt varsa metric_snapshot/detected_at
güncellenir. 'fixed' veya 'dismissed' durumdaki kayıtlara DOKUNULMAZ —
admin zaten karar vermiş, tarama onu geçersiz kılmaz. Sorun gerçekten
düzelirse (doğruluk normale dönerse) kayıt otomatik silinmez; admin
elle 'fixed' işaretler ya da dilerse görmezden gelir.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.core.database import supabase_admin

# Sorular: en az bu kadar deneme VE doğruluk bu eşiğin altında olmalı.
MIN_ATTEMPTS_QUESTION = 15
MAX_ACCURACY_QUESTION = 0.35

# Kelimeler: option_counts sinyali yok, bu yüzden daha katı bir eşik
# kullanılıyor (yanlış pozitifleri azaltmak için — bazı kelimeler
# "false friend" nedeniyle doğal olarak zor olabilir).
MIN_ATTEMPTS_WORD = 15
MAX_ACCURACY_WORD = 0.25

# Bir taramada tip başına en fazla bu kadar aday işlenir (view'lar zaten
# eşiklerle sınırlı olduğu için pratikte bu limite nadiren ulaşılır).
_SCAN_LIMIT_PER_TYPE = 200


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _dominant_wrong_option(option_counts: dict[str, Any] | None, correct_option: str | None) -> str | None:
    """option_counts içinde correct_option'tan daha çok seçilen bir yanlış
    şık varsa onun anahtarını döner, yoksa None."""
    if not option_counts or not correct_option:
        return None
    correct_count = option_counts.get(correct_option, 0) or 0
    best_wrong_key: str | None = None
    best_wrong_count = correct_count
    for key, count in option_counts.items():
        if key == correct_option:
            continue
        if (count or 0) > best_wrong_count:
            best_wrong_count = count or 0
            best_wrong_key = key
    return best_wrong_key


def _upsert_flag(content_type: str, content_id: str, reason: str, metric_snapshot: dict[str, Any]) -> str:
    """Var olan bir satır varsa: 'open' ise günceller, 'fixed'/'dismissed'
    ise dokunmaz. Yoksa yeni 'open' kayıt açar. Dönüş: 'created' | 'updated' | 'skipped'."""
    existing_rows = (
        supabase_admin.table("content_flags")
        .select("id, status")
        .eq("content_type", content_type)
        .eq("content_id", content_id)
        .limit(1)
        .execute()
        .data
    ) or []
    row = existing_rows[0] if existing_rows else None

    if row is None:
        supabase_admin.table("content_flags").insert({
            "content_type": content_type,
            "content_id": content_id,
            "reason": reason,
            "metric_snapshot": metric_snapshot,
            "status": "open",
            "detected_at": _now_iso(),
        }).execute()
        return "created"

    if row["status"] == "open":
        supabase_admin.table("content_flags").update({
            "reason": reason,
            "metric_snapshot": metric_snapshot,
            "detected_at": _now_iso(),
        }).eq("id", row["id"]).execute()
        return "updated"

    return "skipped"


async def scan_content_flags() -> dict[str, Any]:
    """Tüm içerik türlerini tarar, anomali tespit eder, content_flags'e
    yazar. Sonuç: tip bazında + toplam created/updated/skipped sayıları."""
    counts = {
        "exam_question": {"created": 0, "updated": 0, "skipped": 0},
        "system_word": {"created": 0, "updated": 0, "skipped": 0},
        "user_word": {"created": 0, "updated": 0, "skipped": 0},
    }

    # ── Sorular ─────────────────────────────────────────────
    q_rows = (
        supabase_admin.table("exam_question_stats")
        .select("question_id, total_attempts, accuracy_ratio, option_counts")
        .gte("total_attempts", MIN_ATTEMPTS_QUESTION)
        .lte("accuracy_ratio", MAX_ACCURACY_QUESTION)
        .order("accuracy_ratio", desc=False)
        .limit(_SCAN_LIMIT_PER_TYPE)
        .execute()
        .data
    ) or []

    question_ids = [r["question_id"] for r in q_rows]
    correct_option_by_id: dict[str, str | None] = {}
    if question_ids:
        qmeta = (
            supabase_admin.table("exam_questions")
            .select("id, correct_option")
            .in_("id", question_ids)
            .execute()
            .data
        ) or []
        correct_option_by_id = {q["id"]: q.get("correct_option") for q in qmeta}

    for r in q_rows:
        correct_option = correct_option_by_id.get(r["question_id"])
        dominant_wrong = _dominant_wrong_option(r.get("option_counts"), correct_option)
        reason = "dominant_wrong_option" if dominant_wrong else "low_accuracy"
        snapshot = {
            "total_attempts": r["total_attempts"],
            "accuracy_ratio": r["accuracy_ratio"],
            "option_counts": r.get("option_counts"),
            "correct_option": correct_option,
            "dominant_wrong_option": dominant_wrong,
        }
        outcome = _upsert_flag("exam_question", r["question_id"], reason, snapshot)
        counts["exam_question"][outcome] += 1

    # ── Kelimeler (sistem havuzu) ────────────────────────────
    sw_rows = (
        supabase_admin.table("system_word_stats")
        .select("general_word_id, total_attempts, accuracy_ratio")
        .gte("total_attempts", MIN_ATTEMPTS_WORD)
        .lte("accuracy_ratio", MAX_ACCURACY_WORD)
        .order("accuracy_ratio", desc=False)
        .limit(_SCAN_LIMIT_PER_TYPE)
        .execute()
        .data
    ) or []
    for r in sw_rows:
        snapshot = {"total_attempts": r["total_attempts"], "accuracy_ratio": r["accuracy_ratio"]}
        outcome = _upsert_flag("system_word", r["general_word_id"], "low_accuracy", snapshot)
        counts["system_word"][outcome] += 1

    # ── Kelimeler (kullanıcı) ─────────────────────────────────
    uw_rows = (
        supabase_admin.table("user_word_stats")
        .select("word_id, total_attempts, accuracy_ratio")
        .gte("total_attempts", MIN_ATTEMPTS_WORD)
        .lte("accuracy_ratio", MAX_ACCURACY_WORD)
        .order("accuracy_ratio", desc=False)
        .limit(_SCAN_LIMIT_PER_TYPE)
        .execute()
        .data
    ) or []
    for r in uw_rows:
        snapshot = {"total_attempts": r["total_attempts"], "accuracy_ratio": r["accuracy_ratio"]}
        outcome = _upsert_flag("user_word", r["word_id"], "low_accuracy", snapshot)
        counts["user_word"][outcome] += 1

    total = {
        "created": sum(c["created"] for c in counts.values()),
        "updated": sum(c["updated"] for c in counts.values()),
        "skipped": sum(c["skipped"] for c in counts.values()),
    }
    return {"by_type": counts, "total": total, "scanned_at": _now_iso()}


async def get_content_flags(
    status: str | None = None,
    content_type: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Flag listesini, ilgili içeriğin okunabilir metniyle (soru metni /
    kelime) zenginleştirip döner."""
    limit = max(1, min(limit, 200))
    query = supabase_admin.table("content_flags").select("*")
    if status:
        query = query.eq("status", status)
    if content_type:
        query = query.eq("content_type", content_type)
    rows = query.order("detected_at", desc=True).limit(limit).execute().data or []

    question_ids = [r["content_id"] for r in rows if r["content_type"] == "exam_question"]
    system_word_ids = [r["content_id"] for r in rows if r["content_type"] == "system_word"]
    user_word_ids = [r["content_id"] for r in rows if r["content_type"] == "user_word"]

    question_by_id: dict[str, dict] = {}
    if question_ids:
        qrows = (
            supabase_admin.table("exam_questions")
            .select("id, question_text, exam_type, topic_tag, correct_option")
            .in_("id", question_ids)
            .execute()
            .data
        ) or []
        question_by_id = {q["id"]: q for q in qrows}

    system_word_by_id: dict[str, dict] = {}
    if system_word_ids:
        swrows = (
            supabase_admin.table("general_word_pool")
            .select("id, word, source_lang, target_lang")
            .in_("id", system_word_ids)
            .execute()
            .data
        ) or []
        system_word_by_id = {w["id"]: w for w in swrows}

    user_word_by_id: dict[str, dict] = {}
    if user_word_ids:
        uwrows = (
            supabase_admin.table("words")
            .select("id, word, source_lang, target_lang, user_id")
            .in_("id", user_word_ids)
            .execute()
            .data
        ) or []
        user_word_by_id = {w["id"]: w for w in uwrows}

    items = []
    for r in rows:
        content: dict[str, Any] = {}
        if r["content_type"] == "exam_question":
            content = question_by_id.get(r["content_id"], {})
        elif r["content_type"] == "system_word":
            content = system_word_by_id.get(r["content_id"], {})
        elif r["content_type"] == "user_word":
            content = user_word_by_id.get(r["content_id"], {})
        items.append({**r, "content": content or None})
    return items


async def update_content_flag(
    flag_id: str,
    status: str,
    admin_note: str | None,
    reviewed_by: str,
) -> dict[str, Any]:
    if status not in ("open", "fixed", "dismissed"):
        raise ValueError("status 'open', 'fixed' veya 'dismissed' olmalı")

    updates: dict[str, Any] = {"status": status, "reviewed_by": reviewed_by, "reviewed_at": _now_iso()}
    if admin_note is not None:
        updates["admin_note"] = admin_note

    result = supabase_admin.table("content_flags").update(updates).eq("id", flag_id).execute()
    if not result.data:
        raise LookupError("Kayıt bulunamadı.")
    return result.data[0]
