"""
backend/app/services/social_content.py

Madde 3b (revize) — Sosyal medya günlük içerik üretimi. Hatırlatma DEĞİL,
sadece otomatik içerik paylaşımı: "günün kelimesi" (görsel kart) ve "quiz
sorusu" (Telegram native quiz poll'u).

Kapsam bilinçli olarak dar tutuldu: sadece general_word_pool'daki
en(source_lang)->tr(target_lang) çifti kullanılıyor — bu proje genelinde
tek dolu havuz bu (bkz. Faz 2 notları).
"""

from __future__ import annotations

import io
import random
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

from app.core.database import supabase_admin

SOURCE_LANG = "en"
TARGET_LANG = "tr"

# Aynı kelimenin çok sık tekrar paylaşılmasını önlemek için — bu kadar gün
# içinde paylaşılmış bir kelime tekrar seçilmez (havuz yeterince büyükse).
RECENT_AVOID_DAYS = 45

CARD_SIZE = (1080, 1080)
BRAND_BLUE = (55, 138, 221)      # #378ADD
BRAND_PURPLE = (83, 74, 183)     # #534AB7
WHITE = (255, 255, 255)

_FONT_CANDIDATES_BOLD = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]
_FONT_CANDIDATES_REGULAR = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
]


def _load_font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    # Sunucuda hiçbir TTF bulunamazsa (beklenmedik durum) — hiç patlamak
    # yerine PIL'in gömülü bitmap fontuna düş (küçük ve sabit boyutlu ama
    # script'i çökertmez).
    return ImageFont.load_default()


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for w in words:
        trial = f"{current} {w}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines


def generate_word_card(word: str, meaning: str, example: Optional[str]) -> bytes:
    """'Günün kelimesi' için 1080x1080 PNG kart üretir (Telegram sendPhoto ile
    uyumlu). Bellekte üretir, diske yazmaz — çağıran taraf bytes'ı kullanır."""
    img = Image.new("RGB", CARD_SIZE, BRAND_PURPLE)
    draw = ImageDraw.Draw(img)

    # Üstten alta hafif gradyan (mor -> mavi) — basit, bağımlılıksız bir efekt.
    h = CARD_SIZE[1]
    for y in range(h):
        t = y / h
        r = int(BRAND_PURPLE[0] + (BRAND_BLUE[0] - BRAND_PURPLE[0]) * t)
        g = int(BRAND_PURPLE[1] + (BRAND_BLUE[1] - BRAND_PURPLE[1]) * t)
        b = int(BRAND_PURPLE[2] + (BRAND_BLUE[2] - BRAND_PURPLE[2]) * t)
        draw.line([(0, y), (CARD_SIZE[0], y)], fill=(r, g, b))

    logo_font = _load_font(_FONT_CANDIDATES_BOLD, 48)
    tag_font = _load_font(_FONT_CANDIDATES_REGULAR, 32)
    word_font = _load_font(_FONT_CANDIDATES_BOLD, 96)
    meaning_font = _load_font(_FONT_CANDIDATES_REGULAR, 52)
    example_font = _load_font(_FONT_CANDIDATES_REGULAR, 34)

    draw.text((60, 60), "Lexis", font=logo_font, fill=WHITE)
    draw.text((60, 130), "GÜNÜN KELİMESİ", font=tag_font, fill=(230, 230, 250))

    # Kelime — ortalanmış, büyük.
    word_lines = _wrap_text(draw, word, word_font, CARD_SIZE[0] - 120)
    y = 400
    for line in word_lines:
        w = draw.textlength(line, font=word_font)
        draw.text(((CARD_SIZE[0] - w) / 2, y), line, font=word_font, fill=WHITE)
        y += 110

    # Anlam.
    y += 20
    meaning_lines = _wrap_text(draw, meaning, meaning_font, CARD_SIZE[0] - 160)
    for line in meaning_lines:
        w = draw.textlength(line, font=meaning_font)
        draw.text(((CARD_SIZE[0] - w) / 2, y), line, font=meaning_font, fill=WHITE)
        y += 66

    # Örnek cümle (varsa) — alt kısımda, tırnak içinde.
    if example:
        y = max(y + 40, 820)
        example_lines = _wrap_text(draw, f'"{example}"', example_font, CARD_SIZE[0] - 200)
        for line in example_lines[:3]:
            w = draw.textlength(line, font=example_font)
            draw.text(((CARD_SIZE[0] - w) / 2, y), line, font=example_font, fill=(225, 225, 250))
            y += 46

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _recently_posted_word_ids(days: int) -> set[str]:
    from datetime import date, timedelta

    cutoff = (date.today() - timedelta(days=days)).isoformat()
    rows = (
        supabase_admin.table("social_posts")
        .select("general_word_id")
        .gte("post_date", cutoff)
        .execute()
        .data
        or []
    )
    return {r["general_word_id"] for r in rows if r.get("general_word_id")}


def pick_word() -> Optional[dict]:
    """Daha önce yakın zamanda paylaşılmamış rastgele bir kelime seçer."""
    avoid_ids = _recently_posted_word_ids(RECENT_AVOID_DAYS)
    query = (
        supabase_admin.table("general_word_pool")
        .select("id, word, meaning, example")
        .eq("source_lang", SOURCE_LANG)
        .eq("target_lang", TARGET_LANG)
        .eq("is_active", True)
        .limit(500)
    )
    candidates = query.execute().data or []
    fresh = [c for c in candidates if c["id"] not in avoid_ids]
    pool = fresh or candidates  # havuz küçükse (45 günden az kelime varsa) tekrara düş
    if not pool:
        return None
    return random.choice(pool)


def pick_quiz() -> Optional[dict]:
    """'Kelime -> anlam' çoktan seçmeli quiz sorusu üretir (4 seçenek)."""
    chosen = pick_word()
    if not chosen:
        return None

    distractor_rows = (
        supabase_admin.table("general_word_pool")
        .select("id, meaning")
        .eq("source_lang", SOURCE_LANG)
        .eq("target_lang", TARGET_LANG)
        .neq("id", chosen["id"])
        .limit(50)
        .execute()
        .data
        or []
    )
    distractor_meanings = [d["meaning"] for d in distractor_rows if d["meaning"] != chosen["meaning"]]
    picks = random.sample(distractor_meanings, min(3, len(distractor_meanings)))
    options = [chosen["meaning"]] + picks
    random.shuffle(options)

    return {
        "general_word_id": chosen["id"],
        "question_text": chosen["word"],
        "options": options,
        "correct_answer": chosen["meaning"],
    }
