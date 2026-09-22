"""
backend/seed_zh.py

Diger standart dil scriptleriyle (seed_de.py, seed_fr.py, seed_es.py, vb.)
AYNI kalipta, tek fark SOURCE_LANG = "zh". Daha once zh icin ayri bir
seed_zh.py yoktu; seed_source_language_words.py (eski/genel script) ile
calistiriliyordu. Bu script onun yerine standart kalibi kullaniyor --
tum mantik seed_lang_core.py'den import ediliyor, hicbir sey kopyalanmadi.

seed_language() 1322 kavramin TAMAMINI dener (source_lang='zh' icin), ama
zaten eklenmis (source_lang, target_lang, word) satirlari word_exists() ile
atlanir -- yani idempotent, tekrar calistirmak guvenli.

CALISTIRMA:
    cd backend
    venv\\Scripts\\activate      # Windows
    python seed_zh.py

Kesintiye ugrarsa (Ctrl+C, rate-limit devre kesici, ag hatasi) GUVENLE ayni
komutla tekrar calistirilip kaldigi yerden devam eder.
"""

import asyncio

from seed_lang_core import RateLimitSuspected, seed_language

SOURCE_LANG = "zh"

if __name__ == "__main__":
    try:
        asyncio.run(seed_language(SOURCE_LANG))
    except RateLimitSuspected:
        print(
            f"\n{SOURCE_LANG} icin rate-limit suphesiyle erken durduruldu. "
            f"Birkac saat ya da ertesi gun ayni komutla tekrar calistir, "
            f"kaldigi yerden (zaten eklenenler atlanarak) guvenle devam eder."
        )