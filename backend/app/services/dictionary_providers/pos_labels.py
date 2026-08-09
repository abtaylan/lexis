"""Kelime türü (part-of-speech) etiketlerini kullanıcının ana diline
göre yerelleştirir. Kapsanmayan bir dil/tür kombinasyonunda İngilizce
terim büyük harfle başlatılarak döner (ör. 'noun' -> 'Noun')."""

POS_TRANSLATIONS: dict[str, dict[str, str]] = {
    "noun": {
        "tr": "İsim", "de": "Nomen", "fr": "Nom", "es": "Sustantivo",
        "it": "Sostantivo", "ja": "名詞", "ar": "اسم", "en": "Noun",
    },
    "verb": {
        "tr": "Fiil", "de": "Verb", "fr": "Verbe", "es": "Verbo",
        "it": "Verbo", "ja": "動詞", "ar": "فعل", "en": "Verb",
    },
    "adjective": {
        "tr": "Sıfat", "de": "Adjektiv", "fr": "Adjectif", "es": "Adjetivo",
        "it": "Aggettivo", "ja": "形容詞", "ar": "صفة", "en": "Adjective",
    },
    "adverb": {
        "tr": "Zarf", "de": "Adverb", "fr": "Adverbe", "es": "Adverbio",
        "it": "Avverbio", "ja": "副詞", "ar": "ظرف", "en": "Adverb",
    },
    "pronoun": {
        "tr": "Zamir", "de": "Pronomen", "fr": "Pronom", "es": "Pronombre",
        "it": "Pronome", "ja": "代名詞", "ar": "ضمير", "en": "Pronoun",
    },
    "preposition": {
        "tr": "Edat", "de": "Präposition", "fr": "Préposition", "es": "Preposición",
        "it": "Preposizione", "ja": "前置詞", "ar": "حرف جر", "en": "Preposition",
    },
    "conjunction": {
        "tr": "Bağlaç", "de": "Konjunktion", "fr": "Conjonction", "es": "Conjunción",
        "it": "Congiunzione", "ja": "接続詞", "ar": "أداة عطف", "en": "Conjunction",
    },
    "interjection": {
        "tr": "Ünlem", "de": "Interjektion", "fr": "Interjection", "es": "Interjección",
        "it": "Interiezione", "ja": "感動詞", "ar": "أداة تعجب", "en": "Interjection",
    },
    "phrase": {
        "tr": "Deyim", "de": "Redewendung", "fr": "Expression", "es": "Expresión",
        "it": "Espressione", "ja": "フレーズ", "ar": "عبارة", "en": "Phrase",
    },
    "idiom": {
        "tr": "Deyim", "de": "Redewendung", "fr": "Expression idiomatique", "es": "Modismo",
        "it": "Idioma", "ja": "イディオム", "ar": "مصطلح", "en": "Idiom",
    },
    "phrasal verb": {
        "tr": "Fiil", "de": "Verb", "fr": "Verbe", "es": "Verbo",
        "it": "Verbo", "ja": "動詞", "ar": "فعل", "en": "Phrasal verb",
    },
}


def localize_pos(pos_en: str, native_lang: str) -> str:
    key = (pos_en or "").strip().lower()
    entry = POS_TRANSLATIONS.get(key)
    if entry:
        return entry.get(native_lang) or entry.get("en") or pos_en.capitalize()
    return pos_en.capitalize() if pos_en else "Diğer"
