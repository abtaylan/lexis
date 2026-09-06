import smtplib
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.core.config import settings
from app.core.tokens import make_action_token
from app.services.notification_log import log_notification


def _send_via_resend(to_email: str, subject: str, html_body: str) -> None:
    """
    Resend HTTPS API'si ile mail gönderir (port 443) — RESEND_API_KEY doluysa
    tercih edilen yol, çünkü Railway'den ham SMTP (587) bağlantıları
    engelleniyor. Başarısızlıkta exception fırlatır, çağıran yakalar.
    """
    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
        json={
            "from": settings.RESEND_FROM_EMAIL or f"{settings.SMTP_FROM_NAME} <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        },
        timeout=15,
    )
    resp.raise_for_status()


class _IPv4SMTP(smtplib.SMTP):
    """
    smtplib.SMTP, ama bağlantıyı HER ZAMAN IPv4 üzerinden açar.

    31 Ağustos 2026 — production'da TÜM OTP e-postaları "[Errno 101] Network
    is unreachable" ile başarısız oluyordu (bkz. notification_log tablosu).
    Bu hata, standart socket.create_connection'ın smtp.gmail.com için önce
    IPv6 adresini denemesi ama Railway container'ının IPv6 rotası olmaması
    yüzünden anında oluşuyor — Railway'de bilinen bir davranış. IPv4'e
    zorlamak bu class'ın tek amacı; TLS/HELO hostname'i (settings.SMTP_HOST)
    değişmediği için sertifika doğrulaması etkilenmiyor.
    """

    def _get_socket(self, host, port, timeout):
        err = None
        for family, socktype, proto, _canonname, sockaddr in socket.getaddrinfo(
            host, port, socket.AF_INET, socket.SOCK_STREAM
        ):
            sock = None
            try:
                sock = socket.socket(family, socktype, proto)
                if timeout is not None:
                    sock.settimeout(timeout)
                sock.connect(sockaddr)
                return sock
            except OSError as e:
                err = e
                if sock is not None:
                    sock.close()
        raise err or OSError(f"{host} için IPv4 adresi bulunamadı")


def send_otp_email(to_email: str, code: str, purpose: str) -> None:
    """
    OTP kodunu e-posta ile gönderir.

    OTP_MODE=fixed (test/geliştirme) iken hiçbir mail atılmaz, kod sadece
    backend log'una yazılır — böylece gerçek bir e-posta kutusu olmayan test
    hesapları da rahatça giriş/kayıt olabilir (kod her zaman "123456").
    OTP_MODE=real (production) iken SMTP üzerinden gerçek e-posta gönderilir.

    purpose: "login" | "register" | "reset_password"
    """
    is_test = bool(settings.OTP_TEST_EMAIL_SUFFIX) and to_email.lower().endswith(settings.OTP_TEST_EMAIL_SUFFIX.lower())
    if settings.OTP_MODE != "real" or is_test:
        print(f"[OTP-DEV] {to_email} ({purpose}) → kod: {code}")
        log_notification("email", "otp", to_email, "skipped", {"purpose": purpose, "reason": "OTP_MODE=fixed"})
        return

    if not settings.RESEND_API_KEY and (not settings.SMTP_USER or not settings.SMTP_PASSWORD):
        print(f"[OTP] Mail sağlayıcısı ayarlanmamış (RESEND_API_KEY/SMTP boş), kod gönderilemedi: {to_email} → {code}")
        log_notification("email", "otp", to_email, "failed", {"purpose": purpose, "reason": "no email provider configured"})
        return

    if purpose == "login":
        subject = "Lexis Giriş Doğrulama Kodu"
        action_text = "Giriş yapmak için"
    elif purpose == "reset_password":
        subject = "Lexis Şifre Sıfırlama Kodu"
        action_text = "Şifreni sıfırlamak için"
    else:
        subject = "Lexis Hesabını Doğrula"
        action_text = "Hesabını doğrulamak için"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#0284c7; margin-bottom: 4px;">Lexis</h2>
      <p style="color:#334155; font-size: 15px;">
        {action_text} aşağıdaki kodu kullan:
      </p>
      <p style="font-size: 34px; font-weight: bold; letter-spacing: 10px; color:#0f172a; margin: 20px 0;">
        {code}
      </p>
      <p style="color:#64748b; font-size: 13px;">
        Bu kod {settings.OTP_EXPIRE_MINUTES} dakika geçerlidir. Bu isteği sen yapmadıysan
        bu e-postayı yok sayabilirsin.
      </p>
    </div>
    """

    if settings.RESEND_API_KEY:
        try:
            _send_via_resend(to_email, subject, html_body)
            log_notification("email", "otp", to_email, "sent", {"purpose": purpose, "via": "resend"})
        except Exception as e:
            print(f"OTP EMAIL SEND ERROR via Resend ({to_email}): {e}")
            log_notification("email", "otp", to_email, "failed", {"purpose": purpose, "error": str(e), "via": "resend"})
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with _IPv4SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        log_notification("email", "otp", to_email, "sent", {"purpose": purpose, "via": "smtp"})
    except Exception as e:
        print(f"OTP EMAIL SEND ERROR via SMTP ({to_email}): {e}")
        log_notification("email", "otp", to_email, "failed", {"purpose": purpose, "error": str(e), "via": "smtp"})


def send_schedule_reminder_email(to_email: str, activity: str, time_slot: str, lead_label: str) -> None:
    """
    Program (schedule) hatırlatma e-postası — Madde 3a.

    OTP e-postalarıyla aynı SMTP/OTP_MODE altyapısını yeniden kullanır:
    OTP_MODE=fixed iken gerçek mail atılmaz, sadece log'a yazılır. OTP
    e-postalarıyla aynı şekilde (bkz. send_otp_email) içerik her zaman
    Türkçe — kullanıcı arayüz diline göre çeviri yapılmıyor (mevcut
    OTP e-postası da aynı sınırlamaya sahip, tutarlılık için korundu).

    lead_label: kullanıcıya gösterilecek hazır Türkçe metin, örn.
    "15 dakika sonra", "1 saat sonra", "bugün".
    """
    if settings.OTP_MODE != "real":
        print(f"[REMINDER-DEV] {to_email} → '{activity}' ({time_slot}) {lead_label} başlıyor")
        log_notification("email", "schedule_reminder", to_email, "skipped", {"activity": activity, "reason": "OTP_MODE=fixed"})
        return

    if not settings.RESEND_API_KEY and (not settings.SMTP_USER or not settings.SMTP_PASSWORD):
        print(f"[REMINDER] Mail sağlayıcısı ayarlanmamış, hatırlatma gönderilemedi: {to_email} → {activity}")
        log_notification("email", "schedule_reminder", to_email, "failed", {"activity": activity, "reason": "no email provider configured"})
        return

    subject = f"Lexis Hatırlatma: {activity}"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#0284c7; margin-bottom: 4px;">Lexis</h2>
      <p style="color:#334155; font-size: 15px;">
        Program görevin <strong>{lead_label}</strong> başlıyor:
      </p>
      <p style="font-size: 20px; font-weight: bold; color:#0f172a; margin: 16px 0 4px;">
        {activity}
      </p>
      <p style="color:#64748b; font-size: 13px; margin-top: 0;">
        Saat: {time_slot}
      </p>
      <p style="color:#94a3b8; font-size: 12px; margin-top: 20px;">
        Bu hatırlatma tercihini Program sayfasından değiştirebilir veya kapatabilirsin.
      </p>
    </div>
    """

    if settings.RESEND_API_KEY:
        try:
            _send_via_resend(to_email, subject, html_body)
            log_notification("email", "schedule_reminder", to_email, "sent", {"activity": activity, "via": "resend"})
        except Exception as e:
            print(f"REMINDER EMAIL SEND ERROR via Resend ({to_email}): {e}")
            log_notification("email", "schedule_reminder", to_email, "failed", {"activity": activity, "error": str(e), "via": "resend"})
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with _IPv4SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        log_notification("email", "schedule_reminder", to_email, "sent", {"activity": activity, "via": "smtp"})
    except Exception as e:
        print(f"REMINDER EMAIL SEND ERROR via SMTP ({to_email}): {e}")
        log_notification("email", "schedule_reminder", to_email, "failed", {"activity": activity, "error": str(e), "via": "smtp"})


# Günün kelimesi e-postasının çevresel arayüz metinleri (başlık, etiketler,
# buton, abonelikten çıkma cümlesi) — kullanıcının ANA DİLİNE (native_lang)
# göre seçilir. Kelime/örnek cümleler zaten content['target_lang']'da geliyor
# (bkz. migration 020, çok dilli yeniden yapılandırma — 6 Eylül 2026). Bir
# native_lang burada yoksa İngilizce'ye düşülür (fallback).
_DAILY_WORD_UI_STRINGS: dict[str, dict[str, str]] = {
    "tr": dict(subject="Lexis — Günün Kelimesi: {word}", meaning="Anlamı", examples="Örnek Cümleler",
               grammar="📘 Dilbilgisi Notu", tip="💡 İpucu", open_app="Lexis'i Aç", follow_us="Bizi takip et",
               unsub="Bu e-postayı her gün almak istemiyorsan {link} kapatabilirsin.", unsub_link="buradan"),
    "en": dict(subject="Lexis — Word of the Day: {word}", meaning="Meaning", examples="Example Sentences",
               grammar="📘 Grammar Note", tip="💡 Tip", open_app="Open Lexis", follow_us="Follow us",
               unsub="If you don't want to receive this email every day, you can turn it off {link}.", unsub_link="here"),
    "es": dict(subject="Lexis — Palabra del Día: {word}", meaning="Significado", examples="Frases de Ejemplo",
               grammar="📘 Nota Gramatical", tip="💡 Consejo", open_app="Abrir Lexis", follow_us="Síguenos",
               unsub="Si no quieres recibir este correo todos los días, puedes desactivarlo {link}.", unsub_link="aquí"),
    "ar": dict(subject="Lexis — كلمة اليوم: {word}", meaning="المعنى", examples="جمل توضيحية",
               grammar="📘 ملاحظة نحوية", tip="💡 نصيحة", open_app="افتح Lexis", follow_us="تابعنا",
               unsub="إذا كنت لا تريد استلام هذا البريد الإلكتروني كل يوم، يمكنك إيقافه {link}.", unsub_link="من هنا"),
    "ja": dict(subject="Lexis — 今日の単語: {word}", meaning="意味", examples="例文",
               grammar="📘 文法メモ", tip="💡 ヒント", open_app="Lexisを開く", follow_us="フォローする",
               unsub="このメールを毎日受け取りたくない場合は、{link}で解除できます。", unsub_link="こちら"),
    "ru": dict(subject="Lexis — Слово дня: {word}", meaning="Значение", examples="Примеры предложений",
               grammar="📘 Грамматическая заметка", tip="💡 Совет", open_app="Открыть Lexis", follow_us="Подписывайтесь на нас",
               unsub="Если вы не хотите получать это письмо каждый день, вы можете отключить его {link}.", unsub_link="здесь"),
    "fr": dict(subject="Lexis — Mot du Jour : {word}", meaning="Signification", examples="Phrases d'Exemple",
               grammar="📘 Note de Grammaire", tip="💡 Astuce", open_app="Ouvrir Lexis", follow_us="Suivez-nous",
               unsub="Si tu ne veux pas recevoir cet e-mail tous les jours, tu peux le désactiver {link}.", unsub_link="ici"),
    "it": dict(subject="Lexis — Parola del Giorno: {word}", meaning="Significato", examples="Frasi di Esempio",
               grammar="📘 Nota Grammaticale", tip="💡 Consiglio", open_app="Apri Lexis", follow_us="Seguici",
               unsub="Se non vuoi ricevere questa email ogni giorno, puoi disattivarla {link}.", unsub_link="qui"),
    "de": dict(subject="Lexis — Wort des Tages: {word}", meaning="Bedeutung", examples="Beispielsätze",
               grammar="📘 Grammatikhinweis", tip="💡 Tipp", open_app="Lexis öffnen", follow_us="Folge uns",
               unsub="Wenn du diese E-Mail nicht jeden Tag erhalten möchtest, kannst du sie {link} abschalten.", unsub_link="hier"),
    "pt": dict(subject="Lexis — Palavra do Dia: {word}", meaning="Significado", examples="Frases de Exemplo",
               grammar="📘 Nota Gramatical", tip="💡 Dica", open_app="Abrir Lexis", follow_us="Segue-nos",
               unsub="Se não quiseres receber este e-mail todos os dias, podes desativá-lo {link}.", unsub_link="aqui"),
}

# code -> (kendi dilindeki adı, bayrak emoji) — languages tablosuyla aynı veriler.
_LANGUAGE_META: dict[str, tuple[str, str]] = {
    "tr": ("Türkçe", "🇹🇷"), "en": ("English", "🇬🇧"), "es": ("Español", "🇪🇸"),
    "ar": ("العربية", "🇸🇦"), "ja": ("日本語", "🇯🇵"), "ru": ("Русский", "🇷🇺"),
    "fr": ("Français", "🇫🇷"), "it": ("Italiano", "🇮🇹"), "de": ("Deutsch", "🇩🇪"),
    "pt": ("Português", "🇵🇹"),
}

# landing/src/lib/config.ts::SOCIAL_LINKS ile aynı gerçek adresler (6 Eylül
# 2026, kullanıcı isteği: "mail içeriğinde ... sosyal medya linklerimiz de
# olsun, onların iconları olsun"). İkon dosyaları web/public/email-assets/
# altında (kendi çizdiğimiz basit, marka renginde rozet ikonlar — harici bir
# servise bağımlı olmadan, e-posta istemcilerinin güvenilir şekilde
# gösterebileceği PNG'ler). label evrensel özel isim olduğu için dile göre
# çevrilmiyor.
_SOCIAL_LINKS: list[tuple[str, str, str]] = [
    # (icon dosya adı, label, href) — landing Footer.tsx'teki SOCIAL_LINKS ile aynı sıra.
    ("telegram", "Telegram", "https://t.me/lexis_words"),
    ("slack", "Slack", "https://lexis-dsx6779.slack.com/archives/D0BR7D4LC4E"),
    ("youtube", "YouTube", "https://www.youtube.com/channel/UC_csIJCN7WDj-yrLab1iNHw"),
    ("instagram", "Instagram", "https://www.instagram.com/lexisappinfo/"),
    ("x", "X", "https://x.com/lexis_words"),
    ("linkedin", "LinkedIn", "https://www.linkedin.com/in/lexis-words-7a605b430/"),
]


def send_daily_word_email(to_email: str, user_id: str, content: dict) -> None:
    """
    Günün kelimesi e-postası — kullanıcı isteği (6 Eylül 2026, çok dilli
    güncelleme): her gün üyelere kayıtlı e-postalarına, ÖĞRENDİKLERİ dilde
    kelime + anlam + 2 örnek cümle (+ ana dillerine çevirisi) ve o dile özgü
    dilbilgisi analizi içeren öğretici e-posta gönderilir. E-postanın tüm
    çevresel metni (başlık, etiketler, buton, abonelikten çıkma cümlesi)
    kullanıcının ANA DİLİNDE gösterilir (bkz. _DAILY_WORD_UI_STRINGS).

    content: daily_word_content tablosundan gelen bir satır (migration 020) —
    word, meaning_target, meaning_native, example_1_target, example_1_native,
    example_2_target, example_2_native, grammar_note_native, level,
    target_lang, native_lang anahtarlarını içerir. target_lang = kullanıcının
    öğrendiği dil, native_lang = ana dili. example_2_target/native boş
    string olabilir (send_daily_word_email.py'nin general_word_pool
    yedeğinden gelen içerikte tek örnek cümle olur — 6 Eylül 2026, "10
    dilin tümü" güncellemesi) — bu durumda ikinci örnek satırı basılmaz.
    content['note_kind'] == 'tip' ise grammar_note_native bir dilbilgisi
    analizi değil, genel bir çalışma ipucudur (general_word_pool'da
    dilbilgisi notu yok) — bu durumda "📘 Dilbilgisi Notu" yerine
    "💡 İpucu" başlığı kullanılır.

    Diğer e-postalarla aynı OTP_MODE/RESEND/SMTP altyapısını kullanır.
    Ayrıca girişsiz "tek tık" abonelikten çıkma linki içerir (bkz.
    app/core/tokens.py + notifications.py::unsubscribe) — profil
    ayarlarında henüz görsel bir toggle yok, bu link kullanıcının bu
    e-postaları kapatabileceği tek yol. Logo ve sosyal medya ikonları
    (bkz. _SOCIAL_LINKS) web/public/email-assets/ altından, FRONTEND_URL
    üzerinden mutlak URL ile gösterilir (6 Eylül 2026, kullanıcı isteği).
    """
    target_lang = content.get("target_lang", "en")
    native_lang = content.get("native_lang", "tr")
    ui = _DAILY_WORD_UI_STRINGS.get(native_lang, _DAILY_WORD_UI_STRINGS["en"])
    target_name, target_flag = _LANGUAGE_META.get(target_lang, (target_lang.upper(), "🌐"))
    native_name, native_flag = _LANGUAGE_META.get(native_lang, (native_lang.upper(), "🌐"))
    note_label = ui["tip"] if content.get("note_kind") == "tip" else ui["grammar"]

    if settings.OTP_MODE != "real":
        print(f"[DAILY-WORD-DEV] {to_email} → '{content['word']}' ({target_lang}→{native_lang})")
        log_notification("email", "daily_word", to_email, "skipped",
                          {"word": content["word"], "target_lang": target_lang, "native_lang": native_lang, "reason": "OTP_MODE=fixed"})
        return

    if not settings.RESEND_API_KEY and (not settings.SMTP_USER or not settings.SMTP_PASSWORD):
        print(f"[DAILY-WORD] Mail sağlayıcısı ayarlanmamış, gönderilemedi: {to_email} → {content['word']}")
        log_notification("email", "daily_word", to_email, "failed", {"word": content["word"], "reason": "no email provider configured"})
        return

    subject = ui["subject"].format(word=content["word"])
    unsub_token = make_action_token(user_id, "daily_word")
    unsub_url = (
        f"{settings.BACKEND_PUBLIC_URL}/api/v1/notifications/unsubscribe"
        f"?uid={user_id}&token={unsub_token}&cat=daily_word"
    )
    unsub_link_html = f'<a href="{unsub_url}" style="color:#94a3b8;">{ui["unsub_link"]}</a>'
    dir_attr = ' dir="rtl"' if native_lang == "ar" else ""

    example_2_html = ""
    if content.get("example_2_target"):
        example_2_html = f"""
      <p style="margin:0 0 2px; color:#0f172a; font-size:14px;">2. {content['example_2_target']}</p>
      <p style="margin:0 0 4px; color:#64748b; font-size:13px; font-style: italic;">— {content.get('example_2_native', '')}</p>"""

    social_icons_html = "".join(
        f'<a href="{href}" style="display:inline-block; margin:0 5px; text-decoration:none;" title="{label}">'
        f'<img src="{settings.FRONTEND_URL}/email-assets/{icon}.png" width="30" height="30" alt="{label}" '
        f'style="display:block; border-radius:50%;"></a>'
        for icon, label, href in _SOCIAL_LINKS
    )

    html_body = f"""
    <div{dir_attr} style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom: 4px;">
        <img src="{settings.FRONTEND_URL}/logo-icon.png" width="32" height="32" alt="Lexis" style="border-radius:8px; vertical-align:middle;">
        <h2 style="color:#0284c7; margin:0; display:inline-block; vertical-align:middle;">Lexis</h2>
      </div>
      <p style="color:#94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 12px 0 4px;">
        {content.get('level') or f'{target_flag} {target_name}'}
      </p>
      <h1 style="font-size: 32px; color:#0f172a; margin: 0 0 4px;">{content['word']}</h1>

      <div style="margin: 16px 0; padding: 14px 16px; background:#f0f9ff; border-radius: 10px;">
        <p style="margin:0 0 4px; color:#334155; font-size: 14px;"><strong>{target_flag} {target_name} ({ui['meaning']}):</strong> {content['meaning_target']}</p>
        <p style="margin:0; color:#334155; font-size: 14px;"><strong>{native_flag} {native_name} ({ui['meaning']}):</strong> {content['meaning_native']}</p>
      </div>

      <h3 style="color:#0f172a; font-size: 15px; margin: 20px 0 8px;">{ui['examples']}</h3>
      <p style="margin:0 0 2px; color:#0f172a; font-size:14px;">1. {content['example_1_target']}</p>{('<p style="margin:0 0 12px; color:#64748b; font-size:13px; font-style: italic;">— ' + content['example_1_native'] + '</p>') if content.get('example_1_native') else ''}{example_2_html}

      <div style="margin: 20px 0; padding: 14px 16px; background:#fef9c3; border-radius: 10px;">
        <p style="margin:0 0 4px; color:#78350f; font-size: 13px; font-weight:bold;">{note_label}</p>
        <p style="margin:0; color:#78350f; font-size: 13px; line-height:1.5;">{content['grammar_note_native']}</p>
      </div>

      <a href="{settings.FRONTEND_URL}/dashboard" style="display:inline-block; margin-top: 8px; background:#0284c7; color:#fff; text-decoration:none; padding:10px 18px; border-radius:8px; font-size:14px; font-weight:bold;">
        {ui['open_app']}
      </a>

      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align:center;">
        <p style="color:#94a3b8; font-size: 11px; text-transform:uppercase; letter-spacing:1px; margin: 0 0 10px;">{ui['follow_us']}</p>
        <div>{social_icons_html}</div>
      </div>

      <p style="color:#94a3b8; font-size: 11px; margin-top: 20px;">
        {ui['unsub'].format(link=unsub_link_html)}
      </p>
    </div>
    """

    if settings.RESEND_API_KEY:
        try:
            _send_via_resend(to_email, subject, html_body)
            log_notification("email", "daily_word", to_email, "sent",
                              {"word": content["word"], "target_lang": target_lang, "native_lang": native_lang, "via": "resend"})
        except Exception as e:
            print(f"DAILY WORD EMAIL SEND ERROR via Resend ({to_email}): {e}")
            log_notification("email", "daily_word", to_email, "failed", {"word": content["word"], "error": str(e), "via": "resend"})
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with _IPv4SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        log_notification("email", "daily_word", to_email, "sent",
                          {"word": content["word"], "target_lang": target_lang, "native_lang": native_lang, "via": "smtp"})
    except Exception as e:
        print(f"DAILY WORD EMAIL SEND ERROR via SMTP ({to_email}): {e}")
        log_notification("email", "daily_word", to_email, "failed", {"word": content["word"], "error": str(e), "via": "smtp"})
