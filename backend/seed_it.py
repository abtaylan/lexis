"""
backend/seed_it.py

Italyanca (source_lang='it') icin kelime karsiliklarini general_word_pool'a
yazan ince calistirma script'i. Gercek is mantigi seed_lang_core.py'de
(bkz. o dosyanin docstring'i yontem/guvenlik detaylari icin) -- bu dosya
sadece SOURCE_LANG sabitleyip seed_language()'i cagiriyor.

CALISTIRMA:
    cd backend
    venv\\Scripts\\activate      # Windows
    python seed_it.py

Kesintiye ugrarsa (Ctrl+C, internet kopmasi, rate-limit devre kesicisi)
GUVENLE ayni komutla tekrar calistirilip kaldigi yerden devam eder --
zaten eklenen kelimeler tekrar sorgulanmaz.
"""

import asyncio

from seed_lang_core import RateLimitSuspected, seed_language

SOURCE_LANG = "it"

if __name__ == "__main__":
    try:
        asyncio.run(seed_language(SOURCE_LANG))
    except RateLimitSuspected:
        print(
            f"\n{SOURCE_LANG} icin rate-limit suphesiyle erken durduruldu (yukaridaki "
            f"[DURDURULDU] mesajina bakin). Birkac saat ya da ertesi gun ayni komutla "
            f"tekrar calistir."
        )
