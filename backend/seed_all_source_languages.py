"""
backend/seed_all_source_languages.py

Amac: "ko/zh disindaki DIGER dillerin de kendi kelime karsiliklarini
sisteme kaydetmesi" -- yani 12 dilin HER BIRI icin (Ingilizce haric,
o zaten seed_general_word_pool.py ile yapiliyor), kalan 11 dile karsi
gercek kelime karsiliklarinin general_word_pool'a yazilmasi.

Kullanici istegi (20 Eylul 2026): "her dil icin ayri script olustur" --
artik her kaynak dilin kendi kucuk script'i de var (seed_de.py, seed_fr.py,
seed_es.py, seed_it.py, seed_ar.py, seed_ru.py, seed_ja.py, seed_pt.py).
Bu dosya, BIRDEN FAZLA (ya da varsayilan olarak TUM kalan 9) kaynak dili
TEK CALISTIRMADA sirayla islemek isteyenler icin hala duruyor -- ayri ayri
9 kere komut yazmak istemeyenler icin.

Gercek is mantigi artik seed_lang_core.py'de tek yerde tutuluyor (bkz. o
dosyanin docstring'i yontem/guvenlik detaylari icin) -- hem bu script hem
de tek-dil script'leri AYNI kodu kullaniyor, birbirinden sapan bug riski
yok.

CALISTIRMA:
    cd backend
    venv\\Scripts\\activate      # Windows

    # Varsayilan: ko ve zh HARIC kalan 9 kaynak dili sirayla islet
    python seed_all_source_languages.py

    # Ya da sadece belirli dil(ler)i islet (orn. once sadece Almanca):
    python seed_all_source_languages.py de

    # Birden fazla ama hepsi degil:
    python seed_all_source_languages.py ar de es

ONEMLI SURE UYARISI: Her kaynak dil basina ~1300 kavram x ~12 gercek
dis API cagrisi = binlerce istek; REQUEST_DELAY_SECONDS gecikmesiyle
TEK dil bile saatler surebilir. 9 dilin HEPSININ tek calistirmada
sirayla bitmesi (varsayilan mod) gunler surebilir -- bu YUZDEN
script Ctrl+C ile GUVENLE durdurulup, daha sonra AYNI komutla (veya
kalan dilleri tek tek belirterek, ya da artik ayri seed_<dil>.py
script'leriyle) kaldigi yerden devam ettirilebilir; onceden eklenen
kelimeler tekrar sorgulanmaz.

DEVRE KESICI: bir dilde art arda ANCHOR_FAILURE_CIRCUIT_BREAKER (bkz.
seed_lang_core.py) kadar capa cevirisi basarisiz olursa (muhtemelen
MyMemory API gunluk/saatlik istek limiti dolmustur), o dilin kalani VE
sirada kalan TUM diller hic denenmeden atlanip script erken sonlanir --
saatlerce garanti-basarisiz istek atmak yerine.
"""

import asyncio
import sys

from seed_lang_core import ALL_LANGS, ANCHOR_LANG, RateLimitSuspected, seed_language

# Varsayilan: 'en' (zaten seed_general_word_pool.py ile yapiliyor) ve
# 'ko'/'zh' (seed_source_language_words.py ile ayri ayri calisiyor/
# calistirildi) HARIC kalan TUM kaynak diller.
DEFAULT_SOURCE_LANGS = [l for l in ALL_LANGS if l not in (ANCHOR_LANG, "ko", "zh")]

if len(sys.argv) > 1:
    requested = sys.argv[1:]
    invalid = [l for l in requested if l not in ALL_LANGS or l == ANCHOR_LANG]
    if invalid:
        print(f"Gecersiz dil kodu/kodlari: {invalid}")
        print(f"Gecerli kodlar ('{ANCHOR_LANG}' haric): {[l for l in ALL_LANGS if l != ANCHOR_LANG]}")
        sys.exit(1)
    SOURCE_LANGS = requested
else:
    SOURCE_LANGS = DEFAULT_SOURCE_LANGS


async def main() -> None:
    print(f"=== Toplam {len(SOURCE_LANGS)} kaynak dil, SIRAYLA islenecek: {SOURCE_LANGS} ===")
    all_stats = {}
    for source_lang in SOURCE_LANGS:
        try:
            all_stats[source_lang] = await seed_language(source_lang)
        except RateLimitSuspected:
            remaining = [l for l in SOURCE_LANGS if l not in all_stats and l != source_lang]
            print(
                f"\n=== ERKEN DURDURULDU: {source_lang} sirasinda rate-limit supheli durum "
                f"tespit edildi, sirada kalan diller ({remaining}) hic denenmeden atlandi. "
                f"Su ana kadar tamamlanan dillerin ozeti asagida. ==="
            )
            break

    print("\n\n=== TUMU TAMAMLANDI -- ozet ===")
    for lang, stats in all_stats.items():
        print(f"  {lang}: {stats}")


if __name__ == "__main__":
    asyncio.run(main())
