import smtplib
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.services.notification_log import log_notification


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

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[OTP] SMTP ayarlanmamış (SMTP_USER/SMTP_PASSWORD boş), kod gönderilemedi: {to_email} → {code}")
        log_notification("email", "otp", to_email, "failed", {"purpose": purpose, "reason": "SMTP not configured"})
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
        log_notification("email", "otp", to_email, "sent", {"purpose": purpose})
    except Exception as e:
        print(f"OTP EMAIL SEND ERROR ({to_email}): {e}")
        log_notification("email", "otp", to_email, "failed", {"purpose": purpose, "error": str(e)})


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

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[REMINDER] SMTP ayarlanmamış, hatırlatma gönderilemedi: {to_email} → {activity}")
        log_notification("email", "schedule_reminder", to_email, "failed", {"activity": activity, "reason": "SMTP not configured"})
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
        log_notification("email", "schedule_reminder", to_email, "sent", {"activity": activity})
    except Exception as e:
        print(f"REMINDER EMAIL SEND ERROR ({to_email}): {e}")
        log_notification("email", "schedule_reminder", to_email, "failed", {"activity": activity, "error": str(e)})
