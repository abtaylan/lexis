from fastapi import APIRouter, HTTPException, Query
import httpx
from bs4 import BeautifulSoup
from functools import lru_cache
import hashlib

router = APIRouter()

TUR_MAP = {
    "noun": "İsim", "verb": "Fiil", "adjective": "Sıfat",
    "adverb": "Zarf", "phrasal verb": "Fiil",
    "idiom": "Deyim", "phrase": "Deyim"
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

# Basit in-memory cache (production'da Redis kullan)
_cache: dict = {}


def _clean(tag) -> str:
    if tag is None:
        return ""
    return " ".join(t.strip() for t in tag.strings if t.strip())


async def _scrape(word: str) -> dict:
    cache_key = hashlib.md5(word.lower().encode()).hexdigest()
    if cache_key in _cache:
        return _cache[cache_key]

    slug = word.strip().lower().replace(" ", "-")
    urls = [
        f"https://dictionary.cambridge.org/dictionary/english-turkish/{slug}",
        f"https://dictionary.cambridge.org/dictionary/english/{slug}",
    ]

    soup = None
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for url in urls:
            try:
                r = await client.get(url, headers=HEADERS)
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, "html.parser")
                    break
            except Exception:
                continue

    if soup is None:
        return {"meanings": [], "error": "Kelime bulunamadı."}

    meanings = []
    seen = set()

    for entry in (soup.find_all("div", class_=lambda c: c and "entry-body__el" in c) or [soup]):
        for pos_body in (entry.find_all("div", class_=lambda c: c and "pos-body" in c) or [entry]):
            # Kelime türü
            tur_en, tur_tr = "", "Diğer"
            prev = pos_body.find_previous("div", class_=lambda c: c and ("pos-header" in c or "posgram" in c))
            if prev:
                ps = prev.find("span", class_=lambda c: c and "pos" in c.split())
                if ps:
                    tur_en = _clean(ps).lower()
                    tur_tr = TUR_MAP.get(tur_en, "Diğer")

            for blok in pos_body.find_all("div", class_=lambda c: c and "def-block" in c):
                # İngilizce tanım
                en_tanim = ""
                def_div = blok.find("div", class_=lambda c: c and "def" in c.split() and "ddef_d" in c.split())
                if def_div:
                    en_tanim = " ".join(t.strip() for t in def_div.strings if t.strip()).rstrip(":")

                # Türkçe çeviri
                tr_tag = blok.find("span", class_=lambda c: c and "trans" in c.split())
                tr_ceviri = _clean(tr_tag) if tr_tag else ""

                # Örnekler
                examples = []
                for eg_div in blok.find_all("div", class_=lambda c: c and "examp" in c)[:3]:
                    eg_span = eg_div.find("span", class_=lambda c: c and "eg" in c.split())
                    if eg_span:
                        eg_text = _clean(eg_span)
                        if eg_text:
                            examples.append(eg_text)

                key = (en_tanim.lower()[:40], tr_ceviri.lower()[:40])
                if (en_tanim or tr_ceviri) and key not in seen:
                    seen.add(key)
                    meanings.append({
                        "word_type": tur_en,
                        "word_type_tr": tur_tr,
                        "meaning_en": en_tanim,
                        "meaning_tr": tr_ceviri,
                        "examples": examples,
                    })

    result = {"meanings": meanings, "error": None if meanings else "Anlam bulunamadı."}
    if meanings:
        _cache[cache_key] = result  # Cache'e yaz
    return result


@router.get("/lookup")
async def lookup_word(
    word: str = Query(..., min_length=1, max_length=100)
):
    """Cambridge Dictionary'den kelime ara."""
    result = await _scrape(word.strip())
    if result.get("error") and not result.get("meanings"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result
