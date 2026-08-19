from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    DEBUG: bool = False
    SECRET_KEY: str
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str  # admin işlemler için

    # Cambridge scraping
    SCRAPE_TIMEOUT: int = 10
    SCRAPE_CACHE_TTL: int = 3600

    # Çok dilli sözlük — MyMemory çeviri API (opsiyonel, günlük limiti yükseltir)
    MYMEMORY_EMAIL: str = ""

    # URL'ler — iyzico callback ve frontend yönlendirmeleri için
    BACKEND_PUBLIC_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # iyzico — Abonelik (Subscription API v2)
    IYZICO_API_KEY: str = ""
    IYZICO_SECRET_KEY: str = ""
    IYZICO_BASE_URL: str = "https://sandbox-api.iyzipay.com"  # canlıda: https://api.iyzipay.com
    IYZICO_MONTHLY_PLAN_REF: str = ""
    IYZICO_YEARLY_PLAN_REF: str = ""
    PREMIUM_MONTHLY_PRICE: float = 49.99
    PREMIUM_YEARLY_PRICE: float = 449.99

    # ── OTP doğrulama (giriş + kayıt sonrası) ──────────────────────
    # "fixed"  → test/geliştirme: kod her zaman OTP_FIXED_CODE, mail atılmaz, sadece log'a yazılır.
    # "real"   → production: rastgele 6 haneli kod üretilir ve SMTP ile e-postaya gönderilir.
    OTP_MODE: str = "fixed"
    OTP_FIXED_CODE: str = "123456"
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60

    # SMTP — production'da OTP e-postası göndermek için (Gmail App Password önerilir,
    # uzlaş.io'daki io.uzlasinfo@gmail.com deseniyle aynı — ücretsiz)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "Lexis"

    # ── Sosyal medya günlük içerik paylaşımı (Madde 3b, revize) ────
    # "fixed" → test/geliştirme: gerçek paylaşım yapılmaz, üretilen içerik ve
    #           hedef sadece log'a yazılır (OTP_MODE ile aynı desen).
    # "real"  → production: Telegram Bot API + Slack webhook'a gerçekten gönderilir.
    SOCIAL_POST_MODE: str = "fixed"
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHANNEL_ID: str = ""  # örn. "@lexis_kelime" ya da "-1001234567890"
    SLACK_WEBHOOK_URL: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

