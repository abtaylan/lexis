"""
Çok dilli sözlük orkestrasyonu.

Strateji:
- learning_lang == 'en'  -> Cambridge (english-{native_lang} iki dilli sayfa,
                             yoksa english tek dilli + MyMemory çeviri)
- learning_lang != 'en'  -> dictionaryapi.dev (öğrenilen dilin kendi içinde
                             tanım+örnek) + MyMemory (ana dile çeviri)
- Hiçbiri sonuç vermezse  -> son çare: sadece kelimenin MyMemory çevirisi

NOT (Madde 1d takibi, 2026-08-20): Cambridge, native_lang için
CAMBRIDGE_NATIVE_SLUG'da karşılığı olmayan bir dilde (ör. 'ru') sadece
İngilizce tek dilli sayfayı buluyor — bu durumda "meaning_native" boş
kalıyor ama fonksiyon yine de erken dönüyordu, böylece asıl çeviriyi
sağlayabilecek free_dictionary+mymemory adımına hiç sıra gelmiyordu.
general_word_pool seed'i sırasında bulundu; her iki adımda da
meaning_native'i boş olmayan sonuçlarla filtreleyip, hiçbiri kalmazsa bir
sonraki sağlayıcıya düşecek şekilde düzeltildi.

GÜNCELLEME (14 Eylül 2026, Korece/Çince seed bug'ı takibi): yukarıdaki
Madde 1d düzeltmesi, sonraki bir oturumda interaktif kelime ekleme akışı
için ("çeviri bulunamasa bile en azından İngilizce tanım+örnek gösterilsin,
kullanıcı elle çevirsin" gerekçesiyle) gevşetilmiş — Cambridge'den dönen
SONUÇ (meaning_target/examples) varsa meaning_native boş olsa bile hemen
dönülüyordu, bu da free_dictionary+mymemory adımına HİÇ sıra gelmemesine
yol açıyordu. general_word_pool seed script'i Korece/Çince için
çalıştırıldığında (CAMBRIDGE_NATIVE_SLUG'da ko/zh karşılığı yok) 303
kelimeden 301'i bu yüzden "çeviri boş döndü" ile atlandı. Düzeltme: önce
GERÇEK bir çeviri (meaning_native dolu) veren sağlayıcı aranıyor (önce
Cambridge, sonra free_dictionary+mymemory); hiçbiri çeviri veremezse EN SON
çare olarak Cambridge/free_dictionary'nin çevirisiz sonucu (varsa) dönülüyor
— interaktif akış için "en azından İngilizce tanım+örnek" garantisi korundu,
ama artık gerçek çeviri ihtimali asla atlanmıyor.
"""
from app.services.dictionary_providers import cambridge, free_dictionary, mymemory
from app.services.dictionary_providers.pos_labels import localize_pos


async def lookup_word(word: str, learning_lang: str, native_lang: str) -> dict:
    word = word.strip()
    if not word:
        return {"meanings": [], "error": "Kelime boş olamaz."}

    cambridge_meanings: list[dict] = []
    generic_meanings: list[dict] = []

    # ── 1) İngilizce öğreniliyorsa Cambridge ──
    if cambridge.supports(learning_lang):
        cambridge_meanings = await cambridge.lookup(word, native_lang)
        # Önce GERÇEK çeviri (meaning_native dolu) içeren sonuçları tercih et.
        cambridge_translated = [
            m for m in cambridge_meanings if (m.get("meaning_native") or "").strip()
        ]
        if cambridge_translated:
            return {"meanings": cambridge_translated, "error": None, "source": "cambridge"}

    # ── 2) Genel sağlayıcı: tanım (öğrenilen dilde) + çeviri (ana dile) ──
    definitions = await free_dictionary.lookup(word, learning_lang)
    if definitions:
        for d in definitions[:5]:
            translated = await mymemory.translate(d["definition"] or word, learning_lang, native_lang)
            pos = d.get("word_type", "")
            generic_meanings.append({
                "word_type": pos,
                "word_type_native": localize_pos(pos, native_lang),
                "meaning_target": d["definition"],
                # Çeviri (MyMemory) başarısız/rate-limit olursa boş bırak —
                # meaning_target zaten dolu olduğu için sonuç yine kullanılabilir.
                "meaning_native": translated or "",
                "examples": [d["example"]] if d.get("example") else [],
            })
        generic_translated = [
            m for m in generic_meanings if (m.get("meaning_native") or "").strip()
        ]
        if generic_translated:
            return {"meanings": generic_translated, "error": None, "source": "free_dictionary+mymemory"}

    # ── 3) Hiçbir sağlayıcı gerçek bir çeviri veremedi: en azından İngilizce
    #      tanım (meaning_target) veya örnek cümle varsa onu dön — kullanıcı
    #      en azından bunu görüp çeviriyi kendisi girebilir. Bu artık SADECE
    #      hem Cambridge hem free_dictionary+mymemory'nin gerçek çeviri
    #      veremediği durumda devreye giriyor (eskiden Cambridge tek başına
    #      bunu hemen dönüp ikinci adıma hiç sıra bırakmıyordu).
    fallback_pool = cambridge_meanings or generic_meanings
    fallback_usable = [
        m for m in fallback_pool
        if (m.get("meaning_target") or "").strip() or m.get("examples")
    ]
    if fallback_usable:
        source = "cambridge" if cambridge_meanings else "free_dictionary"
        return {"meanings": fallback_usable, "error": None, "source": source}

    # ── 4) Son çare: sadece kelimenin doğrudan çevirisi ──
    translated_word = await mymemory.translate(word, learning_lang, native_lang)
    # ÖNEMLİ: MyMemory, gerçek bir çeviri bulamadığında (veya learning_lang/
    # native_lang beklenmedik şekilde aynıysa, ör. kullanıcı hedef dilde değil
    # kendi ana dilinde bir kelime girdiğinde) bazen kelimeyi OLDUĞU GİBİ geri
    # döndürüyor. Bu durumda "Anlam" alanı kelimenin birebir kendisiyle
    # doluyor, "Örnek cümle" de boş kalıyor — kullanıcıya sözlük çalışıyormuş
    # ama anlamsız/yanlış sonuç veriyormuş gibi görünüyordu. Çeviri, girilen
    # kelimeyle (büyük/küçük harf ve boşluk farkı gözetmeksizin) aynıysa bunu
    # "anlam bulunamadı" say, kullanıcıyı yanıltan bir sahte sonuç gösterme.
    is_real_translation = (
        translated_word and translated_word.strip().casefold() != word.strip().casefold()
    )
    if is_real_translation:
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
