"""
MyMemory Translation API — ücretsiz (key gerektirmez, günlük ~5000
kelime/IP limiti var; app.core.config.MYMEMORY_EMAIL doldurulursa
limit yükselir). https://mymemory.translated.net/doc/spec.php
"""
import httpx

from app.core.config import settings

BASE_URL = "https://api.mymemory.translated.net/get"


async def translate(text: str, source_lang: str, target_lang: str) -> str:
    if not text.strip() or source_lang == target_lang:
        return text

    params = {"q": text, "langpair": f"{source_lang}|{target_lang}"}
    if settings.MYMEMORY_EMAIL:
        params["de"] = settings.MYMEMORY_EMAIL

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(BASE_URL, params=params)
            if r.status_code != 200:
                return ""
            data = r.json()
    except Exception:
        return ""

    translated = (data.get("responseData") or {}).get("translatedText", "")
    # MyMemory desteklenmeyen dil çiftinde bazen hata mesajını metin olarak döner
    if not translated or "MYMEMORY WARNING" in translated.upper() or "INVALID" in translated.upper():
        return ""
    return translated
