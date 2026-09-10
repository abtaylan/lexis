"""
backend/app/api/routes/quests.py

V2 Yol Haritası §6.3 (Faz 3c) — Görev haritası, SUNUCU taraflı ilerleme.

Plan notu: Gramer Rehberi'nin harita UI'ı görsel desen olarak yeniden
kullanılabilir AMA bu sefer ilerleme SUNUCUDA tutulmalı (rekabet/lig
bağlamı olduğu için localStorage yetersiz — Gramer Rehberi'nin kendisi
localStorage kullanıyordu, bilinçli bir fark).

KAPSAM (bilinçli sınır): görev İÇERİĞİ (gerçek görev seti) ayrı bir
alt-adım — bkz. migration 042 yorumu. Bu modül GET /quests'i sunar,
her görevin gereksinimini CANLI değerlendirir (_evaluate_requirement)
ve yeni tamamlananları user_quest_progress'e işler.

ÖDÜL (10 Eylül 2026 kullanıcı sorusu — "sadece XP değil, ödül/rozet de
olmalı"): bir görev YENİ tamamlandığında quest_nodes.reward_xp (varsa,
award_xp source_type="quest_complete") + reward_badge_code (varsa,
badge_service.award_badge) veriliyor. award_badge zaten idempotent
olduğu için (bkz. badge_service.py) burada ekstra bir kontrol
gerekmiyor — user_quest_progress'in kendisi zaten tekrar tamamlamayı
engelliyor (PRIMARY KEY(user_id, quest_node_id)).
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.quests import QuestListResponse, QuestNodeItem
from app.services import badge_service
from app.services.xp_service import award_xp

router = APIRouter()


def _evaluate_requirement(user_id: str, requirement_type: str) -> int:
    """Bir gereksinim tipi için kullanıcının ŞU ANKİ değerini döndürür.
    Yeni bir tip eklemek SADECE burada bir dal eklemek + migration'a
    gerek kalmadan quest_nodes.requirement_type'a o metni yazmak demek
    (requirement_type DB'de serbest metin, bkz. migration 042)."""
    if requirement_type == "xp_total":
        row = (
            supabase_admin.table("profiles")
            .select("total_xp")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return (row.data or {}).get("total_xp", 0)

    if requirement_type == "duel_wins":
        # duel_win XP kaynağı SADECE advance_round'da (duels.py), bir
        # düello bitip en yüksek skorlu katılımcıya verilirken yazılıyor
        # — o yüzden sayısı = kazanılan düello sayısı (bkz. duels.py
        # Faz 3e/3f).
        result = (
            supabase_admin.table("xp_events")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("source_type", "duel_win")
            .execute()
        )
        return result.count or 0

    return 0


@router.get("", response_model=QuestListResponse)
async def list_quests(current_user=Depends(get_current_user)):
    """Görev haritasını, kullanıcının İLERLEMESİYLE birlikte döner.
    Sıradaki kilidi açık (önceki görev tamamlanmış ya da ilk görev)
    ve henüz tamamlanmamış görevler için gereksinim CANLI kontrol
    edilir — yeni karşılanmışsa user_quest_progress'e işlenir (bu
    çağrı sırasında "tamamlandı" durumuna geçebilir, ayrı bir
    "claim" ucu YOK — otomatik tamamlanır)."""
    nodes = (
        supabase_admin.table("quest_nodes")
        .select("*")
        .eq("is_active", True)
        .order("order_index")
        .execute()
        .data
    ) or []

    progress_rows = (
        supabase_admin.table("user_quest_progress")
        .select("quest_node_id, completed_at")
        .eq("user_id", current_user.id)
        .execute()
        .data
    ) or []
    completed_by_node = {p["quest_node_id"]: p["completed_at"] for p in progress_rows}

    items: list[QuestNodeItem] = []
    previous_completed = True  # ilk görev her zaman kilitsiz
    for node in nodes:
        node_id = node["id"]
        is_completed = node_id in completed_by_node
        current_value = 0

        if not is_completed and previous_completed:
            # Kilidi açık ve henüz tamamlanmamış — gereksinimi canlı
            # kontrol et, karşılanmışsa işaretle + ödülü ver.
            current_value = _evaluate_requirement(current_user.id, node["requirement_type"])
            if current_value >= node["requirement_count"]:
                supabase_admin.table("user_quest_progress").insert(
                    {"user_id": current_user.id, "quest_node_id": node_id}
                ).execute()
                is_completed = True
                if node.get("reward_xp"):
                    await award_xp(
                        user_id=current_user.id,
                        source_type="quest_complete",
                        amount=node["reward_xp"],
                        source_id=node_id,
                    )
                if node.get("reward_badge_code"):
                    await badge_service.award_badge(current_user.id, node["reward_badge_code"])
        elif is_completed:
            current_value = node["requirement_count"]

        items.append(
            QuestNodeItem(
                id=node_id,
                slug=node["slug"],
                title_tr=node["title_tr"],
                title_en=node["title_en"],
                description_tr=node.get("description_tr"),
                description_en=node.get("description_en"),
                requirement_type=node["requirement_type"],
                requirement_count=node["requirement_count"],
                reward_xp=node.get("reward_xp", 0),
                reward_badge_code=node.get("reward_badge_code"),
                order_index=node["order_index"],
                current_value=current_value,
                is_completed=is_completed,
                is_unlocked=previous_completed,
                completed_at=completed_by_node.get(node_id),
            )
        )
        previous_completed = is_completed

    return QuestListResponse(items=items)
