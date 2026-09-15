"""
backend/app/services/social_publisher.py

Madde 3b (revize) — Telegram bot + Slack incoming webhook'a gerçek paylaşım.
OTP/hatırlatma e-postalarıyla aynı desen: SOCIAL_POST_MODE=fixed (varsayılan)
iken hiçbir yere gerçekten paylaşım yapılmaz, sadece log'a yazılır — böylece
gerçek Telegram/Slack kimlik bilgileri olmadan da script güvenle test edilebilir.
SOCIAL_POST_MODE=real olduğunda TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL_ID ve/veya
SLACK_WEBHOOK_URL doluysa o kanala gerçekten gönderilir (biri boşsa sadece o
kanal atlanır, diğeri yine de dener).

Üç içerik türü: "word" (günün kelimesi — görsel kart + zengin caption),
"quiz" (kelime->anlam çoktan seçmeli, Telegram native quiz poll), ve
"exam_question" (onaylanmış YDS/YÖKDİL sorusu, Telegram native quiz poll +
açıklama).
"""

from __future__ import annotations

import httpx

from app.core.config import settings
from app.services.notification_log import log_notification

TELEGRAM_API_BASE = "https://api.telegram.org"

# Telegram sendPhoto caption sınırı 1024 karakter — zengin caption (2 örnek +
# gramer notu) bazen bunu aşabiliyor, güvenli tarafta kalmak için kısaltıyoruz.
_TELEGRAM_CAPTION_LIMIT = 1024


def _dry_run() -> bool:
    return settings.SOCIAL_POST_MODE != "real"


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def _build_word_caption(
    word: str,
    meaning_native: str,
    example_1: str | None,
    example_2: str | None = None,
    grammar_note: str | None = None,
    level: str | None = None,
) -> str:
    caption = f"📖 Günün Kelimesi\n\n{word} — {meaning_native}"
    if level:
        caption += f"\n📌 Seviye: {level}"
    if example_1:
        caption += f"\n\n1️⃣ \"{example_1}\""
    if example_2:
        caption += f"\n2️⃣ \"{example_2}\""
    if grammar_note:
        caption += f"\n\n💡 {grammar_note}"
    return caption


# ── Telegram ─────────────────────────────────────────────────────

def post_word_to_telegram(
    word: str,
    meaning_native: str,
    example_1: str | None,
    image_bytes: bytes,
    example_2: str | None = None,
    grammar_note: str | None = None,
    level: str | None = None,
) -> bool:
    caption = _build_word_caption(word, meaning_native, example_1, example_2, grammar_note, level)

    if _dry_run():
        print(f"[SOCIAL-DEV][Telegram/word] {caption}")
        log_notification("telegram", "social_word", settings.TELEGRAM_CHANNEL_ID or "(dev)", "skipped", {"reason": "SOCIAL_POST_MODE=fixed"})
        return True

    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHANNEL_ID:
        print("[SOCIAL] Telegram ayarlanmamış (TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL_ID boş), atlandı.")
        log_notification("telegram", "social_word", None, "skipped", {"reason": "not configured"})
        return False

    url = f"{TELEGRAM_API_BASE}/bot{settings.TELEGRAM_BOT_TOKEN}/sendPhoto"
    try:
        resp = httpx.post(
            url,
            data={"chat_id": settings.TELEGRAM_CHANNEL_ID, "caption": _truncate(caption, _TELEGRAM_CAPTION_LIMIT)},
            files={"photo": ("word.png", image_bytes, "image/png")},
            timeout=20,
        )
        resp.raise_for_status()
        log_notification("telegram", "social_word", settings.TELEGRAM_CHANNEL_ID, "sent")
        return True
    except Exception as e:
        print(f"TELEGRAM WORD POST ERROR: {e}")
        log_notification("telegram", "social_word", settings.TELEGRAM_CHANNEL_ID, "failed", {"error": str(e)})
        return False


def post_quiz_to_telegram(question_text: str, options: list[str], correct_answer: str) -> bool:
    """Telegram'ın native 'quiz' tipi poll'unu kullanır — kullanıcılar
    doğrudan Telegram içinden tahmin edip anında doğru/yanlış görebiliyor,
    ayrı bir görsel ya da 'cevap yarın' mekanizmasına gerek yok."""
    correct_index = options.index(correct_answer) if correct_answer in options else 0
    question = f"\"{question_text}\" kelimesinin anlamı nedir?"

    if _dry_run():
        print(f"[SOCIAL-DEV][Telegram/quiz] {question} seçenekler={options} doğru={correct_answer}")
        log_notification("telegram", "social_quiz", settings.TELEGRAM_CHANNEL_ID or "(dev)", "skipped", {"reason": "SOCIAL_POST_MODE=fixed"})
        return True

    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHANNEL_ID:
        print("[SOCIAL] Telegram ayarlanmamış, quiz atlandı.")
        log_notification("telegram", "social_quiz", None, "skipped", {"reason": "not configured"})
        return False

    url = f"{TELEGRAM_API_BASE}/bot{settings.TELEGRAM_BOT_TOKEN}/sendPoll"
    try:
        resp = httpx.post(
            url,
            json={
                "chat_id": settings.TELEGRAM_CHANNEL_ID,
                "question": question[:300],
                "options": [o[:100] for o in options],
                "type": "quiz",
                "correct_option_id": correct_index,
                "is_anonymous": True,
            },
            timeout=20,
        )
        resp.raise_for_status()
        log_notification("telegram", "social_quiz", settings.TELEGRAM_CHANNEL_ID, "sent")
        return True
    except Exception as e:
        print(f"TELEGRAM QUIZ POST ERROR: {e}")
        log_notification("telegram", "social_quiz", settings.TELEGRAM_CHANNEL_ID, "failed", {"error": str(e)})
        return False


def post_exam_question_to_telegram(
    exam_type: str,
    question_text: str,
    options: list[str],
    correct_answer: str,
    explanation: str | None = None,
) -> bool:
    """YDS/YÖKDİL sorusunu Telegram'ın native 'quiz' poll'u ile paylaşır —
    doğru cevap işaretlenince Telegram'ın kendi 'explanation' alanında kısa
    bir açıklama gösterilir (0-200 karakter)."""
    correct_index = options.index(correct_answer) if correct_answer in options else 0
    label = "YDS Sorusu" if exam_type == "yds" else "YÖKDİL Sorusu"
    question = f"📝 {label}\n\n{question_text}"

    if _dry_run():
        print(f"[SOCIAL-DEV][Telegram/exam_question] {question} seçenekler={options} doğru={correct_answer}")
        log_notification("telegram", "social_exam_question", settings.TELEGRAM_CHANNEL_ID or "(dev)", "skipped", {"reason": "SOCIAL_POST_MODE=fixed"})
        return True

    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHANNEL_ID:
        print("[SOCIAL] Telegram ayarlanmamış, exam_question atlandı.")
        log_notification("telegram", "social_exam_question", None, "skipped", {"reason": "not configured"})
        return False

    url = f"{TELEGRAM_API_BASE}/bot{settings.TELEGRAM_BOT_TOKEN}/sendPoll"
    payload = {
        "chat_id": settings.TELEGRAM_CHANNEL_ID,
        "question": question[:300],
        "options": [o[:100] for o in options],
        "type": "quiz",
        "correct_option_id": correct_index,
        "is_anonymous": True,
    }
    if explanation:
        payload["explanation"] = explanation[:200]
    try:
        resp = httpx.post(url, json=payload, timeout=20)
        resp.raise_for_status()
        log_notification("telegram", "social_exam_question", settings.TELEGRAM_CHANNEL_ID, "sent")
        return True
    except Exception as e:
        print(f"TELEGRAM EXAM QUESTION POST ERROR: {e}")
        log_notification("telegram", "social_exam_question", settings.TELEGRAM_CHANNEL_ID, "failed", {"error": str(e)})
        return False


# ── Slack ────────────────────────────────────────────────────────
# Basit bir "Incoming Webhook" kullanıldığı için (kullanıcının seçtiği en
# kolay entegrasyon yolu) dosya/görsel yüklemesi yok — sadece metin/Block Kit.

def post_word_to_slack(
    word: str,
    meaning_native: str,
    example_1: str | None,
    example_2: str | None = None,
    grammar_note: str | None = None,
    level: str | None = None,
) -> bool:
    text = f"📖 *Günün Kelimesi*\n\n*{word}* — {meaning_native}"
    if level:
        text += f"\n📌 _Seviye: {level}_"
    if example_1:
        text += f"\n\n1️⃣ _\"{example_1}\"_"
    if example_2:
        text += f"\n2️⃣ _\"{example_2}\"_"
    if grammar_note:
        text += f"\n\n💡 {grammar_note}"

    return _post_slack(text, category="social_word")


def post_quiz_to_slack(question_text: str, options: list[str], correct_answer: str) -> bool:
    options_text = "\n".join(
        f"{'✅' if o == correct_answer else '▫️'} {o}" for o in options
    )
    text = f"❓ *Quiz — \"{question_text}\" kelimesinin anlamı nedir?*\n\n{options_text}"
    return _post_slack(text, category="social_quiz")


def post_exam_question_to_slack(
    exam_type: str,
    question_text: str,
    options: list[str],
    correct_answer: str,
    explanation: str | None = None,
) -> bool:
    label = "YDS Sorusu" if exam_type == "yds" else "YÖKDİL Sorusu"
    options_text = "\n".join(
        f"{'✅' if o == correct_answer else '▫️'} {o}" for o in options
    )
    text = f"📝 *{label}*\n\n{question_text}\n\n{options_text}"
    if explanation:
        text += f"\n\n💡 _{explanation}_"
    return _post_slack(text, category="social_exam_question")


def _post_slack(text: str, category: str = "social_word") -> bool:
    if _dry_run():
        print(f"[SOCIAL-DEV][Slack] {text}")
        log_notification("slack", category, "(dev)", "skipped", {"reason": "SOCIAL_POST_MODE=fixed"})
        return True

    if not settings.SLACK_WEBHOOK_URL:
        print("[SOCIAL] Slack ayarlanmamış (SLACK_WEBHOOK_URL boş), atlandı.")
        log_notification("slack", category, None, "skipped", {"reason": "not configured"})
        return False

    try:
        resp = httpx.post(settings.SLACK_WEBHOOK_URL, json={"text": text}, timeout=20)
        resp.raise_for_status()
        log_notification("slack", category, "webhook", "sent")
        return True
    except Exception as e:
        print(f"SLACK POST ERROR: {e}")
        log_notification("slack", category, "webhook", "failed", {"error": str(e)})
        return False
