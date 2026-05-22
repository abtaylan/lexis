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
    SUPABASE_SERVICE_KEY: str   # admin işlemler için

    # Cambridge scraping
    SCRAPE_TIMEOUT: int = 10
    SCRAPE_CACHE_TTL: int = 3600

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
