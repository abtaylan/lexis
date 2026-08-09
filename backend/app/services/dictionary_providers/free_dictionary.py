"""
dictionaryapi.dev sağlayıcısı — ücretsiz, key gerektirmez.
Kelimeyi ÖĞRENİLEN dilin kendi içinde tanımlar (definition + example + partOfSpeech).
Çeviri yapmaz — bunun için mymemory.py kullanılıyor.

Desteklenmeyen bir dil/kelime için 404 döner, biz de sessizce boş liste döndürüp
üst katmanda MyMemory çeviri fallback'ine geçiyoruz.
"""
import httpx

BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries"


async def lookup(word: str, learning_lang: str) -> list[dict]:
    slug = word.strip().lower()
    url = f"{BASE_URL}/{learning_lang}/{slug}"

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url)
            if r.status_code != 200:
                return []
            data = r.json()
    except Exception:
        return []

    results = []
    for entry in data if isinstance(data, list) else []:
        for meaning in entry.get("meanings", []):
            pos = meaning.get("partOfSpeech", "")
            for definition in meaning.get("definitions", [])[:2]:
                results.append({
                    "word_type": pos,
                    "definition": definition.get("definition", ""),
                    "example": definition.get("example", ""),
                })
    return results
