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
from typing import Any, Literal

from app.core.database import supabase_admin
from app.services.badge_service import award_badge

XPSourceType = Literal[
    "flashcard_review",
    "schedule_complete",
    "daily_goal_bonus",
    "game_wordle",
    "game_multiple_choice",
    "game_multiple_choice_reverse",
    "game_multiple_choice_definition",
    "game_typing",
    "game_matching",
    "game_listening",
    "game_sprint",
    # Ödül sistemi (bkz. badge_service.py / distribute_leaderboard_rewards.py) —
    # streak.py içinde seri kilometre taşına (7/30/100/365 gün) ulaşınca,
    # ya da haftalık/aylık liderlik tablosu ödülleri dağıtılırken kullanılır.
    "streak_milestone",
    "leaderboard_reward",
    # Sınav Hazırlık Alanı (V2 §1.1, 9 Eylül 2026) — exams.py'den çağrılır.
    # "exam_question": bir sınav sorusu ilk kez doğru cevaplanınca.
    # "exam_mock_complete": tam süreli (timed_mock) bir deneme sınavı bitirilince,
    # soru başına verilen XP'ye ek TEK SEFERLİK tamamlama bonusu.
    "exam_question",
    "exam_mock_complete",
    # Gerçek Zamanlı Düello (V2 §6.3 Faz 3) — round-servis uçları henüz
    # bağlanmadı (bkz. duels.py modül docstring'i, alt-faz 3e), ama
    # flashcard_review/schedule_complete/daily_goal_bonus emsaliyle
    # tutarlı şekilde önceden tanımlanıyor: "duel_participation" düello
    # bitince TÜM katılımcılara, "duel_win" ise sadece kazanana ekstra
    # verilecek.
    "duel_participation",
    "duel_win",
    # Görev haritası (V2 §6.3 Faz 3c) — quests.py bir görevi otomatik
    # tamamlarken quest_nodes.reward_xp kadar bonus verir (0 ise hiç
    # çağrılmaz, XP_AMOUNTS'taki değer bu yüzden sadece "eksik amount"
    # savunması, gerçek miktar HER ZAMAN quest_nodes'tan geliyor).
    "quest_complete",
    # Referans/Davet Programı (V2 öncelik #8, 12 Eylül 2026) —
    # process_referral_rewards.py'den çağrılır. Davet eden ve davet edilen
    # FARKLI miktarlarda alır (amount her zaman açıkça geçilir, bkz. o
    # script), buradaki değer sadece "eksik amount" savunması.
    "referral_bonus",
    # Kullanıcı Soru Önerisi (V2 backlog #10, 14 Eylül 2026) — exams.py
    # suggest_question/approve_question'dan çağrılır. "_suggested": soru
    # gönderilir gönderilmez (katılımı teşvik eden küçük anlık ödül).
    # "_approved": admin soruyu onaylayınca EK olarak verilir (sadece
    # source_type='user' + submitted_by dolu olan sorular için — AI
    # sorularında ödül yok, katkıyı yapan kullanıcı yok).
    "exam_question_suggested",
    "exam_question_approved",
    # "Gunluk Kelime Avi" (24 Eylul 2026, Madde 2 secimi) --
    # daily_challenge_service.py'nin guess_letter()'inda, gunun kelimesi
    # ILK KEZ tamamlaninca (o gun icin ikinci kez verilmez) cagrilir.
    "daily_word_challenge",
    # "Roleplay/diyalog botu" (24 Eylul 2026, Madde 2 -- ikinci secim) --
    # roleplay_service.py'nin finish_session()'inda, oturum EN AZ
    # MIN_TURNS_FOR_XP kullanici mesaji icerdiginde VE bu oturumda daha
    # once XP verilmediyse (roleplay_sessions.xp_awarded) cagrilir.
    "roleplay_session",
]

# XP miktarlari - tek yerden ayarlanabilir (ilk kullanim sonrasi dengeleme gerekebilir)
#
# NOT (teknik borc maddesi cozuldu): "quiz" kaynagi buradan kaldirildi. Kod
# taramasi gosterdi ki award_xp() SADECE games.py icinden, source_type olarak
# ya dinamik f"game_{session['mode']}" (wordle/multiple_choice/typing/matching/
# listening/sprint) ya da sabit "game_wordle" ile cagriliyor -- "quiz" hicbir
# kod yolunda uretilmiyordu. Oyun modlari (games.py) ayrilmadan onceki eski,
# genel "quiz" kavraminin kalintisiydi; artik onun yerini
# game_multiple_choice / game_multiple_choice_reverse /
# game_multiple_choice_definition aliyor. flashcard_review / schedule_complete /
# daily_goal_bonus ise su an icin de cagrilmiyor ama bunlar planlanan,
# henuz route'lara baglanmamis ozellikler (kelime tekrari, program tamamlama,
# gunluk hedef bonusu) icin bilerek tutuluyor -- kaldirilmadi.
XP_AMOUNTS: dict[str, int] = {
    "flashcard_review": 3,
    "schedule_complete": 10,
    "daily_goal_bonus": 20,
    "game_wordle": 15,
    "game_multiple_choice": 3,
    "game_multiple_choice_reverse": 6,
    # Faz 2 — İngilizce tanım -> İngilizce kelime (monolingual, en zor yön)
    "game_multiple_choice_definition": 9,
    "game_typing": 8,
    "game_matching": 6,
    "game_listening": 8,
    "game_sprint": 4,
    # Bu ikisi için çağıran kod (streak.py / distribute_leaderboard_rewards.py)
    # her zaman kendi `amount`ını açıkça geçer (kilometre taşı / sıralamaya göre
    # değişken miktar) — buradaki değerler sadece olası bir eksik-amount çağrısına
    # karşı güvenli bir varsayılan.
    "streak_milestone": 20,
    "leaderboard_reward": 20,
    # Sınav Hazırlık Alanı — game_multiple_choice_definition (9) ile aynı
    # bandın biraz üstü (sınav sorusu, oyun kelime sorusundan daha zor kabul
    # edilir). Mock tamamlama bonusu streak/leaderboard ödülleriyle aynı
    # büyüklükte (20) tutuldu.
    "exam_question": 5,
    "exam_mock_complete": 20,
    # Düello — katılım bonusu game_sprint (4) ile game_wordle (15) arası bir
    # canlı-oyun ödülü; kazanma bonusu leaderboard_reward (20) ile aynı
    # büyüklükte. Round-servis uçları bağlandığında (3e) kullanılacak.
    "duel_participation": 8,
    "duel_win": 20,
    "quest_complete": 20,
    # Referral: davet eden 30 (yüksek değerli, seyrek bir aksiyon — leaderboard_
    # reward/duel_win'in (20) biraz üstü), davet edilen 15 (game_wordle (15)
    # ile aynı, bir "hoş geldin" bonusu). process_referral_rewards.py bu iki
    # değeri `amount` parametresiyle açıkça geçer, burası sadece varsayılan.
    "referral_bonus": 30,
    # Kullanıcı Soru Önerisi — gönderince küçük/anlık (flashcard_review (3)
    # ile game_multiple_choice (3) bandında), onaylanınca ek/büyük
    # (exam_mock_complete/duel_win/quest_complete (20) ile aynı büyüklükte —
    # gerçekten havuza giren bir katkı, mock sınav tamamlamayla eşdeğer emek).
    "exam_question_suggested": 3,
    "exam_question_approved": 20,
    # Gunluk Kelime Avi -- game_wordle (15) ile ayni buyuklukte: ayni harf-
    # tahmin mekanigi, ama gunde sadece BIR kez kazanilabilir (klasik
    # Wordle'in "gunde bir bulmaca" kisitiyla tutarli bir odul buyuklugu).
    "daily_word_challenge": 15,
    # Roleplay -- duel_win/exam_mock_complete/quest_complete (20) ile ayni
    # buyuklukte: en az 4 gercek, serbest metin uretimi gerektiren bir
    # diyalog turu -- tek bir wordle turundan (15) daha fazla emek.
    "roleplay_session": 20,
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


# Ödüller (title/kozmetik ödüller) — bkz. migration 064_title_rewards.sql.
# Achievement rozetlerinden farklı olarak bunlar tek bir olayı değil,
# kullanıcının GÜNCEL seviye rütbesini temsil ediyor, ama award_badge()
# altyapısı aynı (bir kez kazanılır, kalıcıdır — XP hiç azalmadığı için
# bu sorun değil).
_TITLE_LEVEL_THRESHOLDS: dict[int, str] = {
    3: "level_3",
    5: "level_5",
    10: "level_10",
    15: "level_15",
    20: "level_20",
    30: "level_30",
    40: "level_40",
    50: "level_50",
}


async def _award_level_titles(user_id: str, previous_level: int, new_level: int) -> None:
    """Seviye atlandıysa, atlanan ARALIKTAKİ (previous_level, new_level] tüm
    unvan eşiklerini ver. Büyük bir tek seferlik XP artışı (ör. haftalık lig
    ödülü ya da görev tamamlama bonusu) birden fazla eşiği aynı anda
    atlayabilir — hepsi verilmeli, sadece en yükseği değil."""
    for threshold, code in _TITLE_LEVEL_THRESHOLDS.items():
        if previous_level < threshold <= new_level:
            await award_badge(user_id, code)


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
    amount: int | None = None,
    source_id: str | None = None,
    metadata: dict[str, Any] | None = None,
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

    if leveled_up:
        await _award_level_titles(user_id, previous_level, new_level)

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
