"""
backend/app/services/social_content.py

Madde 3b (revize) — Sosyal medya günlük içerik üretimi. Hatırlatma DEĞİL,
sadece otomatik içerik paylaşımı: "günün kelimesi" (görsel kart),
"quiz sorusu" (Telegram native quiz poll'u) ve "YDS/YÖKDİL sınav sorusu"
(Telegram native quiz poll'u + açıklama).

Kaynaklar:
  - "word"  -> daily_word_content (küçük, özenle hazırlanmış havuz: 2 örnek
    cümle + gramer notu + seviye etiketi içerir — görsel kart + zengin caption).
  - "quiz"  -> general_word_pool üzerinden üretilen 4 seçenekli çoktan seçmeli
    (değişmedi).
  - "exam_question" -> exam_questions (onaylanmış YDS/YÖKDİL soruları).

Not: daily_word_content.last_sent_at, send_daily_word_email.py'nin kendi
rotasyonuna ait — bu dosya ona hiç dokunmaz, kendi bağımsız tekrar-önleme
takibini social_posts.content_ref_id üzerinden yapar.
"""

from __future__ import annotations

import io
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from app.core.database import supabase_admin

SOURCE_LANG = "en"
TARGET_LANG = "tr"

# "Günün kelimesi" (daily_word_content) için ayrı dil sabitleri — bu tablodaki
# kolon adları general_word_pool'dan farklı (target_lang = kelimenin dili,
# native_lang = anlamın dili) ama değerler aynı: en / tr.
DAILY_WORD_TARGET_LANG = "en"
DAILY_WORD_NATIVE_LANG = "tr"

# Aynı içeriğin çok sık tekrar paylaşılmasını önlemek için — bu kadar gün
# içinde paylaşılmış bir içerik tekrar seçilmez (havuz yeterince büyükse).
RECENT_AVOID_DAYS = 45
DAILY_WORD_AVOID_DAYS = 21
EXAM_QUESTION_AVOID_DAYS = 60
EXAM_TYPES = ["yds", "yokdil"]

CARD_SIZE = (1080, 1350)
BRAND_BLUE = (55, 138, 221)      # #378ADD
BRAND_PURPLE = (83, 74, 183)     # #534AB7
WHITE = (255, 255, 255)
BADGE_BG = (255, 255, 255, 40)   # kullanılmıyor (RGB canvas) — referans için

# Font dosyaları uygulamayla birlikte deploy ediliyor (app/assets/fonts/...).
# Eski kod, sunucuda hiç var olmayan sistem font yollarına (/usr/share/fonts/...)
# bakıyordu ve PIL'in görünmez/çok küçük varsayılan bitmap fontuna sessizce
# düşüyordu — Telegram'daki "okunaksız kart" hatasının kök nedeni buydu.
# Artık önce uygulamanın kendi font dosyasına bakıyoruz (pathlib ile, hem
# Windows geliştirme makinesinde hem Railway'in Linux konteynerinde çalışır),
# sistem yolları sadece ekstra (muhtemelen kullanılmayacak) yedek olarak kalıyor.
_ASSETS_FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"

_FONT_CANDIDATES_BOLD = [
    str(_ASSETS_FONTS_DIR / "DejaVuSans-Bold.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]
_FONT_CANDIDATES_REGULAR = [
    str(_ASSETS_FONTS_DIR / "DejaVuSans.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
]


def _load_font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    # Hiçbir TTF bulunamazsa (beklenmedik durum) — hiç patlamak yerine PIL'in
    # gömülü bitmap fontuna düş (küçük ve sabit boyutlu ama script'i çökertmez).
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


def _draw_centered_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    font: ImageFont.FreeTypeFont,
    y: int,
    line_height: int,
    fill,
    canvas_width: int = CARD_SIZE[0],
) -> int:
    for line in lines:
        w = draw.textlength(line, font=font)
        draw.text(((canvas_width - w) / 2, y), line, font=font, fill=fill)
        y += line_height
    return y


def generate_word_card(word: str, meaning_native: str, example: str | None, level: str | None = None) -> bytes:
    """'Günün kelimesi' için PNG kart üretir (Telegram sendPhoto ile uyumlu).
    Bellekte üretir, diske yazmaz — çağıran taraf bytes'ı kullanır.

    İkinci örnek cümle ve gramer notu görsele değil, Telegram/Slack caption
    metnine ekleniyor (bkz. social_publisher.py) — kart okunaklı kalsın diye
    görsele sadece kelime + anlam + tek örnek konuyor."""
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
    badge_font = _load_font(_FONT_CANDIDATES_REGULAR, 26)
    word_font = _load_font(_FONT_CANDIDATES_BOLD, 100)
    meaning_font = _load_font(_FONT_CANDIDATES_REGULAR, 50)
    example_font = _load_font(_FONT_CANDIDATES_REGULAR, 36)

    draw.text((60, 60), "Lexis", font=logo_font, fill=WHITE)
    draw.text((60, 130), "GÜNÜN KELİMESİ", font=tag_font, fill=(230, 230, 250))

    # Seviye rozeti (varsa) — sağ üstte, yuvarlak köşeli bir kutu içinde.
    if level:
        badge_text = level.strip()
        badge_w = draw.textlength(badge_text, font=badge_font) + 48
        badge_h = 56
        badge_x1 = CARD_SIZE[0] - 60
        badge_x0 = badge_x1 - badge_w
        badge_y0 = 66
        badge_y1 = badge_y0 + badge_h
        draw.rounded_rectangle(
            [badge_x0, badge_y0, badge_x1, badge_y1],
            radius=28,
            fill=(255, 255, 255, 255),
            outline=None,
        )
        tw = draw.textlength(badge_text, font=badge_font)
        draw.text((badge_x0 + (badge_w - tw) / 2, badge_y0 + 14), badge_text, font=badge_font, fill=BRAND_PURPLE)

    # Kelime — ortalanmış, büyük.
    y = 420
    word_lines = _wrap_text(draw, word, word_font, CARD_SIZE[0] - 120)
    y = _draw_centered_lines(draw, word_lines, word_font, y, 118, WHITE)

    # Anlam.
    y += 30
    meaning_lines = _wrap_text(draw, meaning_native, meaning_font, CARD_SIZE[0] - 160)
    y = _draw_centered_lines(draw, meaning_lines, meaning_font, y, 64, WHITE)

    # Örnek cümle (varsa) — tırnak içinde, en fazla 3 satır.
    if example:
        y += 40
        example_lines = _wrap_text(draw, f'"{example}"', example_font, CARD_SIZE[0] - 200)[:3]
        y = _draw_centered_lines(draw, example_lines, example_font, y, 50, (225, 225, 250))

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


def pick_word() -> dict | None:
    """Quiz için: daha önce yakın zamanda paylaşılmamış rastgele bir kelime
    seçer (general_word_pool). "Günün kelimesi" kartı için pick_daily_word()
    kullanılıyor — bu fonksiyon sadece pick_quiz() tarafından kullanılıyor."""
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


def pick_quiz() -> dict | None:
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


def _recently_posted_content_ref_ids(content_type: str, days: int) -> set[str]:
    from datetime import date, timedelta

    cutoff = (date.today() - timedelta(days=days)).isoformat()
    rows = (
        supabase_admin.table("social_posts")
        .select("content_ref_id")
        .eq("content_type", content_type)
        .gte("post_date", cutoff)
        .execute()
        .data
        or []
    )
    return {r["content_ref_id"] for r in rows if r.get("content_ref_id")}


def pick_daily_word() -> dict | None:
    """'Günün kelimesi' için daily_word_content'ten zengin bir kayıt seçer
    (2 örnek cümle + gramer notu + seviye etiketi). Kendi bağımsız tekrar
    önleme takibini social_posts.content_ref_id üzerinden yapar — bu tablonun
    kendi last_sent_at kolonuna (send_daily_word_email.py'nin rotasyonuna ait)
    hiç dokunmaz."""
    avoid_ids = _recently_posted_content_ref_ids("word", DAILY_WORD_AVOID_DAYS)
    rows = (
        supabase_admin.table("daily_word_content")
        .select(
            "id, word, meaning_target, meaning_native, example_1_target, example_1_native, "
            "example_2_target, example_2_native, grammar_note_native, level"
        )
        .eq("target_lang", DAILY_WORD_TARGET_LANG)
        .eq("native_lang", DAILY_WORD_NATIVE_LANG)
        .eq("is_active", True)
        .limit(200)
        .execute()
        .data
        or []
    )
    fresh = [r for r in rows if r["id"] not in avoid_ids]
    pool = fresh or rows  # havuz küçükse (avoid günü çok uzunsa) tekrara düş
    if not pool:
        return None
    return random.choice(pool)


def pick_exam_question() -> dict | None:
    """Onaylanmış bir YDS/YÖKDİL sınav sorusu seçer (exam_questions), doğru
    seçeneğin metnini options listesinden çözer. Kendi bağımsız tekrar önleme
    takibini social_posts.content_ref_id üzerinden yapar."""
    avoid_ids = _recently_posted_content_ref_ids("exam_question", EXAM_QUESTION_AVOID_DAYS)
    rows = (
        supabase_admin.table("exam_questions")
        .select("id, exam_type, question_text, options, correct_option, explanation, topic_tag")
        .in_("exam_type", EXAM_TYPES)
        .eq("status", "approved")
        .eq("is_active", True)
        .limit(500)
        .execute()
        .data
        or []
    )
    fresh = [r for r in rows if r["id"] not in avoid_ids]
    pool = fresh or rows
    random.shuffle(pool)

    for chosen in pool:
        options = chosen.get("options") or []
        correct_text = next(
            (o.get("text") for o in options if o.get("id") == chosen.get("correct_option")),
            None,
        )
        if not correct_text:
            continue  # veri bütünlüğü sorunu olan bir satır — bir sonrakini dene
        return {
            "id": chosen["id"],
            "exam_type": chosen["exam_type"],
            "question_text": chosen["question_text"],
            "options": [o.get("text") for o in options],
            "correct_answer": correct_text,
            "explanation": chosen.get("explanation"),
            "topic_tag": chosen.get("topic_tag"),
        }
    return None
