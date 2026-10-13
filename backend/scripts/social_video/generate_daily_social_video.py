#!/usr/bin/env python3
"""
Lexis gunun kelimesi -- YouTube Shorts / TikTok Reels / WhatsApp Durumu
icin GUNLUK video ureticisi.

Kullanim:
    python3 generate_daily_social_video.py content.json output.mp4

content.json semasi:
{
  "word": "provided that",
  "level": "YDS / YOKDIL / TOEFL",          # opsiyonel, bos ise kutu gizlenir
  "meaning_en": "on condition that; only if",
  "meaning_tr": "sartiyla, yeter ki (kosul bildirir, 'if' gibi kullanilir)",
  "example_1_en": "You can borrow the book, provided that you return it by Friday.",
  "example_1_tr": "Cuma gunune kadar iade etmen sartiyla kitabi odunc alabilirsin.",
  "example_2_en": "...",                     # opsiyonel
  "example_2_tr": "...",                     # opsiyonel
  "grammar_note_tr": "...",                  # opsiyonel (yoksa sahne 5 atlanir)
  "exam_label": "YDS SORUSU",                # opsiyonel, soru varsa
  "question_text": "...",                    # opsiyonel (yoksa sahne 6 atlanir)
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],  # question_text varsa zorunlu
  "telegram_url": "t.me/lexis_words"
}

Sadece Pillow + ffmpeg kullanir (concat.txt uretir, ffmpeg assembly ayri adim).
Muzik bu script'in isi degil -- music_gen_v3.py ile ayrica uretilip ffmpeg
asamasinda mixlenir.
"""
from PIL import Image, ImageDraw, ImageFont
import textwrap
import os
import sys
import json

W, H = 1080, 1920

FONT_DIR = "/usr/share/fonts/truetype/noto"
def font(name, size):
    return ImageFont.truetype(f"{FONT_DIR}/{name}", size)

F_BLACK = lambda s: font("NotoSans-ExtraBold.ttf", s)
F_BOLD = lambda s: font("NotoSans-Bold.ttf", s)
F_SEMI = lambda s: font("NotoSans-SemiBold.ttf", s)
F_REG = lambda s: font("NotoSans-Regular.ttf", s)
F_ITALIC = lambda s: font("NotoSans-Italic.ttf", s)

BLUE = (2, 132, 199)
BLUE_DARK = (7, 89, 133)
INK = (15, 23, 42)
SLATE = (100, 116, 139)
WHITE = (255, 255, 255)
BG_LIGHT = (248, 250, 252)
BOX_BLUE = (240, 249, 255)
BOX_AMBER = (254, 249, 195)
AMBER_TEXT = (120, 53, 15)
BOX_INDIGO = (238, 242, 255)
INDIGO_TEXT = (49, 46, 129)

def rounded_rect(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)

def center_text(draw, cx, y, text, f, fill):
    bbox = draw.textbbox((0, 0), text, font=f)
    w = bbox[2] - bbox[0]
    draw.text((cx - w / 2, y), text, font=f, fill=fill)
    return w

def wrapped_center_text(draw, cx, y, text, f, fill, max_chars, line_h):
    lines = textwrap.wrap(text, width=max_chars)
    cy = y
    for line in lines:
        center_text(draw, cx, cy, line, f, fill)
        cy += line_h
    return cy

def lexis_wordmark(draw, cx, y, scale=1.0, on_dark=False):
    icon_size = int(64 * scale)
    pad = int(10 * scale)
    text_f = F_BLACK(int(52 * scale))
    bbox = draw.textbbox((0, 0), "Lexis", font=text_f)
    text_w = bbox[2] - bbox[0]
    total_w = icon_size + pad + text_w
    x0 = cx - total_w / 2
    icon_fill = WHITE if on_dark else BLUE
    icon_bg = BLUE if on_dark else BOX_BLUE
    rounded_rect(draw, (x0, y, x0 + icon_size, y + icon_size), int(16 * scale), icon_bg)
    draw.text((x0 + icon_size / 2, y + icon_size / 2), "L", font=F_BLACK(int(36 * scale)),
               fill=icon_fill, anchor="mm")
    text_fill = WHITE if on_dark else BLUE
    draw.text((x0 + icon_size + pad, y + icon_size / 2), "Lexis", font=text_f, fill=text_fill, anchor="lm")

def base_canvas(bg):
    img = Image.new("RGB", (W, H), bg)
    return img, ImageDraw.Draw(img)

def gradient_bg(d):
    for i in range(H):
        t = i / H
        r = int(BLUE_DARK[0] + (BLUE[0] - BLUE_DARK[0]) * t)
        g = int(BLUE_DARK[1] + (BLUE[1] - BLUE_DARK[1]) * t)
        b = int(BLUE_DARK[2] + (BLUE[2] - BLUE_DARK[2]) * t)
        d.line([(0, i), (W, i)], fill=(r, g, b))

def eyebrow(draw, text, y, color=SLATE):
    f = F_BOLD(32)
    spaced = " ".join(list(text))
    center_text(draw, W / 2, y, spaced, f, color)

def footer_handle(draw, on_dark=False):
    f = F_SEMI(30)
    color = (203, 213, 225) if on_dark else SLATE
    center_text(draw, W / 2, H - 90, "@lexiswords · lexiswords.com", f, color)

def chip(d, text, cy0, f, fg, bg, pad_x=70, h=80):
    bbox = d.textbbox((0, 0), text, font=f)
    cw = bbox[2] - bbox[0] + pad_x
    cx0 = W / 2 - cw / 2
    rounded_rect(d, (cx0, cy0, cx0 + cw, cy0 + h), h / 2, bg)
    d.text((W / 2, cy0 + h / 2), text, font=f, fill=fg, anchor="mm")

def main():
    content_path, out_dir = sys.argv[1], sys.argv[2]
    out_dir = os.path.abspath(out_dir)
    with open(content_path, encoding="utf-8") as fh:
        c = json.load(fh)

    os.makedirs(out_dir, exist_ok=True)
    frames = []
    telegram_url = c.get("telegram_url", "t.me/lexis_words")
    has_question = bool(c.get("question_text")) and bool(c.get("options"))

    # ---------- SAHNE 1: Intro ----------
    img, d = base_canvas(BLUE_DARK)
    gradient_bg(d)
    lexis_wordmark(d, W / 2, H * 0.38, scale=1.3, on_dark=True)
    center_text(d, W / 2, H * 0.52, "GÜNÜN KELİMESİ", F_BLACK(56), WHITE)
    if c.get("level"):
        chip(d, c["level"], H * 0.60, F_BOLD(34), BLUE_DARK, WHITE)
    footer_handle(d, on_dark=True)
    p = f"{out_dir}/s1.png"; img.save(p); frames.append((p, 2.3))

    # ---------- SAHNE 2: Kelime ----------
    img, d = base_canvas(BG_LIGHT)
    lexis_wordmark(d, W / 2, 90, scale=0.8)
    eyebrow(d, "GÜNÜN KELİMESİ", 280)
    word_size = 110 if len(c["word"]) <= 16 else 72
    center_text(d, W / 2, 340, c["word"], F_BLACK(word_size), INK)
    if c.get("level"):
        chip(d, c["level"], 500, F_SEMI(30), BLUE, BOX_BLUE, pad_x=56, h=60)
    box_y = 640
    rounded_rect(d, (90, box_y, W - 90, box_y + 560), 36, BOX_BLUE)
    d.text((130, box_y + 50), "EN  ·  İngilizce", font=F_BOLD(34), fill=BLUE)
    wrapped_center_text(d, W / 2, box_y + 110, c["meaning_en"], F_SEMI(40), INK, 22, 54)
    d.text((130, box_y + 260), "TR  ·  Türkçe", font=F_BOLD(34), fill=BLUE)
    wrapped_center_text(d, W / 2, box_y + 320, c["meaning_tr"], F_SEMI(36), INK, 26, 50)
    footer_handle(d)
    p = f"{out_dir}/s2.png"; img.save(p); frames.append((p, 3.3))

    # ---------- SAHNE 3: Örnek 1 ----------
    img, d = base_canvas(BG_LIGHT)
    lexis_wordmark(d, W / 2, 90, scale=0.8)
    eyebrow(d, "ÖRNEK CÜMLE 1", 280)
    wrapped_center_text(d, W / 2, 420, c["example_1_en"], F_BOLD(52), INK, 22, 68)
    wrapped_center_text(d, W / 2, 780, f"“{c['example_1_tr']}”", F_ITALIC(40), SLATE, 28, 54)
    footer_handle(d)
    p = f"{out_dir}/s3.png"; img.save(p); frames.append((p, 3.3))

    scene_n = 4
    # ---------- SAHNE 4: Örnek 2 (opsiyonel) ----------
    if c.get("example_2_en"):
        img, d = base_canvas(BG_LIGHT)
        lexis_wordmark(d, W / 2, 90, scale=0.8)
        eyebrow(d, "ÖRNEK CÜMLE 2", 280)
        wrapped_center_text(d, W / 2, 420, c["example_2_en"], F_BOLD(52), INK, 22, 68)
        wrapped_center_text(d, W / 2, 780, f"“{c.get('example_2_tr', '')}”", F_ITALIC(40), SLATE, 28, 54)
        footer_handle(d)
        p = f"{out_dir}/s{scene_n}.png"; img.save(p); frames.append((p, 3.3))
        scene_n += 1

    # ---------- SAHNE: Dilbilgisi notu (opsiyonel) ----------
    if c.get("grammar_note_tr"):
        img, d = base_canvas(BG_LIGHT)
        lexis_wordmark(d, W / 2, 90, scale=0.8)
        eyebrow(d, "DİLBİLGİSİ NOTU", 280)
        box_y = 400
        note = c["grammar_note_tr"]
        rounded_rect(d, (80, box_y, W - 80, box_y + 600), 36, BOX_AMBER)
        wrapped_center_text(d, W / 2, box_y + 90, note, F_SEMI(38), AMBER_TEXT, 26, 52)
        footer_handle(d)
        p = f"{out_dir}/s{scene_n}.png"; img.save(p); frames.append((p, 4.0))
        scene_n += 1

    # ---------- SAHNE: Soru (opsiyonel) ----------
    if has_question:
        img, d = base_canvas(BG_LIGHT)
        lexis_wordmark(d, W / 2, 90, scale=0.8)
        eyebrow(d, c.get("exam_label", "GÜNÜN SORUSU"), 280, color=INDIGO_TEXT)
        box_y = 380
        n_opts = len(c["options"])
        box_h = 420 + n_opts * 115
        rounded_rect(d, (70, box_y, W - 70, box_y + box_h), 36, BOX_INDIGO)
        y = wrapped_center_text(d, W / 2, box_y + 60, c["question_text"], F_SEMI(40), INDIGO_TEXT, 24, 56) + 50
        for opt in c["options"]:
            rounded_rect(d, (150, y, W - 150, y + 90), 20, WHITE)
            opt_f = F_SEMI(36) if len(opt) > 28 else F_SEMI(40)
            d.text((W / 2, y + 45), opt, font=opt_f, fill=INK, anchor="mm")
            y += 115
        footer_handle(d)
        p = f"{out_dir}/s{scene_n}.png"; img.save(p); frames.append((p, 4.3))
        scene_n += 1

    # ---------- SAHNE: CTA / outro ----------
    img, d = base_canvas(BLUE_DARK)
    gradient_bg(d)
    cta_text = "Cevabı öğrenmek ister misin?" if has_question else "Her gün yeni kelime + soru"
    center_text(d, W / 2, H * 0.32, cta_text, F_BOLD(50), WHITE)
    chip(d, telegram_url, H * 0.42, F_BLACK(46), BLUE_DARK, WHITE, pad_x=80, h=100)
    lexis_wordmark(d, W / 2, H * 0.62, scale=1.1, on_dark=True)
    center_text(d, W / 2, H * 0.70, "Her gün yeni kelime + soru", F_SEMI(38), (203, 213, 225))
    footer_handle(d, on_dark=True)
    p = f"{out_dir}/s{scene_n}.png"; img.save(p); frames.append((p, 3.0))

    with open(f"{out_dir}/concat.txt", "w", encoding="utf-8") as fh:
        for path, dur in frames:
            fh.write(f"file '{path}'\nduration {dur}\n")
        fh.write(f"file '{frames[-1][0]}'\n")

    total = sum(dd for _, dd in frames)
    print(json.dumps({"scenes": len(frames), "total_seconds": round(total, 2), "concat": f"{out_dir}/concat.txt"}))

if __name__ == "__main__":
    main()
