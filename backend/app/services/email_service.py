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


def send_daily_word_email(to_email: str, user_id: str, content: dict) -> None:
    """
    Günün kelimesi e-postası — kullanıcı isteği (6 Eylül 2026): her gün
    üyelere kayıtlı e-postalarına gönderilen, İngilizce/Türkçe anlam, 2
    örnek cümle (+ çevirisi) ve YDS/YÖKDİL/TOEFL tarzı dilbilgisi analizi
    içeren öğretici e-posta (bkz. send_daily_word_email.py / madde 019
    migration'daki daily_word_content tablosu).

    content: daily_word_content tablosundan gelen bir satır (dict) — word,
    meaning_en, meaning_tr, example_1_en/tr, example_2_en/tr,
    grammar_note_tr, level anahtarlarını içerir.

    Diğer e-postalarla aynı OTP_MODE/RESEND/SMTP altyapısını kullanır.
    Ayrıca girişsiz "tek tık" abonelikten çıkma linki içerir (bkz.
    app/core/tokens.py + notifications.py::unsubscribe) — profil
    ayarlarında henüz görsel bir toggle yok, bu link kullanıcının bu
    e-postaları kapatabileceği tek yol.
    """
    if settings.OTP_MODE != "real":
        print(f"[DAILY-WORD-DEV] {to_email} → '{content['word']}'")
        log_notification("email", "daily_word", to_email, "skipped", {"word": content["word"], "reason": "OTP_MODE=fixed"})
        return

    if not settings.RESEND_API_KEY and (not settings.SMTP_USER or not settings.SMTP_PASSWORD):
        print(f"[DAILY-WORD] Mail sağlayıcısı ayarlanmamış, gönderilemedi: {to_email} → {content['word']}")
        log_notification("email", "daily_word", to_email, "failed", {"word": content["word"], "reason": "no email provider configured"})
        return

    subject = f"Lexis — Günün Kelimesi: {content['word']}"
    unsub_token = make_action_token(user_id, "daily_word")
    unsub_url = (
        f"{settings.BACKEND_PUBLIC_URL}/api/v1/notifications/unsubscribe"
        f"?uid={user_id}&token={unsub_token}&cat=daily_word"
    )

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#0284c7; margin-bottom: 4px;">Lexis</h2>
      <p style="color:#94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">
        {content.get('level', 'YDS / YÖKDİL / TOEFL')}
      </p>
      <h1 style="font-size: 32px; color:#0f172a; margin: 0 0 4px;">{content['word']}</h1>

      <div style="margin: 16px 0; padding: 14px 16px; background:#f0f9ff; border-radius: 10px;">
        <p style="margin:0 0 4px; color:#334155; font-size: 14px;"><strong>EN:</strong> {content['meaning_en']}</p>
        <p style="margin:0; color:#334155; font-size: 14px;"><strong>TR:</strong> {content['meaning_tr']}</p>
      </div>

      <h3 style="color:#0f172a; font-size: 15px; margin: 20px 0 8px;">Örnek Cümleler</h3>
      <p style="margin:0 0 2px; color:#0f172a; font-size:14px;">1. {content['example_1_en']}</p>
      <p style="margin:0 0 12px; color:#64748b; font-size:13px; font-style: italic;">— {content['example_1_tr']}</p>
      <p style="margin:0 0 2px; color:#0f172a; font-size:14px;">2. {content['example_2_en']}</p>
      <p style="margin:0 0 4px; color:#64748b; font-size:13px; font-style: italic;">— {content['example_2_tr']}</p>

      <div style="margin: 20px 0; padding: 14px 16px; background:#fef9c3; border-radius: 10px;">
        <p style="margin:0 0 4px; color:#78350f; font-size: 13px; font-weight:bold;">📘 Dilbilgisi Notu</p>
        <p style="margin:0; color:#78350f; font-size: 13px; line-height:1.5;">{content['grammar_note_tr']}</p>
      </div>

      <a href="{settings.FRONTEND_URL}/dashboard" style="display:inline-block; margin-top: 8px; background:#0284c7; color:#fff; text-decoration:none; padding:10px 18px; border-radius:8px; font-size:14px; font-weight:bold;">
        Lexis'i Aç
      </a>

      <p style="color:#94a3b8; font-size: 11px; margin-top: 28px;">
        Bu e-postayı her gün almak istemiyorsan <a href="{unsub_url}" style="color:#94a3b8;">buradan kapatabilirsin</a>.
      </p>
    </div>
    """

    if settings.RESEND_API_KEY:
        try:
            _send_via_resend(to_email, subject, html_body)
            log_notification("email", "daily_word", to_email, "sent", {"word": content["word"], "via": "resend"})
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
        log_notification("email", "daily_word", to_email, "sent", {"word": content["word"], "via": "smtp"})
    except Exception as e:
        print(f"DAILY WORD EMAIL SEND ERROR via SMTP ({to_email}): {e}")
        log_notification("email", "daily_word", to_email, "failed", {"word": content["word"], "error": str(e), "via": "smtp"})
