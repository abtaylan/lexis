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

25 EKİM 2026 BUG DÜZELTMESİ (kullanıcı raporu: "Günün kelimesi dashboard'da
uzun süredir değişmiyor"): Önceki sürüm, daily_word_content'te last_sent_at
dolu HERHANGİ bir kayıt bulduğu anda -- o kayıt ne kadar eski olursa olsun --
onu doğrudan dönüyor, general_word_pool'a HİÇ bakmıyordu. Bu dil çiftinin
daily_word_content havuzu 22 Ekim'de tükenince (ayrı bir bug yüzünden, bkz.
send_daily_word_email.py::_pick_from_daily_word_content'teki uzun not --
havuzdaki tüm kayıtlar bir kez gönderildikten sonra "oldest_sent" sorgusu
yanlışlıkla hep boş dönüyor ve cron'u sessizce general_word_pool'a
düşürüyordu) cron 23 Ekim'den beri gerçekte general_word_pool'dan kelime
gönderiyordu (23'ü "house", 24'ü "water", 25'i "food") ama bu widget hâlâ
22 Ekim'in son daily_word_content kaydını ("credible") göstermeye devam
ediyordu -- çünkü ilk denediği tablo (daily_word_content) "boş değil"
diye hemen onu dönüyor, iki tablo arasında hangisi GERÇEKTEN daha yeni
diye hiç karşılaştırmıyordu. Artık her iki tablodaki "en son gönderilen"
aday ayrı ayrı bulunuyor ve last_sent_at'i DAHA YENİ olan kazanıyor --
cron hangi tabloyu kullanıyorsa widget da artık onu yansıtıyor, kaynak
tablo ne olursa olsun.
"""

from datetime import datetime

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


def _parse_ts(value: str) -> datetime:
    """Supabase'den gelen ISO-8601 timestamp string'ini karşılaştırılabilir bir
    datetime'a çevirir (Python 3.11+ fromisoformat zaten 'Z' sonekini
    destekliyor)."""
    return datetime.fromisoformat(value)


def _daily_word_content_query(target_lang: str, native_lang: str):
    # NOT: Her çağrı TAZE bir builder döndürür -- aynı builder'ı iki farklı
    # sorgu için paylaşmak (bkz. send_daily_word_email.py'deki 25 Ekim 2026
    # notu) bir sorgunun filtresini diğerine sızdırıyordu. Bu dosyada her
    # fonksiyon kendi builder'ını kendi oluşturur, hiçbiri paylaşılmaz.
    return (
        supabase_admin.table("daily_word_content")
        .select("*")
        .eq("is_active", True)
        .eq("target_lang", target_lang)
        .eq("native_lang", native_lang)
    )


def _general_pool_query(target_lang: str, native_lang: str):
    # general_word_pool.source_lang = kelimenin kendi dili (= öğrenilen dil),
    # general_word_pool.target_lang = çeviri dili (= ana dil) — daily_word_content
    # ile isimlendirme yönü ters olduğu için burada eşlemeye dikkat (bkz.
    # send_daily_word_email.py::_pick_from_general_pool'daki aynı not).
    return (
        supabase_admin.table("general_word_pool")
        .select("*")
        .eq("is_active", True)
        .eq("source_lang", target_lang)
        .eq("target_lang", native_lang)
    )


def _latest_sent_daily_word_content(target_lang: str, native_lang: str) -> dict | None:
    """Bu çift için daily_word_content'te şu ana kadar EN SON gönderilmiş
    (last_sent_at dolu) kaydı döner -- hiç gönderilmemişse None."""
    rows = (
        _daily_word_content_query(target_lang, native_lang)
        .not_.is_("last_sent_at", "null")
        .order("last_sent_at", desc=True)
        .limit(1)
        .execute()
    ).data or []
    return rows[0] if rows else None


def _latest_sent_general_pool(target_lang: str, native_lang: str) -> dict | None:
    """general_word_pool için aynısı -- hiç gönderilmemişse None."""
    rows = (
        _general_pool_query(target_lang, native_lang)
        .not_.is_("last_sent_at", "null")
        .order("last_sent_at", desc=True)
        .limit(1)
        .execute()
    ).data or []
    return rows[0] if rows else None


def _preview_daily_word_content(target_lang: str, native_lang: str) -> dict | None:
    """İkisinde de hiç gönderim yoksa: send_daily_word_email.py'nin İLK
    seçeceği (en eski oluşturulan) daily_word_content kaydı."""
    rows = (
        _daily_word_content_query(target_lang, native_lang)
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    ).data or []
    return rows[0] if rows else None


def _preview_general_pool(target_lang: str, native_lang: str) -> dict | None:
    """Aynısı general_word_pool için."""
    rows = (
        _general_pool_query(target_lang, native_lang)
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    ).data or []
    return rows[0] if rows else None


def _format_daily_word_content(row: dict, target_lang: str, native_lang: str) -> dict:
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


def _format_general_pool(row: dict, target_lang: str, native_lang: str) -> dict:
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
    cron'una ait). İki olası kaynaktan (daily_word_content, general_word_pool)
    HANGİSİ GERÇEKTEN daha yeni gönderilmişse onu döner -- bkz. dosya başı
    25 Ekim 2026 notu."""
    dwc_row = _latest_sent_daily_word_content(target_lang, native_lang)
    pool_row = _latest_sent_general_pool(target_lang, native_lang)

    if dwc_row and pool_row:
        dwc_is_newer = _parse_ts(dwc_row["last_sent_at"]) >= _parse_ts(pool_row["last_sent_at"])
        winner, source = (dwc_row, "daily_word_content") if dwc_is_newer else (pool_row, "general_word_pool")
    elif dwc_row:
        winner, source = dwc_row, "daily_word_content"
    elif pool_row:
        winner, source = pool_row, "general_word_pool"
    else:
        winner, source = None, None

    if winner is not None:
        if source == "daily_word_content":
            return _format_daily_word_content(winner, target_lang, native_lang)
        return _format_general_pool(winner, target_lang, native_lang)

    # İkisinde de hiç gönderim yapılmamış (havuzlar yeni seed edilmiş, cron hiç
    # çalışmamış) -- send_daily_word_email.py'nin İLK seçeceği kaydı önizle.
    preview = _preview_daily_word_content(target_lang, native_lang)
    if preview:
        return _format_daily_word_content(preview, target_lang, native_lang)
    preview = _preview_general_pool(target_lang, native_lang)
    if preview:
        return _format_general_pool(preview, target_lang, native_lang)
    return None