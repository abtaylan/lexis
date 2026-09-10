"""
backend/app/api/routes/quests.py

V2 Yol Haritası §6.3 (Faz 3c) — Görev haritası, SUNUCU taraflı ilerleme.

Plan notu: Gramer Rehberi'nin harita UI'ı görsel desen olarak yeniden
kullanılabilir AMA bu sefer ilerleme SUNUCUDA tutulmalı (rekabet/lig
bağlamı olduğu için localStorage yetersiz — Gramer Rehberi'nin kendisi
localStorage kullanıyordu, bilinçli bir fark).

GÖREV HARİTASI v2 (10 Eylül 2026 devamı, "içeriği tamamen değişecek"
isteği — bkz. migration 049 şema + 059 içerik): görevler artık düz tek
bir liste DEĞİL, dünya (world) -> bölüm (part) -> görev (node)
hiyerarşisinde ve her görevin bir content_type'ı var. content_type ->
requirement_type sözleşmesi (migration 059'un başındaki yorumla BİREBİR
aynı, tek doğru kaynak orası, burada sadece kod tarafı):

  'aggregate'          -> requirement_type='xp_total' | 'duel_wins'
                          (v1 davranışı, content_ref YOK).
  'game'                -> requirement_type='game_sessions_count',
                          content_ref={"game_mode": <GameMode>}.
  'flashcard'           -> requirement_type='study_sessions_count',
                          content_ref={"study_type": <StudyType>}.
  'grammar_topic'       -> requirement_type='exam_topic_practice_count',
                          content_ref={"topic_tag": <grammar_topics.slug
                          ile eşleşen exam_questions.topic_tag>}.
  'quiz'                 -> requirement_type='exam_questions_answered_count',
                          content_ref={"exam_type": <ExamType>}.
  'question_practice'   -> requirement_type='exam_mock_completed_count',
                          content_ref={"exam_type": <ExamType>}.
  'duel'                 -> requirement_type='duel_wins' (aggregate ile
                          aynı mekanik, sadece frontend'e "düello
                          sekmesine git" CTA'sı vermek için ayrı tip).

Frontend (web+mobile) content_type'a göre "bu düğüme dokununca nereye
git" kararını verir — bu modül sadece değerlendirme + world/part
zenginleştirmesini sağlar, yönlendirme mantığı frontend'de.

KAPSAM (bilinçli sınır, DEĞİŞMEDİ): Bu modül GET /quests'i sunar, her
görevin gereksinimini CANLI değerlendirir (_evaluate_requirement) ve
yeni tamamlananları user_quest_progress'e işler.

ÖDÜL (10 Eylül 2026 kullanıcı sorusu — "sadece XP değil, ödül/rozet de
olmalı"): bir görev YENİ tamamlandığında quest_nodes.reward_xp (varsa,
award_xp source_type="quest_complete") + reward_badge_code (varsa,
badge_service.award_badge) veriliyor. award_badge zaten idempotent
olduğu için (bkz. badge_service.py) burada ekstra bir kontrol
gerekmiyor — user_quest_progress'in kendisi zaten tekrar tamamlamayı
engelliyor (PRIMARY KEY(user_id, quest_node_id)).
"""

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.quests import QuestListResponse, QuestNodeItem
from app.services import badge_service
from app.services.xp_service import award_xp

router = APIRouter()


def _user_session_ids(user_id: str) -> list[str]:
    """Kullanıcının TÜM zamanlardaki exam_sessions id'leri — görev
    ilerlemesi haftalık/günlük bir pencereye tabi DEĞİL (exams.py::
    weak_topics'teki 'days' pencereli versiyondan BİLİNÇLİ fark)."""
    result = (
        supabase_admin.table("exam_sessions")
        .select("id")
        .eq("user_id", user_id)
        .execute()
    )
    return [row["id"] for row in (result.data or [])]


def _count_exam_attempts(user_id: str, *, topic_tag: str | None = None, exam_type: str | None = None) -> int:
    """exam_attempts + exam_questions üzerinden kullanıcı bazlı sayım —
    exams.py::weak_topics ile AYNI iki-adımlı desen (session_id -> user_id,
    question_id -> topic_tag/exam_type), supabase-py join desteklemediği
    için."""
    session_ids = _user_session_ids(user_id)
    if not session_ids:
        return 0

    question_query = supabase_admin.table("exam_questions").select("id")
    if topic_tag:
        question_query = question_query.eq("topic_tag", topic_tag)
    if exam_type:
        question_query = question_query.eq("exam_type", exam_type)
    question_ids = [row["id"] for row in (question_query.execute().data or [])]
    if not question_ids:
        return 0

    result = (
        supabase_admin.table("exam_attempts")
        .select("id", count="exact")
        .in_("session_id", session_ids)
        .in_("question_id", question_ids)
        .execute()
    )
    return result.count or 0


def _evaluate_requirement(user_id: str, requirement_type: str, content_ref: dict[str, Any] | None) -> int:
    """Bir gereksinim tipi için kullanıcının ŞU ANKİ değerini döndürür.
    Yeni bir tip eklemek SADECE burada bir dal eklemek + migration'a
    gerek kalmadan quest_nodes.requirement_type'a o metni yazmak demek
    (requirement_type DB'de serbest metin, bkz. migration 042)."""
    content_ref = content_ref or {}

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

    if requirement_type == "game_sessions_count":
        game_mode = content_ref.get("game_mode")
        query = (
            supabase_admin.table("game_sessions")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .not_.is_("ended_at", "null")
        )
        if game_mode:
            query = query.eq("mode", game_mode)
        return query.execute().count or 0

    if requirement_type == "study_sessions_count":
        study_type = content_ref.get("study_type")
        query = (
            supabase_admin.table("study_sessions")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .not_.is_("ended_at", "null")
        )
        if study_type:
            query = query.eq("study_type", study_type)
        return query.execute().count or 0

    if requirement_type == "exam_topic_practice_count":
        # 10 Eylul 2026: exam_attempts DEGIL -- topic_practice_attempts
        # sayilir (bkz. supabase/migrations/060_topic_practice_attempts.sql).
        # exam-topic-practice ekrani session/exam_attempts yazmiyor (bilincli
        # tasarim, bkz. exams.py::practice_questions_by_topic docstring'i),
        # bu yuzden o ekranda cevaplanan sorular ayri bir tabloda tutuluyor.
        topic_tag = content_ref.get("topic_tag")
        if not topic_tag:
            return 0
        result = (
            supabase_admin.table("topic_practice_attempts")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("topic_tag", topic_tag)
            .execute()
        )
        return result.count or 0

    if requirement_type == "exam_questions_answered_count":
        return _count_exam_attempts(user_id, exam_type=content_ref.get("exam_type"))

    if requirement_type == "exam_mock_completed_count":
        exam_type = content_ref.get("exam_type")
        query = (
            supabase_admin.table("exam_sessions")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("session_mode", "timed_mock")
            .not_.is_("ended_at", "null")
        )
        if exam_type:
            query = query.eq("exam_type", exam_type)
        return query.execute().count or 0

    return 0


def _worlds_and_parts_by_id() -> tuple[dict[str, dict], dict[str, dict]]:
    worlds = (supabase_admin.table("quest_worlds").select("*").execute().data) or []
    parts = (supabase_admin.table("quest_parts").select("*").execute().data) or []
    return {w["id"]: w for w in worlds}, {p["id"]: p for p in parts}


@router.get("", response_model=QuestListResponse)
async def list_quests(current_user=Depends(get_current_user)):
    """Görev haritasını, kullanıcının İLERLEMESİYLE birlikte döner.
    Sıradaki kilidi açık (önceki görev tamamlanmış ya da ilk görev)
    ve henüz tamamlanmamış görevler için gereksinim CANLI kontrol
    edilir — yeni karşılanmışsa user_quest_progress'e işlenir (bu
    çağrı sırasında "tamamlandı" durumuna geçebilir, ayrı bir
    "claim" ucu YOK — otomatik tamamlanır). Kilit sırası hâlâ TEK bir
    global order_index'e göre (dünya/bölüm sınırlarını göz ardı eder,
    migration 059 order_index'i zaten doğru dünya/bölüm sırasıyla
    atadı) — v1'deki mekanizma korunuyor, sadece world/part bilgisiyle
    zenginleştiriliyor."""
    nodes = (
        supabase_admin.table("quest_nodes")
        .select("*")
        .eq("is_active", True)
        .order("order_index")
        .execute()
        .data
    ) or []

    worlds_by_id, parts_by_id = _worlds_and_parts_by_id()

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
        content_ref = node.get("content_ref")

        if not is_completed and previous_completed:
            # Kilidi açık ve henüz tamamlanmamış — gereksinimi canlı
            # kontrol et, karşılanmışsa işaretle + ödülü ver.
            current_value = _evaluate_requirement(current_user.id, node["requirement_type"], content_ref)
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

                # Faz 3f (migration 048) -- genel ilerleme rozetleri:
                # ilk tamamlanan HERHANGI bir gorev + haritadaki TUM
                # aktif gorevler bitince "harita ustasi".
                await badge_service.award_badge(current_user.id, "first_quest_complete")
                completed_count_result = (
                    supabase_admin.table("user_quest_progress")
                    .select("quest_node_id", count="exact")
                    .eq("user_id", current_user.id)
                    .execute()
                )
                if (completed_count_result.count or 0) >= len(nodes):
                    await badge_service.award_badge(current_user.id, "quest_map_complete")
        elif is_completed:
            current_value = node["requirement_count"]

        world = worlds_by_id.get(node.get("world_id"))
        part = parts_by_id.get(node.get("part_id"))

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
                world_slug=world.get("slug") if world else None,
                world_title_tr=world.get("title_tr") if world else None,
                world_title_en=world.get("title_en") if world else None,
                part_index=part.get("part_index") if part else None,
                part_title_tr=part.get("title_tr") if part else None,
                part_title_en=part.get("title_en") if part else None,
                content_type=node.get("content_type") or "aggregate",
                content_ref=content_ref,
                difficulty_index=node.get("difficulty_index", 1),
            )
        )
        previous_completed = is_completed

    return QuestListResponse(items=items)


# ------------------------------------------------------------
# Faz 3f -- kullanici bazli gorev haritasi istatistigi.
# ------------------------------------------------------------
class QuestStatsResponse(BaseModel):
    completed_count: int
    total_count: int
    completion_pct: float


@router.get("/stats/me", response_model=QuestStatsResponse)
async def get_my_quest_stats(current_user=Depends(get_current_user)):
    total_count = (
        supabase_admin.table("quest_nodes")
        .select("id", count="exact")
        .eq("is_active", True)
        .execute()
        .count
        or 0
    )
    completed_count = (
        supabase_admin.table("user_quest_progress")
        .select("quest_node_id", count="exact")
        .eq("user_id", current_user.id)
        .execute()
        .count
        or 0
    )
    completion_pct = round((completed_count / total_count) * 100, 1) if total_count else 0.0
    return QuestStatsResponse(
        completed_count=completed_count, total_count=total_count, completion_pct=completion_pct
    )
