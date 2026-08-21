"""
backend/app/services/social_publisher.py

Madde 3b (revize) — Telegram bot + Slack incoming webhook'a gerçek paylaşım.
OTP/hatırlatma e-postalarıyla aynı desen: SOCIAL_POST_MODE=fixed (varsayılan)
iken hiçbir yere gerçekten paylaşım yapılmaz, sadece log'a yazılır — böylece
gerçek Telegram/Slack kimlik bilgileri olmadan da script güvenle test edilebilir.
SOCIAL_POST_MODE=real olduğunda TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL_ID ve/veya
SLACK_WEBHOOK_URL doluysa o kanala gerçekten gönderilir (biri boşsa sadece o
kanal atlanır, diğeri yine de dener).
"""

from __future__ import annotations

from typing import Optional

import httpx

from app.core.config import settings
from app.services.notification_log import log_notification

TELEGRAM_API_BASE = "https://api.telegram.org"


def _dry_run() -> bool:
    return settings.SOCIAL_POST_MODE != "real"


# ── Telegram ─────────────────────────────────────────────────────

def post_word_to_telegram(word: str, meaning: str, example: Optional[str], image_bytes: bytes) -> bool:
    caption = f"📖 Günün Kelimesi\n\n{word} — {meaning}"
    if example:
        caption += f"\n\n\"{example}\""

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
            data={"chat_id": settings.TELEGRAM_CHANNEL_ID, "caption": caption},
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


# ── Slack ────────────────────────────────────────────────────────
# Basit bir "Incoming Webhook" kullanıldığı için (kullanıcının seçtiği en
# kolay entegrasyon yolu) dosya/görsel yüklemesi yok — sadece metin/Block Kit.

def post_word_to_slack(word: str, meaning: str, example: Optional[str]) -> bool:
    text = f"📖 *Günün Kelimesi*\n\n*{word}* — {meaning}"
    if example:
        text += f"\n_\"{example}\"_"

    return _post_slack(text, category="social_word")


def post_quiz_to_slack(question_text: str, options: list[str], correct_answer: str) -> bool:
    options_text = "\n".join(
        f"{'✅' if o == correct_answer else '▫️'} {o}" for o in options
    )
    text = f"❓ *Quiz — \"{question_text}\" kelimesinin anlamı nedir?*\n\n{options_text}"
    return _post_slack(text, category="social_quiz")


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
