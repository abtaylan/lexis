"""
backend/backfill_word_types.py

V2 Faz 3 devami (10 Eylul 2026 kullanici istegi): "Kelime Turu grafiginde
isim ve sifat disinda yazan Diger bolumu genislet, Diger yazmasin, kelime
turlerinin hepsi orada gozukmeli."

Kok neden arastirmasi: kod tarafinda bug YOK (mobil tarafta word_type'in
hic gonderilmedigi eski bir hata zaten b67d07c ile duzeltilmisti, web
tarafi zaten dogruydu) -- sorun SADECE VERI: mevcut 412 kelimenin 409'u
(o eski bug + elle girilen kelimeler yuzunden) word_type=NULL olarak
kayitli, sadece 3 tanesinde deger var. Bu script mevcut NULL kayitlari
GERIYE DONUK doldurur: ayni sozluk servisini (app.services.dictionary_
service.lookup_word) kullanarak her kelimeyi tekrar arar ve donen
word_type/word_type_native'i words tablosuna yazar.

Calistirma: backend/ dizininden `python backfill_word_types.py` (ya da
Railway'de tek seferlik bir "python backfill_word_types.py" komutu ile).
job_run ile cron_job_runs tablosuna kaydediliyor (diger tek seferlik
script'lerle -- expire_premium.py vb. -- ayni desen).
"""

import asyncio
import sys

from app.core.database import supabase_admin
from app.services.dictionary_service import lookup_word

try:
    from app.services.job_log import job_run
except ImportError:
    # Bu betik bazen Python 3.10 gibi eski bir yorumlayicidan (ornegin
    # gecici bir backfill kosumu icin) calistirilabiliyor -- job_log.py
    # (ve baska bazi modüller) `datetime.UTC` kullaniyor (3.11+). Bu
    # SADECE cron_job_runs loglamasini devre disi birakir, asil backfill
    # islevini ETKİLEMEZ (job_run zaten "best-effort" -- modul docstring'i).
    from contextlib import contextmanager

    @contextmanager
    def job_run(_name):
        yield None

# device_bash / tek cagrida zaman asimina takilmamak icin parcali
# calistirilabilsin diye opsiyonel LIMIT (argv[1]) -- her calistirmada bir
# sonraki NULL parca otomatik alinir cunku doldurulanlar artik NULL degil.
BATCH_LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 100


async def main() -> None:
    with job_run("backfill_word_types"):
        rows = (
            supabase_admin.table("words")
            .select("id, word, source_lang, target_lang")
            .is_("word_type", "null")
            .limit(BATCH_LIMIT)
            .execute()
            .data
        ) or []
        print(f"Bu turda doldurulacak kelime sayisi: {len(rows)}")

        filled = 0
        skipped = 0
        for i, row in enumerate(rows, start=1):
            word = (row.get("word") or "").strip()
            source_lang = row.get("source_lang") or "en"
            target_lang = row.get("target_lang") or "tr"
            if not word:
                skipped += 1
                continue
            try:
                result = await lookup_word(word, source_lang, target_lang)
            except Exception as exc:  # noqa: BLE001 -- tek bir kelime hatasi tum backfill'i durdurmasin
                print(f"[{i}/{len(rows)}] HATA '{word}': {exc}")
                skipped += 1
                continue

            meanings = result.get("meanings") or []
            word_type = ""
            word_type_native = ""
            for m in meanings:
                if (m.get("word_type") or "").strip():
                    word_type = m["word_type"].strip()
                    word_type_native = (m.get("word_type_native") or "").strip()
                    break

            if word_type:
                supabase_admin.table("words").update(
                    {"word_type": word_type, "word_type_native": word_type_native}
                ).eq("id", row["id"]).execute()
                filled += 1
                print(f"[{i}/{len(rows)}] '{word}' -> {word_type}")
            else:
                skipped += 1
                print(f"[{i}/{len(rows)}] '{word}' -> tur bulunamadi, atlandi")

        print(f"BITTI. Dolduruldu: {filled}, Atlandi: {skipped}")


if __name__ == "__main__":
    asyncio.run(main())
