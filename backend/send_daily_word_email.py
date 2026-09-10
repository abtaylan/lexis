"""
backend/send_daily_word_email.py

Kullanıcı isteği (6 Eylül 2026): her gün üyelerin kayıtlı e-postasına,
öğrendikleri dile ait kelime + anlam + 2 örnek cümle (+ ana dillerine
çevirisi) ve o dile özgü YDS/YÖKDİL/TOEFL tarzı dilbilgisi analizi içeren
bir "günün kelimesi" e-postası gönderir.

ÇOK DİLLİ GÜNCELLEME (6 Eylül 2026, migration 020): İçerik artık sadece
İngilizce/Türkçe değil — her kullanıcı hangi dili öğreniyorsa (profiles.
learning_lang) o dilde kelime alır, e-postanın çevresel metni de kullanıcının
ana dilinde (profiles.native_lang) gösterilir (bkz. email_service.py::
send_daily_word_email). Kullanıcılar (native_lang, learning_lang) çiftine
göre gruplanır; her grup için önce daily_word_content'ten o çifte uygun bir
kelime seçilir.

"10 DİLİN TÜMÜ" GÜNCELLEMESİ (6 Eylül 2026, kullanıcı isteği: "sistemde 10
farklı dil var, mail içeriği de buna göre olmalı ... genel havuzda bulunan
kelimeler mail içeriğinde kullanılabilir"): daily_word_content'te elle
hazırlanmış içerik olmayan (native_lang, learning_lang) çiftleri için artık
BOŞ GEÇİLMİYOR — general_word_pool tablosundan (kelime tahmin oyunu için
zaten var olan, 10 dilin birbiriyle her kombinasyonu x 303 kelimelik havuz,
bkz. migration 021) bir kelime seçilip yedek içerik olarak kullanılıyor.
general_word_pool'da sadece TEK örnek cümle ve dilbilgisi notu değil genel
bir çalışma ipucu olduğu için (bkz. email_service.py::_DAILY_WORD_UI_STRINGS
'tip' anahtarı), bu içerik daily_word_content'teki zenginlikte değil ama
her dil çifti için gerçek, sözlük kalitesinde kelime + anlam + örnek cümle
sağlıyor.

send_schedule_reminders.py / post_daily_content.py ile aynı desen: VPS'te
gerçek internet erişimi olan bu backend'e Vercel Cron / GitHub Actions
tarafından secret-korumalı HTTP endpoint (bkz. app/api/routes/cron.py)
üzerinden günde 1 kez tetiklenmesi için tasarlandı — Claude'un cloud
sandbox'ından veya scheduled task'larından SMTP/Resend'e gerçek ağ
erişimi olmadığı için burada da (aynı sebeple) tetiklenemiyor.

Nasıl çalışır:
  1. profiles.email_daily_word_enabled = true VE is_active = true olan
     kullanıcılar (native_lang, learning_lang) çiftine göre gruplanır.
  2. Her çift için ÖNCE daily_word_content'te o (target_lang=learning_lang,
     native_lang=native_lang) kombinasyonuna ait, is_active=true bir kelime
     aranır: önce hiç gönderilmemiş (last_sent_at IS NULL) kayıtlardan en
     eski eklenen, yoksa en eski gönderilmiş kayıt (last_sent_at ASC).
  3. Orada içerik yoksa general_word_pool'da (source_lang=learning_lang,
     target_lang=native_lang) aynı rotasyon mantığıyla bir kelime aranır ve
     email_service'in beklediği alan adlarına eşlenir (definition -> anlam,
     meaning -> çeviri, example -> tek örnek cümle, dilbilgisi notu yerine
     genel bir çalışma ipucu).
  4. İkisinde de yoksa grup atlanır ve log'a yazılır (hata sayılmaz — artık
     sadece hiçbir kelime havuzunda o dil çifti tanımlı değilse olur, ki
     10 dilin birbiriyle tüm kombinasyonu general_word_pool'da olduğu için
     pratikte artık HİÇBİR gerçek dil çifti atlanmaz).
  5. Seçilen kullanıcılara send_daily_word_email() ile mail atılır.
  6. Kullanılan kelimenin last_sent_at'i, geldiği tabloda (daily_word_content
     veya general_word_pool) bir kez güncellenir.

Kullanım (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python send_daily_word_email.py

Not: OTP_MODE=fixed iken (varsayılan/geliştirme) gerçek mail atılmaz,
sadece log'a yazılır — email_service.py'deki diğer fonksiyonlarla aynı
güvenlik/test davranışı (bkz. send_otp_email).
"""

from collections import defaultdict
from datetime import UTC, datetime

from app.core.database import supabase_admin
from app.services.auth_users import list_all_auth_users
from app.services.email_service import send_daily_word_email
from app.services.job_log import job_run

# general_word_pool'dan gelen (dilbilgisi notu olmayan) içerik için gösterilen
# genel çalışma ipucu — native_lang'e göre. email_service.py'deki
# _DAILY_WORD_UI_STRINGS ile aynı 10 dili kapsar; olmayan bir native_lang için
# İngilizce'ye düşülür.
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


def _pick_from_daily_word_content(target_lang: str, native_lang: str) -> dict | None:
    base = (
        supabase_admin.table("daily_word_content")
        .select("*")
        .eq("is_active", True)
        .eq("target_lang", target_lang)
        .eq("native_lang", native_lang)
    )

    never_sent = (
        base.is_("last_sent_at", "null").order("created_at", desc=False).limit(1).execute()
    ).data or []
    if never_sent:
        return never_sent[0]

    oldest_sent = (
        base.order("last_sent_at", desc=False).limit(1).execute()
    ).data or []
    return oldest_sent[0] if oldest_sent else None


def _pick_from_general_pool(target_lang: str, native_lang: str) -> dict | None:
    # general_word_pool.source_lang = kelimenin kendi dili (= öğrenilen dil),
    # general_word_pool.target_lang = çeviri dili (= ana dil) — daily_word_content
    # ile isimlendirme yönü ters olduğu için burada eşlemeye dikkat.
    base = (
        supabase_admin.table("general_word_pool")
        .select("*")
        .eq("is_active", True)
        .eq("source_lang", target_lang)
        .eq("target_lang", native_lang)
    )

    never_sent = (
        base.is_("last_sent_at", "null").order("created_at", desc=False).limit(1).execute()
    ).data or []
    row = never_sent[0] if never_sent else None
    if not row:
        oldest_sent = (
            base.order("last_sent_at", desc=False).limit(1).execute()
        ).data or []
        row = oldest_sent[0] if oldest_sent else None
    if not row:
        return None

    tip = _POOL_TIP_BY_NATIVE_LANG.get(native_lang, _POOL_TIP_BY_NATIVE_LANG["en"])
    return {
        "id": row["id"],
        "word": row["word"],
        "meaning_target": row.get("definition") or row["word"],
        "meaning_native": row["meaning"],
        "example_1_target": row.get("example") or "",
        "example_1_native": "",
        "example_2_target": "",
        "example_2_native": "",
        "grammar_note_native": tip,
        "note_kind": "tip",
        "level": None,
        "target_lang": target_lang,
        "native_lang": native_lang,
        "_source_table": "general_word_pool",
    }


def _pick_word(target_lang: str, native_lang: str) -> dict | None:
    word = _pick_from_daily_word_content(target_lang, native_lang)
    if word:
        word["_source_table"] = "daily_word_content"
        return word
    return _pick_from_general_pool(target_lang, native_lang)


def main() -> dict:
    profiles = (
        supabase_admin.table("profiles")
        .select("id, native_lang, learning_lang")
        .eq("is_active", True)
        .eq("email_daily_word_enabled", True)
        .execute()
    ).data or []

    if not profiles:
        print("Günün kelimesi e-postasına açık aktif kullanıcı yok.")
        return {"sent_count": 0, "pairs": {}}

    # (native_lang, learning_lang) -> [user_id, ...]
    groups: dict[tuple[str, str], list[str]] = defaultdict(list)
    for p in profiles:
        native = (p.get("native_lang") or "tr").lower()
        target = (p.get("learning_lang") or "en").lower()
        groups[(native, target)].append(p["id"])

    all_eligible_ids = {p["id"] for p in profiles}

    # E-posta auth.users'da tutuluyor — send_schedule_reminders.py ile aynı desen.
    email_map: dict[str, str] = {}
    try:
        users = list_all_auth_users()
        for u in users:
            if u.id in all_eligible_ids and u.email:
                email_map[u.id] = u.email
    except Exception as e:
        print(f"DAILY WORD email map warning: {e}")

    total_sent = 0
    pair_results: dict[str, dict] = {}

    for (native_lang, target_lang), user_ids in groups.items():
        pair_key = f"{target_lang}->{native_lang}"
        word = _pick_word(target_lang, native_lang)
        if not word:
            print(f"[DAILY-WORD] '{pair_key}' için ne daily_word_content'te ne general_word_pool'da aktif içerik var, {len(user_ids)} kullanıcı bu turda atlandı.")
            pair_results[pair_key] = {"sent": 0, "word": None, "skipped_no_content": len(user_ids)}
            continue

        sent = 0
        for user_id in user_ids:
            email = email_map.get(user_id)
            if not email:
                continue
            send_daily_word_email(email, user_id, word)
            sent += 1

        supabase_admin.table(word["_source_table"]).update(
            {"last_sent_at": datetime.now(UTC).isoformat()}
        ).eq("id", word["id"]).execute()

        total_sent += sent
        pair_results[pair_key] = {"sent": sent, "word": word["word"], "source": word["_source_table"]}
        print(f"[{datetime.now(UTC).isoformat()}] '{pair_key}' ({word['_source_table']}): günün kelimesi '{word['word']}' {sent} kullanıcıya gönderildi.")

    return {"sent_count": total_sent, "pairs": pair_results}


if __name__ == "__main__":
    with job_run("send_daily_word_email") as run:
        result = main()
        run.detail = result
