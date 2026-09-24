"""
backend/app/services/word_of_the_day_service.py

Madde 5 (24 Eylül 2026) — "Günün Kelimesi" dashboard widget'ı. Kullanıcının
her gün e-posta olarak zaten aldığı içeriği (bkz. send_daily_word_email.py,
daily_word_content / general_word_pool rotasyonu) web/mobil dashboard'da da
GÖRÜNÜR yapmak için salt-okunur bir seçim fonksiyonu.

ÖNEMLİ FARK: send_daily_word_email.py'deki _pick_word() "SIRADA gönderilecek"
kaydı bulur (never_sent → en eski oluşturulan, yoksa last_sent_at ASC — yani
en ESKİ gönderilen) ve last_sent_at'i günceller. Bu dosyadaki fonksiyon ise
"BUGÜN ZATEN gönderilmiş/gösterilmiş olan" kaydı okur — aynı (target_lang,
native_lang) çifti için last_sent_at DESC (en YENİ gönderilen) sırasında ilk
kayıt, hiçbir satırı GÜNCELLEMEDEN. Cron her sabah bir adım ilerlettiği için
bu, o günün e-postasında/sosyal medya paylaşımında giden kelimeyle birebir
aynı sonucu verir; cron o gün için henüz çalışmamışsa (örn. sabah 06:00'dan
önce) bir önceki günün kelimesini gösterir -- e-postanın kendisi de o ana
kadar aynı durumda olduğu için tutarlı.

Hiç last_sent_at'i dolu satır yoksa (havuz yeni seed edilmiş, cron hiç
çalışmamış) send_daily_word_email.py'nin İLK seçeceği kaydı (en eski
oluşturulan) döner -- boş widget yerine "bir sonraki e-postada gidecek
kelime"nin önizlemesi.
"""

from app.core.database import supabase_admin

# general_word_pool'dan gelen (dilbilgisi notu olmayan) içerik için gösterilen
# genel çalışma ipucu -- send_daily_word_email.py::_POOL_TIP_BY_NATIVE_LANG
# ile AYNI metinler (widget'ta da tutarlı olsun diye kopyalandı; iki dosya da
# küçük, ayrı bir ortak modüle taşımak şimdilik gerekmiyor).
_POOL_TIP_BY_NATIVE_LANG: dict[str, str] = {
    "tr": "Bu kelimeyi bugün kendi cümlende kullanmayı dene — pratik, kalıcı öğrenmenin en iyi yoludur.",
    "en": "Try using this word in your own sentence today — practice is the best way to make it stick.",
    "es": "Intenta usar esta palabra en tu propia frase hoy — la práctica es la mejor forma de recordarla.",
    "ar": "حاول استخدام هذه الكلمة في جملة خاصة بك اليوم — الممارسة هي أفضل طريقة لتثبيتها في ذاكرتك.",
    "ja": "今日はこの単語を自分の文で使ってみましょう — 練習が定着への一番の近道です。",
    "ru": "Попробуйте сегодня использовать это слово в своём собственном предложении — практика лучше всего помогает запомнить.",
    "fr": "Essaie d'utiliser ce mot dans ta propre phrase aujourd'hui — la pratique est le meilleur moyen de le retenir.",
    "it": "Prova a usare questa parola in una tua frase oggi — la pratica è il modo migliore per ricordarla.",
    "de": "Versuche, dieses Wort heute in einem eigenen Satz zu benutzen — Übung ist der beste Weg, es dir zu merken.",
    "pt": "Tenta usar esta palavra numa frase tua hoje — a prática é a melhor forma de a fixares.",
}


def _latest_from_daily_word_content(target_lang: str, native_lang: str) -> dict | None:
    base = (
        supabase_admin.table("daily_word_content")
        .select("*")
        .eq("is_active", True)
        .eq("target_lang", target_lang)
        .eq("native_lang", native_lang)
    )

    latest_sent = (
        base.not_.is_("last_sent_at", "null")
        .order("last_sent_at", desc=True)
        .limit(1)
        .execute()
    ).data or []
    if latest_sent:
        return latest_sent[0]

    # Hiç gönderilmemiş -- ilk seçilecek kaydı önizle (en eski oluşturulan).
    oldest_created = (
        base.order("created_at", desc=False).limit(1).execute()
    ).data or []
    return oldest_created[0] if oldest_created else None


def _latest_from_general_pool(target_lang: str, native_lang: str) -> dict | None:
    base = (
        supabase_admin.table("general_word_pool")
        .select("*")
        .eq("is_active", True)
        .eq("source_lang", target_lang)
        .eq("target_lang", native_lang)
    )

    latest_sent = (
        base.not_.is_("last_sent_at", "null")
        .order("last_sent_at", desc=True)
        .limit(1)
        .execute()
    ).data or []
    row = latest_sent[0] if latest_sent else None
    if not row:
        oldest_created = (
            base.order("created_at", desc=False).limit(1).execute()
        ).data or []
        row = oldest_created[0] if oldest_created else None
    if not row:
        return None

    tip = _POOL_TIP_BY_NATIVE_LANG.get(native_lang, _POOL_TIP_BY_NATIVE_LANG["en"])
    return {
        "word": row["word"],
        "meaning_target": row.get("definition") or row["word"],
        "meaning_native": row["meaning"],
        "example_1_target": row.get("example") or "",
        "example_1_native": "",
        "grammar_note_native": tip,
        "level": None,
        "target_lang": target_lang,
        "native_lang": native_lang,
        "source": "general_word_pool",
    }


def get_word_of_the_day(target_lang: str, native_lang: str) -> dict | None:
    """Kullanıcının dashboard'ında göstereceği 'günün kelimesi' -- HİÇBİR
    satırı güncellemez (last_sent_at rotasyonu SADECE send_daily_word_email.py
    cron'una ait)."""
    row = _latest_from_daily_word_content(target_lang, native_lang)
    if row:
        return {
            "word": row["word"],
            "meaning_target": row.get("meaning_target"),
            "meaning_native": row.get("meaning_native"),
            "example_1_target": row.get("example_1_target"),
            "example_1_native": row.get("example_1_native"),
            "grammar_note_native": row.get("grammar_note_native"),
            "level": row.get("level"),
            "target_lang": target_lang,
            "native_lang": native_lang,
            "source": "daily_word_content",
        }
    return _latest_from_general_pool(target_lang, native_lang)
