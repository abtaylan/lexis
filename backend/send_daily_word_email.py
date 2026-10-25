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

"HER 2 GÜNDE BİR" + YDS/YÖKDİL SORUSU GÜNCELLEMESİ (13 Ekim 2026, kullanıcı
isteği: "günün kelimesi mailini üye sayısını ele alarak 2 günde bir
gönderelim ... YDS ve Yökdil tarzı soru olsun, soruyu cevaplamak
istediklerinde telegram kanalına yönlensin"):

  1) KOTA KORUMASI — ÜYE SAYISINA GÖRE OTOMATİK KADEME: tek bir Resend/SMTP
     hesabının GÜNLÜK gönderim kotası sabit olduğu için (bkz. kullanıcıyla
     bu konuda konuşulan Resend/Brevo fiyat-performans analizi), üye sayısı
     arttıkça "herkese her gün" modeli kotayı aşma riski taşıyor. Bunun için
     kullanıcılar _cohort_count kadar gruba (hash tabanlı, kullanıcı ID'sine
     göre SABİT — bir kullanıcı hep aynı grupta kalır) bölünüyor ve her gün
     SADECE o günün sırası gelen grup e-posta alıyor. Uygun kullanıcı sayısı
     _SAFE_DAILY_EMAIL_CAP'in altındaysa grup sayısı 1 (eski davranış: hepsine
     her gün); üstündeyse grup sayısı üye sayısına göre otomatik büyüyor
     (örn. 127 üye, kap=90 -> 2 grup -> "2 günde bir"; üye sayısı ileride
     300'e çıkarsa -> 4 grup -> "4 günde bir" gibi otomatik kademelenir).
     Böylece kullanıcı "üye sayısını ele alarak" demişken kastettiği şey
     tam olarak budur: sabit "2 günde bir" değil, üye sayısıyla BİRLİKTE
     ölçeklenen bir kadans.
     _SAFE_DAILY_EMAIL_CAP değeri şu an ihtiyatlı bir tahmin (90) -- gerçek
     Resend/Brevo planı netleşince (kullanıcıyla konuşulan Pro/Brevo kararı)
     bu sayı güncellenmeli.

  2) AYLIK RAPORLA ÇARPIŞMA KORUMASI: backend/monthly_user_report.py her ayın
     _MONTHLY_REPORT_DAY_OF_MONTH gününde TÜM aktif kullanıcılara kendi
     e-postasını gönderiyor (bkz. o dosya + cron.py::run_monthly_user_report).
     Aynı gün günün kelimesi de gönderilirse o günün kotası iki e-posta
     türü yüzünden katlanır -- kullanıcının net uyarısı buydu ("günün
     kelimesi maili atılırken rapor maili de atılırsa o günün kotası
     aşmış olur"). Bu yüzden main() o gün günün kelimesi gönderimini TAMAMEN
     atlıyor (sadece o 1 gün -- ertesi gün kohort sırasına normal devam
     eder, kimse kelime kaybetmez, sadece 1 gün ötelenir).

  3) GÜNÜN SORUSU + TELEGRAM CTA (23 Ekim 2026 güncellemesi, kullanıcı
     isteği: "günün kelimesi ile birlikte telegramda günün sorusu paylaşımı
     oluyordu, günün kelimesi ile birlikte günün sorusu da mail içine
     eklensin ... sorunun cevabına tıklayınca telegram kanalına
     yönlendirecektik"): ÖNCEKİ yaklaşım (kelimeyle exam_questions.
     related_words etiket eşleştirmesi, bkz. eski _find_exam_question)
     neredeyse hiç eşleşme bulmuyordu çünkü soru havuzu kelime değil KONU
     bazlı etiketli. Artık bunun yerine o gün Telegram kanalına GERÇEKTEN
     paylaşılmış olan soru (post_daily_content.py::_post_question'ın
     social_posts tablosuna yazdığı 'quiz' ya da 'exam_question' satırı)
     doğrudan okunup maile ekleniyor (bkz. _todays_telegram_question) --
     mailde görünen soru artık Telegram'da o gün paylaşılanla BİREBİR AYNI.
     Bu sadece (native=tr, target=en) kullanıcıları için anlamlıdır (Telegram
     kanalı hep bu dil çifti için paylaşım yapıyor, bkz. social_content.py);
     diğer dil çiftlerine (ar->tr, es->tr, vb.) soru bölümü hiç eklenmez.
     O gün için henüz Telegram'a bir şey paylaşılmadıysa (post-daily-content
     cron'u bu mail cron'undan sonra çalıştıysa) da aynı şekilde soru bölümü
     atlanır -- soru asla uydurulmaz. Soru bulunduğunda şıklar gösterilir ama
     doğru cevap mailde YAZILMAZ -- kullanıcı cevabı görmek isterse Telegram
     kanalımıza (bkz. email_service.py::_TELEGRAM_CHANNEL_URL) yönlendirilir;
     orada soru Telegram'ın native poll'u olarak durduğu için cevabı
     işaretleyince anında doğru/yanlış görür (bkz. social_publisher.py
     post_quiz_to_telegram/post_exam_question_to_telegram).

send_schedule_reminders.py / post_daily_content.py ile aynı desen: VPS'te
gerçek internet erişimi olan bu backend'e Vercel Cron / GitHub Actions
tarafından secret-korumalı HTTP endpoint (bkz. app/api/routes/cron.py)
üzerinden günde 1 kez tetiklenmesi için tasarlandı — Claude'un cloud
sandbox'ından veya scheduled task'larından SMTP/Resend'e gerçek ağ
erişimi olmadığı için burada da (aynı sebeple) tetiklenemiyor.

Nasıl çalışır:
  1. profiles.email_daily_word_enabled = true VE is_active = true olan
     kullanıcılar (native_lang, learning_lang) çiftine göre gruplanır.
  2. Bugün ayın _MONTHLY_REPORT_DAY_OF_MONTH günüyse (bkz. yukarıdaki 2.
     madde) hiçbir şey göndermeden çıkılır.
  3. Uygun toplam kullanıcı sayısına göre kohort sayısı hesaplanır
     (_cohort_count) ve bugünün kohort indeksi bulunur (_today_cohort_index).
     Her grup, kendi kohortuna denk gelmeyen kullanıcıları filtreler.
  4. Her çift için ÖNCE daily_word_content'te o (target_lang=learning_lang,
     native_lang=native_lang) kombinasyonuna ait, is_active=true bir kelime
     aranır: önce hiç gönderilmemiş (last_sent_at IS NULL) kayıtlardan en
     eski eklenen, yoksa en eski gönderilmiş kayıt (last_sent_at ASC).
  5. Orada içerik yoksa general_word_pool'da (source_lang=learning_lang,
     target_lang=native_lang) aynı rotasyon mantığıyla bir kelime aranır ve
     email_service'in beklediği alan adlarına eşlenir (definition -> anlam,
     meaning -> çeviri, example -> tek örnek cümle, dilbilgisi notu yerine
     genel bir çalışma ipucu).
  6. İkisinde de yoksa grup atlanır ve log'a yazılır (hata sayılmaz — artık
     sadece hiçbir kelime havuzunda o dil çifti tanımlı değilse olur, ki
     10 dilin birbiriyle tüm kombinasyonu general_word_pool'da olduğu için
     pratikte artık HİÇBİR gerçek dil çifti atlanmaz).
  7. Seçilen kelimeyle eşleşen bir YDS/YÖKDİL sorusu varsa bulunur (bkz. 3.
     madde) — grup/kelime bazında TEK sefer, kullanıcı başına değil.
  8. Bugünkü kohorta denk gelen kullanıcılara send_daily_word_email() ile
     mail atılır.
  9. Kullanılan kelimenin last_sent_at'i, geldiği tabloda (daily_word_content
     veya general_word_pool) bir kez güncellenir.

16 EYLÜL 2026 BUG DÜZELTMESİ (Resend paneli incelemesinde keşfedildi: bounce
oranı %71'e fırlamıştı): simulate_bot_activity.py'nin 10 Eylül'de oluşturduğu
119 sahte "bot" hesabı (profiles.is_bot=true, e-postaları
@bots.lexis.internal — gerçekte teslim edilemez) bu sorguda hiç
filtrelenmiyordu, her gün hepsine "günün kelimesi" e-postası gönderilmeye
çalışılıyor ve hepsi bounce ediyordu (Resend'de 10 Eylül'den itibaren
görülen ani bounce artışının kök nedeni buydu). Artık sorguya
.eq("is_bot", False) eklendi.

Kullanım (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python send_daily_word_email.py
"""

import hashlib
import math
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

# backend/monthly_user_report.py'nin tüm kullanıcılara toplu gönderim yaptığı
# ayın günü (bkz. .github/workflows/monthly-user-report.yml cron: "... 1 * *").
# Bu gün günün kelimesi hiç gönderilmez (bkz. dosya başı not, madde 2).
_MONTHLY_REPORT_DAY_OF_MONTH = 1

# Tek bir gönderici hesabın (Resend/SMTP) güvenli günlük e-posta payı --
# diğer transactional maillere (OTP, bildirimler, hatırlatmalar vb.) de yer
# kalsın diye kasıtlı olarak toplam kotanın tamamı değil, ihtiyatlı bir alt
# sınır. NOT: şu an gerçek sağlayıcı planına göre KALİBRE EDİLMEDİ -- Resend
# Pro/Brevo kararı netleşince bu sayı gözden geçirilmeli.
_SAFE_DAILY_EMAIL_CAP = 90


def _cohort_count(eligible_count: int) -> int:
    """Üye sayısına göre kaç güne bir gönderileceğini belirler. Kap altındaysa
    1 (eski davranış -- herkese her gün); üstündeyse üye sayısıyla orantılı
    büyüyen bir kohort sayısı (2 -> 2 günde bir, 3 -> 3 günde bir, ...)."""
    if eligible_count <= _SAFE_DAILY_EMAIL_CAP:
        return 1
    return max(2, math.ceil(eligible_count / _SAFE_DAILY_EMAIL_CAP))


def _cohort_of(user_id: str, cohort_count: int) -> int:
    """Kullanıcıyı SABİT bir kohorta atar (ID'den hash) -- her çalıştırmada
    aynı kullanıcı hep aynı kohortta olur, böylece "her N günde bir" kullanıcı
    bazında tutarlı kalır."""
    digest = hashlib.sha256(user_id.encode()).hexdigest()
    return int(digest, 16) % cohort_count


def _today_cohort_index(cohort_count: int) -> int:
    return datetime.now(UTC).date().toordinal() % cohort_count


# Telegram kanalındaki günlük soru paylaşımı hep (native=tr, target=en)
# dil çifti için yapılıyor (bkz. app/services/social_content.py
# SOURCE_LANG/TARGET_LANG, DAILY_WORD_TARGET_LANG/NATIVE_LANG -- Telegram
# kanalı Türkçe konuşan İngilizce öğrencilerine özel). Bu yüzden mail
# tarafında da soru bölümü sadece bu çift için eklenir.
_TELEGRAM_QUESTION_NATIVE_LANG = "tr"
_TELEGRAM_QUESTION_TARGET_LANG = "en"


def _todays_telegram_question() -> dict | None:
    """23 Ekim 2026, Behçet'in kullanıcı isteği -- "günün kelimesi ile
    birlikte telegramda günün sorusu paylaşımı oluyordu, günün kelimesi ile
    birlikte günün sorusu da mail içine eklensin ... sorunun cevabına
    tıklayınca telegram kanalına yönlendirecektik": önceki _find_exam_question
    yaklaşımı (kelimeyle etiket eşleştirme) neredeyse hiç eşleşme bulmuyordu
    (bkz. eski docstring madde 3). Bunun yerine artık bugün Telegram'a
    (post_daily_content.py::_post_question tarafından) GERÇEKTEN paylaşılmış
    olan AYNI soru social_posts tablosundan okunuyor -- böylece mailde
    gösterilen soru, Telegram kanalında o gün paylaşılanla birebir aynı olur.
    Henüz paylaşılmadıysa (örn. post-daily-content cron'u bu mail cron'undan
    sonra çalıştıysa) None döner -- bu durumda eski davranışla aynı şekilde
    o günün e-postasına soru bölümü hiç eklenmez.

    social_posts.options hem 'quiz' hem 'exam_question' satırlarında DÜZ
    METİN listesi olarak tutuluyor (bkz. social_content.py pick_quiz/
    pick_exam_question) -- email_service.py::send_daily_word_email ise
    exam_question['options']'ı {"text": ...} sözlük listesi bekliyor, bu
    yüzden burada normalize ediliyor. Doğru cevap (correct_answer) BİLEREK
    maile dahil edilmiyor -- kullanıcı cevabı görmek isterse Telegram
    kanalındaki native poll'a yönlendiriliyor (bkz. email_service.py
    _TELEGRAM_CHANNEL_URL + 'exam_cta').
    """
    try:
        rows = (
            supabase_admin.table("social_posts")
            .select("content_type, question_text, options, exam_type")
            .eq("post_date", datetime.now(UTC).date().isoformat())
            .in_("content_type", ["quiz", "exam_question"])
            .limit(1)
            .execute()
        ).data or []
    except Exception as e:
        print(f"DAILY WORD telegram question lookup warning: {e}")
        return None
    if not rows:
        return None

    row = rows[0]
    raw_options = row.get("options") or []
    options = [{"text": opt} if isinstance(opt, str) else opt for opt in raw_options]
    return {
        "question_text": row.get("question_text") or "",
        "options": options,
        "exam_type": row.get("exam_type"),
    }


def _pick_from_daily_word_content(target_lang: str, native_lang: str) -> dict | None:
    # 25 EKİM 2026 BUG DÜZELTMESİ (kullanıcı raporu: "Günün kelimesi dashboard'da
    # uzun süredir değişmiyor" -- kök neden burada bulundu): supabase-py/
    # postgrest'te her filtre/sıralama çağrısı (eq/is_/order/...) builder'ı
    # YERİNDE (in-place) değiştirip (self.request.params = ...add(...)) kendini
    # döndürüyor -- yani aynı `base` nesnesini iki ayrı sorgu için zincirlemek,
    # İKİNCİ sorguya da BİRİNCİ sorgunun filtresini sessizce taşıyordu. Burada
    # "never_sent" sorgusunun `is_("last_sent_at", "null")` filtresi, onu takip
    # eden "oldest_sent" sorgusuna da sızıyordu -- yani bu dil çiftindeki TÜM
    # kayıtlar en az bir kez gönderilip never_sent sorgusu boş döndüğü anda,
    # "oldest_sent" sorgusu da hâlâ last_sent_at IS NULL arıyor olduğu için HER
    # ZAMAN boş dönüyor, fonksiyon yanlışlıkla None dönüp cron'u
    # general_word_pool'a düşürüyordu -- daily_word_content'teki (özenle
    # hazırlanmış) kayıtlar bir kez tüketildikten sonra BİR DAHA HİÇ tekrar
    # kullanılmıyordu. Canlıda tam olarak bu yaşanmıştı: en->tr çifti 22
    # Ekim'de tükendi, 23 Ekim'den beri sessizce general_word_pool'a geçmişti
    # (dashboard'ın hâlâ 22 Ekim'in son kaydını göstermesinin de sebebi --
    # bkz. word_of_the_day_service.py'deki eşlik eden düzeltme). Çözüm: her
    # sorgu için AYRI, taze bir builder (`_base()`) oluşturuluyor, bir sorgunun
    # filtresi asla bir sonrakine sızmıyor.
    def _base():
        return (
            supabase_admin.table("daily_word_content")
            .select("*")
            .eq("is_active", True)
            .eq("target_lang", target_lang)
            .eq("native_lang", native_lang)
        )

    never_sent = (
        _base().is_("last_sent_at", "null").order("created_at", desc=False).limit(1).execute()
    ).data or []
    if never_sent:
        return never_sent[0]

    oldest_sent = (
        _base().order("last_sent_at", desc=False).limit(1).execute()
    ).data or []
    return oldest_sent[0] if oldest_sent else None


def _pick_from_general_pool(target_lang: str, native_lang: str) -> dict | None:
    # general_word_pool.source_lang = kelimenin kendi dili (= öğrenilen dil),
    # general_word_pool.target_lang = çeviri dili (= ana dil) — daily_word_content
    # ile isimlendirme yönü ters olduğu için burada eşlemeye dikkat.
    #
    # 25 Ekim 2026: _pick_from_daily_word_content'teki builder-mutation bug'ı
    # (yukarıdaki uzun not) burada da aynen vardı -- general_word_pool bu
    # çift için henüz tükenmediği için (havuz çok daha büyük, 303 kelime/çift)
    # canlıda gözlemlenmedi, ama aynı kusuru taşıyordu ve havuz tükendiğinde
    # aynı şekilde kırılacaktı. Aynı düzeltme: her sorgu için taze bir builder.
    def _base():
        return (
            supabase_admin.table("general_word_pool")
            .select("*")
            .eq("is_active", True)
            .eq("source_lang", target_lang)
            .eq("target_lang", native_lang)
        )

    never_sent = (
        _base().is_("last_sent_at", "null").order("created_at", desc=False).limit(1).execute()
    ).data or []
    row = never_sent[0] if never_sent else None
    if not row:
        oldest_sent = (
            _base().order("last_sent_at", desc=False).limit(1).execute()
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
    if datetime.now(UTC).day == _MONTHLY_REPORT_DAY_OF_MONTH:
        print(
            f"[DAILY-WORD] Bugün ayın {_MONTHLY_REPORT_DAY_OF_MONTH}. günü -- "
            "aylık kullanıcı raporu tüm kullanıcılara gidiyor, kota çarpışmasını "
            "önlemek için günün kelimesi bugün atlanıyor."
        )
        return {"sent_count": 0, "pairs": {}, "skipped_reason": "monthly_user_report_day"}

    profiles = (
        supabase_admin.table("profiles")
        .select("id, native_lang, learning_lang")
        .eq("is_active", True)
        .eq("email_daily_word_enabled", True)
        .eq("is_bot", False)
        .execute()
    ).data or []

    if not profiles:
        print("Günün kelimesi e-postasına açık aktif kullanıcı yok.")
        return {"sent_count": 0, "pairs": {}}

    cohort_count = _cohort_count(len(profiles))
    today_cohort = _today_cohort_index(cohort_count)
    print(
        f"[DAILY-WORD] {len(profiles)} uygun kullanıcı, kohort sayısı={cohort_count} "
        f"(kullanıcı başına ~{cohort_count} günde 1 kelime), bugünün kohortu={today_cohort}."
    )

    # Günün Telegram sorusu TÜM (tr->en) kullanıcılar için AYNI -- grup
    # başına değil, tek sefer hesaplanır (bkz. _todays_telegram_question).
    telegram_question = _todays_telegram_question()

    eligible_profiles = [
        p for p in profiles if _cohort_of(p["id"], cohort_count) == today_cohort
    ]

    # (native_lang, learning_lang) -> [user_id, ...] -- SADECE bugünün kohortu.
    groups: dict[tuple[str, str], list[str]] = defaultdict(list)
    for p in eligible_profiles:
        native = (p.get("native_lang") or "tr").lower()
        target = (p.get("learning_lang") or "en").lower()
        groups[(native, target)].append(p["id"])

    all_eligible_ids = {p["id"] for p in eligible_profiles}

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

        exam_question = (
            telegram_question
            if (native_lang, target_lang) == (_TELEGRAM_QUESTION_NATIVE_LANG, _TELEGRAM_QUESTION_TARGET_LANG)
            else None
        )

        sent = 0
        for user_id in user_ids:
            email = email_map.get(user_id)
            if not email:
                continue
            send_daily_word_email(email, user_id, word, exam_question)
            sent += 1

        supabase_admin.table(word["_source_table"]).update(
            {"last_sent_at": datetime.now(UTC).isoformat()}
        ).eq("id", word["id"]).execute()

        total_sent += sent
        pair_results[pair_key] = {
            "sent": sent,
            "word": word["word"],
            "source": word["_source_table"],
            "exam_question_matched": bool(exam_question),
        }
        print(
            f"[{datetime.now(UTC).isoformat()}] '{pair_key}' ({word['_source_table']}): günün kelimesi "
            f"'{word['word']}' {sent} kullanıcıya gönderildi (soru eşleşti={bool(exam_question)})."
        )

    return {
        "sent_count": total_sent,
        "pairs": pair_results,
        "cohort_count": cohort_count,
        "today_cohort": today_cohort,
        "eligible_total": len(profiles),
    }


if __name__ == "__main__":
    with job_run("send_daily_word_email") as run:
        result = main()
        run.detail = result