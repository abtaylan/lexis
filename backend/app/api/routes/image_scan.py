"""
backend/app/api/routes/image_scan.py

Premium özellik (10 Kasım 2026 kullanıcı isteği, Behçet): "Lexis'de görüntü
işleme yapacaz, bir resim çektiğimizde içindeki metni çözecek, hem metnin
çevirisini yapacak, hem de metindeki kelimeleri liste halinde yazacak."

Hem web hem mobil aynı uç noktayı kullanıyor (web: <input type="file">,
mobil: expo-image-picker — study_notes.py'deki görsel yükleme deseniyle
AYNI multipart/form-data yaklaşımı). get_current_premium_user (bkz.
app/core/auth.py) ile korunuyor — bu repodaki, is_premium'a göre bir app
FEATURE'ını (reklam/analitik dışında) kilitleyen İLK uç nokta.

Taranan kelimeler burada AYRI bir tabloya yazılmıyor — dönen 'words'
listesi, mevcut POST /words (bkz. words.py / schemas/words.py WordCreate)
ile BİREBİR uyumlu alanlara sahip; "kelimelerime ekle" aksiyonu frontend'de
doğrudan o mevcut uç noktaya yapılan bir çağrı.
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.auth import get_current_premium_user
from app.core.database import supabase_admin
from app.schemas.image_scan import ImageScanResponse
from app.services.image_scan_service import (
    ALLOWED_IMAGE_CONTENT_TYPES,
    MAX_IMAGE_BYTES,
    ImageScanError,
    scan_image_text,
)

router = APIRouter()


@router.post("", response_model=ImageScanResponse)
async def scan_image(
    file: UploadFile = File(...),
    current_user=Depends(get_current_premium_user),
):
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(
            status_code=400, detail=f"Desteklenmeyen görsel türü: {content_type or 'bilinmiyor'}"
        )
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Görsel boş.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Görsel {MAX_IMAGE_BYTES // (1024 * 1024)}MB sınırını aşıyor.",
        )

    # Çeviri hedef dili: kullanıcının ana dili (native_lang) — words.py'deki
    # create_word ile AYNI mantık (source=öğrenilen dil, target=ana dil).
    try:
        profile = (
            supabase_admin.table("profiles")
            .select("native_lang")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        target_lang = (profile.data or {}).get("native_lang") or "tr"
    except Exception:
        target_lang = "tr"

    try:
        result = scan_image_text(image_bytes=data, media_type=content_type, target_lang=target_lang)
    except ImageScanError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result
