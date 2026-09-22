"""
backend/seed_ko.py

Diger standart dil scriptleriyle (seed_de.py, seed_fr.py, seed_es.py, vb.)
AYNI kalipta, tek fark SOURCE_LANG = "ko". Daha once ko icin ayri bir
seed_ko.py yoktu; source_source_language_words.py (eski/genel script) ile
calistiriliyordu. Bu script onun yerine standart kalibi kullaniyor --
tum mantik seed_lang_core.py'den import ediliyor, hicbir sey kopyalanmadi.

seed_language() 1322 kavramin TAMAMINI dener (source_lang='ko' icin), ama
zaten eklenmis (source_lang, target_lang, word) satirlari word_exists() ile
atlanir -- yani idempotent, tekrar calistirmak guvenli.

CALISTIRMA:
    cd backend
    venv\\Scripts\\activate      # Windows
    python seed_ko.py

Kesintiye ugrarsa (Ctrl+C, rate-limit devre kesici, ag hatasi) GUVENLE ayni
komutla tekrar calistirilip kaldigi yerden devam eder.
"""

import asyncio

from seed_lang_core import RateLimitSuspected, seed_language

SOURCE_LANG = "ko"

if __name__ == "__main__":
    try:
        asyncio.run(seed_language(SOURCE_LANG))
    except RateLimitSuspected:
        print(
            f"\n{SOURCE_LANG} icin rate-limit suphesiyle erken durduruldu. "
            f"Birkac saat ya da ertesi gun ayni komutla tekrar calistir, "
            f"kaldigi yerden (zaten eklenenler atlanarak) guvenle devam eder."
        )