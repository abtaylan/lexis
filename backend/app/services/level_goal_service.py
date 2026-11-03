"""
backend/app/services/level_goal_service.py

Kullanici istegi (3 Kasim 2026): "Ana sayfamizda ... ilerleme durumumuzu
gormemiz lazim yuzdesel olarak -- ana seviye durumumuz, ardindan ulasmak
istedigimiz seviye. Bu yuzdenin ilerlemesi haftalik seviye sinavlari,
oyunlardan elde edilen puanlar, calisma programindaki ilerlememiz gibi
seylere gore ilerleyecek."

TASARIM: "yolculuk" placement_level'da (ilk seviye tespit sinavi sonucu)
baslar, target_level'da (kullanicinin sectigi hedef, bkz. migration
093_level_goal.sql) biter. Toplam adim sayisi bu ikisi arasindaki CEFR
kademe farkidir. current_level (level_assessment_service.py tarafindan
periyodik olarak guncellenen "su anki" seviye) placement'tan kac kademe
yukseldigini gosterir -- bunlar TAMAMLANMIS adimlardir.

Mevcut kademe icindeki (henuz bir ust kademeye GECMEMIS) ilerleme ise uc
sinyalin agirlikli ortalamasi:
  - %50 "seviye sinavi" bilesen: level_assessment_service'in bir ust
    kademeye gecirmek icin zaten kullandigi AYNI dogruluk olcumu
    (_band_accuracy) -- kullanicinin su anki CEFR bandinda cozdugu
    sorularin dogruluk orani, bir ust kademeye gecis esigine (
    UPGRADE_ACCURACY_THRESHOLD) orantilanir. Bu, "haftalik seviye
    sinavlari"nin karsiligi: ayni rolling-pencere mekanizmasi hem
    seviyeyi hem bu yuzdeyi besliyor.
  - %25 "oyun puanlari" bilesen: son 30 gunde oyunlardan (game_* XP
    kaynaklari) kazanilan toplam XP, sabit bir hedefe (GAME_XP_30D_TARGET)
    orantilanir.
  - %25 "calisma programi" bilesen: bu haftanin rolling calisma programinda
    (study_program_service.py) tamamlanan odak konu orani.

Her iki ana durum da (henuz hedef secilmemis / henuz hic seviye tespit
sinavi yapilmamis) "available/needs_target" bayraklariyla ayirt edilir --
frontend bu durumlarda widget'i "hedef sec" ya da "once seviye tespit
sinavini coz" cagrisina cevirir.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.database import supabase_admin
from app.services import study_program_service as sps
from app.services.level_assessment_service import (
    REASSESS_WINDOW_DAYS,
    ROLLING_WINDOW_ATTEMPTS,
    UPGRADE_ACCURACY_THRESHOLD,
    LEVEL_TO_BAND,
    _band_accuracy,
)

CEFR_LEVEL_ORDER: list[str] = ["a1", "a2", "b1", "b2", "c1", "c2"]
CEFR_LEVEL_NAMES_TR: dict[str, str] = {
    "a1": "Başlangıç", "a2": "Temel", "b1": "Orta", "b2": "Orta-Üstü",
    "c1": "İleri", "c2": "Uzman",
}

# Son 30 gunde "iyi bir tempo" sayilacak oyun XP'si -- gunluk ~30 XP
# (ortalama bir oyun cevabi 3-9 XP arasinda, bkz. xp_service.py::XP_AMOUNTS
# -- gunde birkac oyun oturumuna karsilik gelir). Bu, bir "basari esigi"
# degil, sadece yuzde bilesenini 0-100 araligina olceklemek icin bir
# referans nokta -- asilirsa %100'de sinirlanir.
GAME_XP_30D_TARGET = 900
GAME_SCORE_LOOKBACK_DAYS = 30

# Bilesen agirliklari (toplami 1.0) -- kullanicinin sirali verdigi onem
# (haftalik seviye sinavlari, oyun puanlari, calisma programi) burada da
# korunuyor: sinav bileseni en agirlikli.
WEIGHT_EXAM = 0.50
WEIGHT_GAME = 0.25
WEIGHT_PROGRAM = 0.25


def _idx(level: str) -> int:
    return CEFR_LEVEL_ORDER.index(level)


def _suggest_target(current_or_placement: str) -> str:
    """Henuz hedef secilmemisse widget'ta on-secili gosterilecek makul bir
    varsayilan: su anki seviyeden 2 kademe yukarisi (tavana carparsa C2)."""
    idx = min(len(CEFR_LEVEL_ORDER) - 1, _idx(current_or_placement) + 2)
    return CEFR_LEVEL_ORDER[idx]


def _learning_lang_row(user_id: str, learning_lang: str) -> dict[str, Any] | None:
    rows = (
        supabase_admin.table("user_learning_languages")
        .select("current_level, placement_level, target_level")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
        .data
    ) or []
    return rows[0] if rows else None


def _game_score_component(user_id: str) -> tuple[float, int]:
    """Son GAME_SCORE_LOOKBACK_DAYS gundeki oyun XP'si -- (0..1 oran, ham XP).

    Not: xp_events.learning_lang tasimiyor (bkz. dosya basi docstring'i) --
    bu yuzden kullanicinin TUM ogrenme dillerindeki oyun XP'si birlikte
    sayiliyor. Birden fazla dil ogrenen kullanicilar icin bu bir
    basitlestirme (bilinen sinirlama) -- tek dilli kullanicilarin (buyuk
    cogunluk) icin tam dogru."""
    since_iso = (datetime.now(UTC) - timedelta(days=GAME_SCORE_LOOKBACK_DAYS)).isoformat()
    rows = (
        supabase_admin.table("xp_events")
        .select("amount, source_type")
        .eq("user_id", user_id)
        .gte("created_at", since_iso)
        .execute()
        .data
    ) or []
    game_xp = sum(r["amount"] for r in rows if (r.get("source_type") or "").startswith("game_"))
    ratio = min(1.0, game_xp / GAME_XP_30D_TARGET) if GAME_XP_30D_TARGET else 0.0
    return ratio, game_xp


def _study_program_component(user_id: str, learning_lang: str) -> tuple[float, dict[str, Any] | None]:
    """Bu haftanin rolling calisma programinda tamamlanan odak konu orani
    -- (0..1 oran, build_progress ciktisi [varsa, UI'da da gosterilebilsin
    diye])."""
    try:
        program = sps.get_or_create_program(user_id, learning_lang)
        progress = sps.build_progress(user_id, learning_lang, program)
    except Exception as e:  # odak konu uretilemedi (ornegin icerik yoksa) -- sessizce 0
        print(f"LEVEL_GOAL_STUDY_PROGRAM_SKIP: {e}")
        return 0.0, None
    total = len(progress.get("focus_topics") or [])
    completed = progress.get("completed_topics") or 0
    ratio = (completed / total) if total else 0.0
    return ratio, progress


def get_level_goal(user_id: str, learning_lang: str) -> dict[str, Any]:
    row = _learning_lang_row(user_id, learning_lang)
    placement = (row or {}).get("placement_level")
    current = (row or {}).get("current_level") or placement
    target = (row or {}).get("target_level")

    if not placement or not current:
        return {
            "available": False,
            "reason": "no_placement",
            "learning_lang": learning_lang,
        }

    if not target:
        return {
            "available": True,
            "needs_target": True,
            "learning_lang": learning_lang,
            "placement_level": placement,
            "current_level": current,
            "current_level_name": CEFR_LEVEL_NAMES_TR.get(current),
            "target_level": None,
            "suggested_target_level": _suggest_target(current),
        }

    base_idx = _idx(placement)
    current_idx = _idx(current)
    target_idx = _idx(target)

    band_ratio = 0.0
    band_attempts = 0
    game_ratio = 0.0
    game_xp = 0
    program_ratio = 0.0
    program_progress = None

    if target_idx <= current_idx:
        # Hedefe zaten ulasilmis (ya da gecilmis) -- %100, ama bilesenler
        # yine de merak icin hesaplanip donduruluyor.
        percent = 100
        completed_steps = total_steps = max(1, target_idx - base_idx)
    else:
        total_steps = target_idx - base_idx
        completed_steps = max(0, current_idx - base_idx)

        band = LEVEL_TO_BAND.get(current)
        if band:
            correct, band_attempts = _band_accuracy(
                user_id, learning_lang, band, REASSESS_WINDOW_DAYS, window=ROLLING_WINDOW_ATTEMPTS
            )
            if band_attempts:
                band_ratio = min(1.0, (correct / band_attempts) / UPGRADE_ACCURACY_THRESHOLD)

        game_ratio, game_xp = _game_score_component(user_id)
        program_ratio, program_progress = _study_program_component(user_id, learning_lang)

        partial_step = (
            WEIGHT_EXAM * band_ratio + WEIGHT_GAME * game_ratio + WEIGHT_PROGRAM * program_ratio
        )
        percent = round(100 * min(1.0, (completed_steps + partial_step) / total_steps))

    return {
        "available": True,
        "needs_target": False,
        "learning_lang": learning_lang,
        "placement_level": placement,
        "current_level": current,
        "current_level_name": CEFR_LEVEL_NAMES_TR.get(current),
        "target_level": target,
        "target_level_name": CEFR_LEVEL_NAMES_TR.get(target),
        "percent": percent,
        "completed_steps": completed_steps,
        "total_steps": total_steps,
        "breakdown": {
            "exam_accuracy_pct": round(band_ratio * 100),
            "exam_attempts": band_attempts,
            "game_score_pct": round(game_ratio * 100),
            "game_xp_30d": game_xp,
            "study_program_pct": round(program_ratio * 100),
            "study_program_topics_completed": (program_progress or {}).get("completed_topics"),
            "study_program_topics_total": len((program_progress or {}).get("focus_topics") or []) if program_progress else None,
        },
    }


def set_target_level(user_id: str, learning_lang: str, target_level: str) -> dict[str, Any]:
    if target_level not in CEFR_LEVEL_ORDER:
        raise ValueError("Geçersiz seviye.")

    row = _learning_lang_row(user_id, learning_lang)
    if not row:
        raise ValueError("Bu dili henüz öğrenmiyorsun.")
    current = row.get("current_level") or row.get("placement_level")
    if current and _idx(target_level) <= _idx(current):
        raise ValueError("Hedef seviye, şu anki seviyenden daha ileri olmalı.")

    supabase_admin.table("user_learning_languages").update(
        {"target_level": target_level, "target_level_set_at": datetime.now(UTC).isoformat()}
    ).eq("user_id", user_id).eq("learning_lang", learning_lang).execute()

    return get_level_goal(user_id, learning_lang)
