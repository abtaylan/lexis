"""
backend/app/services/level_assessment_service.py

Kullanici istegi (18 Eylul 2026): "kelimelerde seviye olayi guzel oldu, ama
kisinin seviyesi artabilir de azalabilirde, belirli araliklarla bu durumu
analiz etmek lazim ona gore diger seviyelerden kelimelere calismasi
gerekecek. Bunun icin bir yontem gelistirmelisin."

NE ICIN VAR: placement_level (078_placement_level.sql) TEK SEFERLIK,
degismez bir "baslangic noktasi"dir -- sadece seviye tespit sinavinin
sonucudur. Bu servis AYRI ve YASAYAN bir deger olan current_level'i
(079_user_level_tracking.sql) periyodik olarak kullanicinin SON zamandaki
oyun performansina gore yukari veya asagi gunceller. current_level, kelime
pratigi icin hangi zorluk bandindan (general_word_pool.difficulty_level)
kelime secilecegini yonlendirir (bkz. games.py::next_word -- task #66,
bu servisin yazdigi degeri OKUYAN taraf).

YONTEM (kullanicinin istedigi "yontem" budur):
  1. Kullanicinin bugunku baseline seviyesi (current_level, yoksa
     placement_level) bir CEFR bandina (LEVEL_TO_BAND) eslenir --
     general_word_pool.difficulty_level 3 kademeli (beginner/intermediate/
     advanced) oldugu icin, "dogruluk" o bantta cozulen general-pool
     sorularindan hesaplanir.
  2. Son REASSESS_WINDOW_DAYS gunde o bantta en az MIN_ATTEMPTS_FOR_
     REASSESSMENT deneme varsa, dogruluk orani hesaplanir:
       - >= UPGRADE_ACCURACY_THRESHOLD  -> kullanici bu banti "asmis"
         sayilir, CEFR seviyesi bir kademe YUKARI cikar (a1->a2 gibi).
       - <= DOWNGRADE_ACCURACY_THRESHOLD -> kullanici zorlaniyor sayilir,
         bir kademe ASAGI iner.
       - Aradaki "notr bolge" -> degisiklik yok (asiri hassas
         zikzaklamayi onlemek icin bilinclii bosluk).
     Her seferinde EN FAZLA bir CEFR kademesi degisir (a1<->c2 arasinda
     tek adimda ucmak yok) -- ani/gurultu kaynakli asiri tepkiyi onlemek
     icin.
  3. Degisiklik varsa user_learning_languages.current_level guncellenir
     ve user_level_history'ye bir satir eklenir (raporlarda "ne zaman
     yukseldi/dustu" gorunmesi icin -- bkz. user_report_service.py).
  4. Yeterli veri yoksa (az deneme) veya notr bolgedeyse HICBIR seviye
     degisikligi yapilmaz -- ama level_last_assessed_at yine de
     guncellenir, boylece reassess_all_users bu kullaniciyi gereksiz
     yere her calistiginda tekrar tekrar kontrol etmez (bkz.
     RECHECK_COOLDOWN_DAYS).

BILINCLI KOD TEKRARI: _band_accuracy'nin game_sessions -> game_attempts ->
general_word_pool join deseni, games.py::weak_difficulty_levels ile AYNI
desendir (bilerek kopyalandi -- bu codebase'te route modulleri arasinda
capraz bagimlilik olusturmamak icin bilincli bir tercih, bkz. o fonksiyonun
docstring'i ve _generate_wordle_rounds/_reveal_pattern tekrarlari).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.database import supabase_admin

# CEFR 6 kademe, sirali -- current_level/placement_level bu kumeden gelir
# (bkz. 078_placement_level.sql / 079_user_level_tracking.sql CHECK'leri).
CEFR_LEVEL_ORDER: list[str] = ["a1", "a2", "b1", "b2", "c1", "c2"]

# general_word_pool.difficulty_level 3 kademeli (seed script'in doldurdugu
# serbest varchar, CHECK constraint yok -- bkz. 006_xp_and_games.sql).
# CEFR seviyesini bu 3 banda esler.
LEVEL_TO_BAND: dict[str, str] = {
    "a1": "beginner",
    "a2": "beginner",
    "b1": "intermediate",
    "b2": "intermediate",
    "c1": "advanced",
    "c2": "advanced",
}

REASSESS_WINDOW_DAYS = 30
MIN_ATTEMPTS_FOR_REASSESSMENT = 15
UPGRADE_ACCURACY_THRESHOLD = 0.85
DOWNGRADE_ACCURACY_THRESHOLD = 0.40

# reassess_all_users bir kullaniciyi en fazla bu kadar sik tekrar kontrol
# eder (level_last_assessed_at'e gore) -- gereksiz sorgu yukunu azaltir,
# ayrica dogruluk orani zaten REASSESS_WINDOW_DAYS'lik bir pencereye
# bakiyor, o yuzden gunluk tekrar kontrol anlamli bir sinyal degismesine
# yol acmaz.
RECHECK_COOLDOWN_DAYS = 6


def _step_level(level: str, direction: int) -> str:
    """CEFR_LEVEL_ORDER icinde bir adim ileri (+1) ya da geri (-1) kaydirir,
    ucta ise (a1'in altinda / c2'nin ustunde) oldugu yerde kalir."""
    idx = CEFR_LEVEL_ORDER.index(level)
    new_idx = max(0, min(len(CEFR_LEVEL_ORDER) - 1, idx + direction))
    return CEFR_LEVEL_ORDER[new_idx]


def _band_accuracy(
    user_id: str, learning_lang: str, band: str, days: int
) -> tuple[int, int]:
    """Son `days` gunde, verilen dil + zorluk bandinda cozulen general-pool
    sorularindan (dogru_sayisi, toplam_sayisi) dondurur.

    games.py::weak_difficulty_levels ile AYNI join deseni (game_sessions ->
    game_attempts -> general_word_pool), farkla: burada tek bir bant
    filtreleniyor (dogruluk orani icin) ve dil filtresi game_sessions.
    learning_lang uzerinden yapiliyor (009_user_learning_languages.sql ile
    eklenen sutun -- her oyun oturumu hangi dil icin oynandigini tasir).
    """
    since_iso = (datetime.now(UTC) - timedelta(days=days)).isoformat()

    session_ids = [
        s["id"]
        for s in (
            supabase_admin.table("game_sessions")
            .select("id")
            .eq("user_id", user_id)
            .eq("learning_lang", learning_lang)
            .gte("started_at", since_iso)
            .execute()
            .data
            or []
        )
    ]
    if not session_ids:
        return (0, 0)

    attempts = (
        supabase_admin.table("game_attempts")
        .select("general_word_id, is_correct")
        .in_("session_id", session_ids)
        .not_.is_("general_word_id", "null")
        .execute()
        .data
    ) or []
    if not attempts:
        return (0, 0)

    general_word_ids = list({a["general_word_id"] for a in attempts})
    pool_rows = (
        supabase_admin.table("general_word_pool")
        .select("id, difficulty_level")
        .in_("id", general_word_ids)
        .execute()
        .data
    ) or []
    band_by_id = {p["id"]: p.get("difficulty_level") for p in pool_rows}

    correct = 0
    total = 0
    for a in attempts:
        if band_by_id.get(a["general_word_id"]) != band:
            continue
        total += 1
        if a.get("is_correct"):
            correct += 1
    return (correct, total)


def reassess_user_level(user_id: str, learning_lang: str) -> dict[str, Any] | None:
    """Tek bir kullanici + dil icin seviye yeniden degerlendirmesi yapar.

    Donus degeri:
      - None -> ya baseline seviye yok (hic placement yapmamis), ya da
        yeterli deneme verisi yok (MIN_ATTEMPTS_FOR_REASSESSMENT altinda)
        -- bu durumda HICBIR yazma islemi yapilmaz (level_last_assessed_at
        dahil), cunku degerlendirilecek bir sey olmadi.
      - dict -> degerlendirme yapildi (level_last_assessed_at her zaman
        guncellenir). "direction" alani "up" / "down" / "none" olabilir;
        "none" ise current_level DEGISMEDI ama kontrol kaydedildi.
    """
    rows = (
        supabase_admin.table("user_learning_languages")
        .select("current_level, placement_level")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
        .data
    ) or []
    if not rows:
        return None

    baseline_level = rows[0].get("current_level") or rows[0].get("placement_level")
    if not baseline_level:
        return None  # hic seviye tespit sinavi yapmamis -- degerlendirilecek bir sey yok

    band = LEVEL_TO_BAND.get(baseline_level)
    if band is None:
        return None  # beklenmeyen deger (veri tutarsizligi) -- guvenli tarafta kal

    correct, total = _band_accuracy(user_id, learning_lang, band, REASSESS_WINDOW_DAYS)
    now_iso = datetime.now(UTC).isoformat()

    if total < MIN_ATTEMPTS_FOR_REASSESSMENT:
        return None  # yeterli veri yok -- ne seviye ne de "son kontrol" degisir

    accuracy = correct / total
    if accuracy >= UPGRADE_ACCURACY_THRESHOLD:
        direction = "up"
        new_level = _step_level(baseline_level, +1)
    elif accuracy <= DOWNGRADE_ACCURACY_THRESHOLD:
        direction = "down"
        new_level = _step_level(baseline_level, -1)
    else:
        direction = "none"
        new_level = baseline_level

    # level_last_assessed_at HER durumda guncellenir (kontrol yapildigini
    # kaydetmek icin, reassess_all_users'in cooldown filtresi bunu okur).
    supabase_admin.table("user_learning_languages").update(
        {"current_level": new_level, "level_last_assessed_at": now_iso}
    ).eq("user_id", user_id).eq("learning_lang", learning_lang).execute()

    if new_level != baseline_level:
        supabase_admin.table("user_level_history").insert(
            {
                "user_id": user_id,
                "learning_lang": learning_lang,
                "level": new_level,
                "previous_level": baseline_level,
                "direction": direction,
                "source": "periodic_reassessment",
                "assessed_at": now_iso,
            }
        ).execute()

    return {
        "user_id": user_id,
        "learning_lang": learning_lang,
        "previous_level": baseline_level,
        "new_level": new_level,
        "direction": direction,
        "accuracy": round(accuracy, 4),
        "attempts": total,
    }


def reassess_all_users(days_since_last_check: int = RECHECK_COOLDOWN_DAYS) -> dict[str, Any]:
    """reassess_user_levels.py (periyodik script) tarafindan cagrilir.

    En az bir seviye degeri (current_level veya placement_level) olan ve
    son `days_since_last_check` gunde kontrol edilmemis (level_last_
    assessed_at NULL ya da eski) TUM user_learning_languages satirlarini
    tarar ve her birini reassess_user_level'a yollar.

    Not: bilerek OFFSET/LIMIT (.range()) sayfalama KULLANMIYOR -- bu
    fonksiyon dongu icinde islenen satirlarin tam da filtre kriterini
    (level_last_assessed_at) degistiriyor, bu da klasik "sayfalanirken
    mutasyon -> satir atlama" hatasina yol acar. Bunun yerine iki aday
    kumesi TEK seferde, MAX_CANDIDATES_PER_RUN ile sinirli sekilde cekilir
    (games.py::CANDIDATE_FETCH_LIMIT ile ayni "sabit ust sinir, gercek
    sayfalama degil" deseni) -- solo-founder olcegindeki bu urun icin
    yeterli; kullanici tabani bu siniri asarsa gelecekte gercek keyset
    sayfalamaya gecilebilir.
    """
    MAX_CANDIDATES_PER_RUN = 5000
    cutoff_iso = (
        datetime.now(UTC) - timedelta(days=days_since_last_check)
    ).isoformat()

    # Not: placement_level dolu ama current_level hic assess edilmemis
    # (level_last_assessed_at IS NULL) satirlari da kapsamak icin OR
    # kosulu iki ayri sorguyla birlestiriliyor -- supabase-py'nin tek
    # sorguda "is null OR lt" ifadesi PostgREST'in or= sozdizimi
    # gerektirir, kod okunurlugu icin burada iki sorgu tercih edildi.
    never_checked = (
        supabase_admin.table("user_learning_languages")
        .select("user_id, learning_lang")
        .is_("level_last_assessed_at", "null")
        .not_.is_("placement_level", "null")
        .limit(MAX_CANDIDATES_PER_RUN)
        .execute()
        .data
    ) or []
    stale_checked = (
        supabase_admin.table("user_learning_languages")
        .select("user_id, learning_lang")
        .lt("level_last_assessed_at", cutoff_iso)
        .limit(MAX_CANDIDATES_PER_RUN)
        .execute()
        .data
    ) or []

    seen: set[tuple[str, str]] = set()
    candidates: list[dict[str, str]] = []
    for row in never_checked + stale_checked:
        key = (row["user_id"], row["learning_lang"])
        if key in seen:
            continue
        seen.add(key)
        candidates.append(row)

    checked = 0
    upgraded = 0
    downgraded = 0
    unchanged = 0
    skipped_insufficient_data = 0

    for row in candidates:
        checked += 1
        result = reassess_user_level(row["user_id"], row["learning_lang"])
        if result is None:
            skipped_insufficient_data += 1
        elif result["direction"] == "up":
            upgraded += 1
        elif result["direction"] == "down":
            downgraded += 1
        else:
            unchanged += 1

    return {
        "checked": checked,
        "upgraded": upgraded,
        "downgraded": downgraded,
        "unchanged": unchanged,
        "skipped_insufficient_data": skipped_insufficient_data,
    }
