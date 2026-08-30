"""
Cambridge Dictionary scraping sağlayıcısı.

Cambridge'in güvenilir şekilde desteklediği yön: kelime İNGİLİZCE
(learning_lang == 'en'), ana dile göre "english-{lang}" iki dilli
sözlük sayfası (varsa) + "english" tek dilli sayfası fallback.

Diğer öğrenme dilleri (learning_lang != 'en') için Cambridge
kullanılmıyor — bunlar generic.py (dictionaryapi.dev + MyMemory)
üzerinden karşılanıyor, çünkü Cambridge'in İngilizce-kaynaklı
olmayan sözlük kapsamı güvenilir biçimde doğrulanamıyor.
"""
import hashlib
import logging

import httpx
from bs4 import BeautifulSoup

from app.services.dictionary_providers.pos_labels import localize_pos

logger = logging.getLogger(__name__)

# Bizim dil kodlarımız -> Cambridge URL slug'ı
CAMBRIDGE_NATIVE_SLUG = {
    "tr": "turkish", "de": "german", "fr": "french", "es": "spanish",
    "it": "italian", "ja": "japanese", "ar": "arabic",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

_cache: dict = {}


def supports(learning_lang: str) -> bool:
    return learning_lang == "en"


def _clean(tag) -> str:
    if tag is None:
        return ""
    return " ".join(t.strip() for t in tag.strings if t.strip())


async def lookup(word: str, native_lang: str) -> list[dict]:
    cache_key = hashlib.md5(f"{word.lower()}|{native_lang}".encode()).hexdigest()
    if cache_key in _cache:
        return _cache[cache_key]

    slug = word.strip().lower().replace(" ", "-")
    native_slug = CAMBRIDGE_NATIVE_SLUG.get(native_lang)

    urls = []
    if native_slug:
        urls.append(f"https://dictionary.cambridge.org/dictionary/english-{native_slug}/{slug}")
    urls.append(f"https://dictionary.cambridge.org/dictionary/english/{slug}")

    soup = None
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for url in urls:
            try:
                r = await client.get(url, headers=HEADERS)
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, "html.parser")
                    break
            except Exception:
                logger.debug("Cambridge lookup failed for url=%s", url, exc_info=True)
                continue

    if soup is None:
        return []

    meanings = []
    seen = set()

    for entry in (soup.find_all("div", class_=lambda c: c and "entry-body__el" in c) or [soup]):
        for pos_body in (entry.find_all("div", class_=lambda c: c and "pos-body" in c) or [entry]):
            pos_en = ""
            prev = pos_body.find_previous("div", class_=lambda c: c and ("pos-header" in c or "posgram" in c))
            if prev:
                ps = prev.find("span", class_=lambda c: c and "pos" in c.split())
                if ps:
                    pos_en = _clean(ps).lower()

            for blok in pos_body.find_all("div", class_=lambda c: c and "def-block" in c):
                target_def = ""
                def_div = blok.find("div", class_=lambda c: c and "def" in c.split() and "ddef_d" in c.split())
                if def_div:
                    target_def = " ".join(t.strip() for t in def_div.strings if t.strip()).rstrip(":")

                native_tr = ""
                tr_tag = blok.find("span", class_=lambda c: c and "trans" in c.split())
                if tr_tag:
                    native_tr = _clean(tr_tag)

                examples = []
                for eg_div in blok.find_all("div", class_=lambda c: c and "examp" in c)[:3]:
                    eg_span = eg_div.find("span", class_=lambda c: c and "eg" in c.split())
                    if eg_span:
                        eg_text = _clean(eg_span)
                        if eg_text:
                            examples.append(eg_text)

                key = (target_def.lower()[:40], native_tr.lower()[:40])
                if (target_def or native_tr) and key not in seen:
                    seen.add(key)
                    meanings.append({
                        "word_type": pos_en,
                        "word_type_native": localize_pos(pos_en, native_lang),
                        "meaning_target": target_def,
                        "meaning_native": native_tr,
                        "examples": examples,
                    })

    if meanings:
        _cache[cache_key] = meanings
    return meanings
