"""
backend/app/services/xp_service.py

Merkezi XP servisi. Tum aktiviteler (quiz, flashcard review, schedule
tamamlama, kelime tahmin oyunlari) buradan XP kazandirir.

app/core/database.py'deki gercek pattern'e uygun: supabase_admin dogrudan
modul seviyesinde bir Client instance'i (streak.py'deki kullanimla birebir
ayni stil).
"""

from __future__ import annotations

import math
from typing import Any, Literal, Optional

from app.core.database import supabase_admin

XPSourceType = Literal[
    "quiz",
    "flashcard_review",
    "schedule_complete",
    "daily_goal_bonus",
    "game_wordle",
    "game_multiple_choice",
        "game_multiple_choice_reverse",
    "game_typing",
    "game_matching",
    "game_listening",
    "game_sprint",
]

# XP miktarlari - tek yerden ayarlanabilir (ilk kullanim sonrasi dengeleme gerekebilir)
XP_AMOUNTS: dict[str, int] = {
    "quiz": 5,
    "flashcard_review": 3,
    "schedule_complete": 10,
    "daily_goal_bonus": 20,
    "game_wordle": 15,
    "game_multiple_choice": 3,
    "game_multiple_choice_reverse": 6,
    "game_typing": 8,
    "game_matching": 6,
    "game_listening": 8,
    "game_sprint": 4,
}

LEVEL_BASE = 50
LEVEL_EXPONENT = 1.5


def xp_needed_for_level(level: int) -> int:
    """Bu seviyeye ulasmak icin gereken TOPLAM (kumulatif) XP."""
    if level <= 1:
        return 0
    return math.floor(LEVEL_BASE * (level**LEVEL_EXPONENT))


def level_from_total_xp(total_xp: int) -> int:
    level = 1
    while xp_needed_for_level(level + 1) <= total_xp:
        level += 1
    return level


class XPResult:
    def __init__(
        self,
        amount_awarded: int,
        total_xp: int,
        level: int,
        leveled_up: bool,
        previous_level: int,
    ) -> None:
        self.amount_awarded = amount_awarded
        self.total_xp = total_xp
        self.level = level
        self.leveled_up = leveled_up
        self.previous_level = previous_level

    def to_dict(self) -> dict[str, Any]:
        return {
            "amount_awarded": self.amount_awarded,
            "total_xp": self.total_xp,
            "level": self.level,
            "leveled_up": self.leveled_up,
            "previous_level": self.previous_level,
        }


async def award_xp(
    user_id: str,
    source_type: XPSourceType,
    amount: Optional[int] = None,
    source_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> XPResult:
    """
    Kullaniciya XP kazandirir: xp_events'e kayit atar, profiles.total_xp'yi
    gunceller ve seviye atlanip atlanmadigini hesaplar.

    `amount` verilmezse XP_AMOUNTS'taki varsayilan kullanilir. Hiz bonusu,
    ilk deneme bonusu gibi ekstra hesaplamalar cagiran koddan `amount`
    olarak gecilmeli (bu servis sadece kaydi ve seviye hesabini yapar).
    """
    final_amount = amount if amount is not None else XP_AMOUNTS[source_type]

    # 1. Mevcut total_xp / level'i cek
    profile_res = (
        supabase_admin.table("profiles")
        .select("total_xp, level")
        .eq("id", user_id)
        .single()
        .execute()
    )
    current_total = profile_res.data["total_xp"] if profile_res.data else 0
    previous_level = profile_res.data["level"] if profile_res.data else 1

    new_total = current_total + final_amount
    new_level = level_from_total_xp(new_total)
    leveled_up = new_level > previous_level

    # 2. xp_events'e olay kaydi
    supabase_admin.table("xp_events").insert(
        {
            "user_id": user_id,
            "source_type": source_type,
            "source_id": source_id,
            "amount": final_amount,
            "metadata": metadata or {},
        }
    ).execute()

    # 3. profiles guncelle
    supabase_admin.table("profiles").update(
        {"total_xp": new_total, "level": new_level}
    ).eq("id", user_id).execute()

    return XPResult(
        amount_awarded=final_amount,
        total_xp=new_total,
        level=new_level,
        leveled_up=leveled_up,
        previous_level=previous_level,
    )


async def get_xp_summary(user_id: str) -> dict[str, Any]:
    """Profil/istatistik sayfasi icin XP ozeti (mevcut seviye, ilerleme)."""
    profile_res = (
        supabase_admin.table("profiles")
        .select("total_xp, level")
        .eq("id", user_id)
        .single()
        .execute()
    )
    total_xp = profile_res.data["total_xp"] if profile_res.data else 0
    level = profile_res.data["level"] if profile_res.data else 1
    current_level_floor = xp_needed_for_level(level)
    next_level_target = xp_needed_for_level(level + 1)

    return {
        "total_xp": total_xp,
        "level": level,
        "current_level_xp_floor": current_level_floor,
        "next_level_xp_target": next_level_target,
        "xp_into_level": total_xp - current_level_floor,
        "xp_to_next_level": next_level_target - total_xp,
    }
