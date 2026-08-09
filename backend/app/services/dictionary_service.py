"""
Çok dilli sözlük orkestrasyonu.

Strateji:
- learning_lang == 'en'  -> Cambridge (english-{native_lang} iki dilli sayfa,
                             yoksa english tek dilli + MyMemory çeviri)
- learning_lang != 'en'  -> dictionaryapi.dev (öğrenilen dilin kendi içinde
                             tanım+örnek) + MyMemory (ana dile çeviri)
- Hiçbiri sonuç vermezse  -> son çare: sadece kelimenin MyMemory çevirisi
"""
from app.services.dictionary_providers import cambridge, free_dictionary, mymemory
from app.services.dictionary_providers.pos_labels import localize_pos


async def lookup_word(word: str, learning_lang: str, native_lang: str) -> dict:
    word = word.strip()
    if not word:
        return {"meanings": [], "error": "Kelime boş olamaz."}

    # ── 1) İngilizce öğreniliyorsa Cambridge ──
    if cambridge.supports(learning_lang):
        meanings = await cambridge.lookup(word, native_lang)
        if meanings:
            return {"meanings": meanings, "error": None, "source": "cambridge"}

    # ── 2) Genel sağlayıcı: tanım (öğrenilen dilde) + çeviri (ana dile) ──
    definitions = await free_dictionary.lookup(word, learning_lang)
    if definitions:
        meanings = []
        for d in definitions[:5]:
            translated = await mymemory.translate(d["definition"] or word, learning_lang, native_lang)
            pos = d.get("word_type", "")
            meanings.append({
                "word_type": pos,
                "word_type_native": localize_pos(pos, native_lang),
                "meaning_target": d["definition"],
                "meaning_native": translated or "",
                "examples": [d["example"]] if d.get("example") else [],
            })
        if meanings:
            return {"meanings": meanings, "error": None, "source": "free_dictionary+mymemory"}

    # ── 3) Son çare: sadece kelimenin doğrudan çevirisi ──
    translated_word = await mymemory.translate(word, learning_lang, native_lang)
    if translated_word:
        return {
            "meanings": [{
                "word_type": "",
                "word_type_native": "",
                "meaning_target": word,
                "meaning_native": translated_word,
                "examples": [],
            }],
            "error": None,
            "source": "mymemory",
        }

    return {"meanings": [], "error": "Anlam bulunamadı, elle girebilirsin."}
