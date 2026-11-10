"""
backend/app/services/image_scan_service.py

Premium özellik (10 Kasım 2026 kullanıcı isteği, Behçet): "Lexis'de görüntü
işleme yapacaz, bir resim çektiğimizde içindeki metni çözecek, hem metnin
çevirisini yapacak, hem de metindeki kelimeleri liste halinde yazacak."

study_passage_generator.py ile AYNI desen: Anthropic Messages API, zorunlu
tool-use ile yapılandırılmış JSON çıktısı. FARKI: bu dosyada ayrıca bir
GÖRSEL de modele gönderiliyor (Claude'un multimodal/vision yeteneği) —
kodda bu repoda bu tarz bir "image content block" kullanımının İLK örneği
(bkz. backend/app/api/routes/image_scan.py). Ayrı bir OCR servisi
entegre edilmedi; metni görselin içinden doğrudan Claude okuyor.

words: dönen liste, kullanıcının mevcut "Kelimelerim" tablosunun şemasıyla
(word/meaning/word_type/example, bkz. app/schemas/words.py WordCreate)
BİREBİR uyumlu olacak şekilde tasarlandı — frontend, taranan bir kelimeyi
"kelimelerime ekle" dediğinde doğrudan mevcut POST /words uç noktasına
gönderebiliyor, ayrı bir tablo/uç nokta gerekmiyor.
"""

from anthropic import Anthropic, APIError

from app.core.config import settings

_SUBMIT_TOOL = {
    "name": "submit_image_scan",
    "description": (
        "Görseldeki metni, bu metnin çevirisini ve metinde geçen öğrenilmeye "
        "değer kelimeleri yapılandırılmış olarak gönderir."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "detected_text": {
                "type": "string",
                "description": (
                    "Görseldeki metnin, GÖRÜLDÜĞÜ DİLDE, harf/noktalama hatası "
                    "düzeltilmeden ama satır/paragraf yapısı korunarak tam "
                    "transkripsiyonu. Görselde okunabilir metin yoksa boş "
                    "string döndür."
                ),
            },
            "detected_lang": {
                "type": "string",
                "description": "Görseldeki metnin dili için ISO 639-1 kodu (örn. 'en', 'tr', 'de').",
            },
            "translation": {
                "type": "string",
                "description": "detected_text'in target_lang'e tam ve doğal akan çevirisi.",
            },
            "words": {
                "type": "array",
                "maxItems": 25,
                "description": (
                    "Metinde geçen, öğrenci için yeni/zorlayıcı olabilecek "
                    "kelimeler (sözlük kökü hâlinde, tekrarsız). Metin çok "
                    "kısa/basitse az sayıda (hatta sıfır) kelime döndürülebilir."
                ),
                "items": {
                    "type": "object",
                    "properties": {
                        "word": {
                            "type": "string",
                            "description": "Kelimenin sözlük/kök hâli, görüldüğü dilde.",
                        },
                        "meaning": {
                            "type": "string",
                            "description": "Kelimenin target_lang'deki karşılığı.",
                        },
                        "word_type": {
                            "type": "string",
                            "description": "noun/verb/adjective/adverb gibi kısa tür etiketi.",
                        },
                        "example": {
                            "type": "string",
                            "description": "Kelimenin detected_text içinde geçtiği asıl cümle.",
                        },
                    },
                    "required": ["word", "meaning"],
                },
            },
        },
        "required": ["detected_text", "detected_lang", "translation", "words"],
    },
}

# Anthropic Vision API — base64 ile gönderilen tek bir görsel için pratik
# üst sınır (resmî sınır ~5MB base64-encoded; biz ham dosya boyutunu bunun
# altında tutuyoruz, base64 şişmesi ~%33 olduğundan).
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


class ImageScanError(Exception):
    """Görsel tarama (OCR + çeviri + kelime listesi) başarısız olduğunda fırlatılır."""


def scan_image_text(
    *, image_bytes: bytes, media_type: str, target_lang: str = "tr"
) -> dict:
    """Bir görseldeki metni okur, hedef dile çevirir ve metindeki öğrenilmeye
    değer kelimeleri çıkarır. Ağ/yapılandırma/parse hatalarında
    ImageScanError fırlatır (route bunu 502/500'e çevirir — study_notes.py /
    study_passage_generator.py'daki AYNI hata dönüştürme deseni)."""
    if not settings.ANTHROPIC_API_KEY:
        raise ImageScanError("ANTHROPIC_API_KEY yapılandırılmamış — görsel tarama kapalı.")

    import base64

    b64_data = base64.standard_b64encode(image_bytes).decode("ascii")

    prompt = (
        f"Bu görseldeki TÜM okunabilir metni oku (bir sayfa, ekran görüntüsü, "
        f"tabela, kitap/defter fotoğrafı olabilir). Metni hiçbir şey ekleyip "
        f"çıkarmadan, görüldüğü dilde transkribe et (detected_text), dilini "
        f"tespit et (detected_lang, ISO 639-1), ve bu metni '{target_lang}' "
        f"diline çevir (translation).\n\n"
        "Ayrıca metinde geçen, bir dil öğrencisi için yeni/zorlayıcı "
        "olabilecek kelimeleri (en fazla 25, tekrarsız, sözlük/kök hâlinde) "
        f"çıkar; her biri için '{target_lang}' dilindeki karşılığını, kısa "
        "bir tür etiketini (word_type: noun/verb/adjective/adverb vb.) ve "
        "kelimenin metin içinde geçtiği cümleyi (example) ver.\n\n"
        "Görselde okunabilir bir metin YOKSA detected_text'i boş string, "
        "words'ü boş dizi olarak döndür — metin üretme, sadece gerçekten "
        "görselde olanı raporla.\n\n"
        "Sadece submit_image_scan aracını çağırarak cevap ver, ek metin yazma."
    )

    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=4096,
            tools=[_SUBMIT_TOOL],
            tool_choice={"type": "tool", "name": "submit_image_scan"},
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64_data,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
    except APIError as exc:
        raise ImageScanError(f"Anthropic API hatası: {exc}") from exc
    except Exception as exc:
        raise ImageScanError(
            f"Görsel tarama beklenmeyen hatayla başarısız oldu ({type(exc).__name__}): {exc}"
        ) from exc

    tool_use = next(
        (block for block in response.content if getattr(block, "type", None) == "tool_use"),
        None,
    )
    if tool_use is None:
        raise ImageScanError("Model tool_use bloğu döndürmedi.")

    data = tool_use.input or {}
    detected_text = (data.get("detected_text") or "").strip()
    detected_lang = (data.get("detected_lang") or "").strip().lower() or None
    translation = (data.get("translation") or "").strip()

    raw_words = data.get("words") or []
    if not isinstance(raw_words, list):
        raw_words = []
    words = []
    seen_words: set[str] = set()
    for item in raw_words:
        if not isinstance(item, dict):
            continue
        word = (item.get("word") or "").strip()
        meaning = (item.get("meaning") or "").strip()
        if not word or not meaning:
            continue
        key = word.lower()
        if key in seen_words:
            continue
        seen_words.add(key)
        words.append(
            {
                "word": word,
                "meaning": meaning,
                "word_type": (item.get("word_type") or "").strip() or None,
                "example": (item.get("example") or "").strip() or None,
            }
        )

    return {
        "detected_text": detected_text,
        "detected_lang": detected_lang,
        "translation": translation,
        "target_lang": target_lang,
        "words": words,
    }
