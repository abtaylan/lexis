import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def send_otp_email(to_email: str, code: str, purpose: str) -> None:
    """
    OTP kodunu e-posta ile gönderir.

    OTP_MODE=fixed (test/geliştirme) iken hiçbir mail atılmaz, kod sadece
    backend log'una yazılır — böylece gerçek bir e-posta kutusu olmayan test
    hesapları da rahatça giriş/kayıt olabilir (kod her zaman "123456").

    OTP_MODE=real (production) iken SMTP üzerinden gerçek e-posta gönderilir.
    """
    if settings.OTP_MODE != "real":
        print(f"[OTP-DEV] {to_email} ({purpose}) → kod: {code}")
        return

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[OTP] SMTP ayarlanmamış (SMTP_USER/SMTP_PASSWORD boş), kod gönderilemedi: {to_email} → {code}")
        return

    subject = "Lexis Giriş Doğrulama Kodu" if purpose == "login" else "Lexis Hesabını Doğrula"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#0284c7; margin-bottom: 4px;">Lexis</h2>
      <p style="color:#334155; font-size: 15px;">
        {"Giriş yapmak için" if purpose == "login" else "Hesabını doğrulamak için"} aşağıdaki kodu kullan:
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
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
    except Exception as e:
        print(f"OTP EMAIL SEND ERROR ({to_email}): {e}")
