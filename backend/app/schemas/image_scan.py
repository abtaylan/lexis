"""backend/app/schemas/image_scan.py — Görsel metin tarama (premium) yanıt şeması.
Bkz. app/services/image_scan_service.py, app/api/routes/image_scan.py."""

from pydantic import BaseModel


class ScannedWord(BaseModel):
    word: str
    meaning: str
    word_type: str | None = None
    example: str | None = None


class ImageScanResponse(BaseModel):
    detected_text: str
    detected_lang: str | None = None
    translation: str
    target_lang: str
    words: list[ScannedWord]
