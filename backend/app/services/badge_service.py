"""
backend/app/services/badge_service.py

Rozet (badge) servisi. "Ödül sistemi" (bkz. backlog "Reklam sistemi... Ödül
sistemi: ödülleri sen belirle, sana bırakıyorum") için çekirdek altyapı: bir
kullanıcıya rozet vermek + zaten sahip olduğu rozetleri listelemek.

İki tür rozet var (bkz. migration create_badges_and_user_badges):
- Tek seferlik (period_key=NULL) — örn. streak_7, sadece bir kez kazanılır.
  user_badges_unique_once partial unique index bunu DB seviyesinde garanti eder.
- Dönem bazlı (period_key dolu, örn. "2026-W34" / "2026-08") — aynı rozet
  farklı dönemlerde tekrar kazanılabilir ama AYNI dönemde tekrar kazanılamaz
  (haftalık/aylık liderlik ödülleri). user_badges_unique_period bunu garanti eder.

award_badge() idempotent'tir: kullanıcı zaten o rozete (o dönemde) sahipse
sessizce hiçbir şey yapmaz, tekrar çağırmak güvenlidir — bu da ödül dağıtım
script'inin (distribute_leaderboard_rewards.py) yanlışlıkla iki kez
çalıştırılmasına karşı asıl koruma (DB unique index ikinci bir güvenlik ağı).
"""

from __future__ import annotations

from typing import Any

from app.core.database import supabase_admin


async def award_badge(
    user_id: str,
    badge_code: str,
    period_key: str | None = None,
    meta: dict[str, Any] | None = None,
) -> bool:
    """Rozeti verir, zaten varsa dokunmaz. True dönerse YENİ verildi,
    False dönerse kullanıcı zaten sahipti (no-op)."""
    query = (
        supabase_admin.table("user_badges")
        .select("id")
        .eq("user_id", user_id)
        .eq("badge_code", badge_code)
    )
    query = query.is_("period_key", "null") if period_key is None else query.eq("period_key", period_key)
    existing = query.execute()
    if existing.data:
        return False

    try:
        supabase_admin.table("user_badges").insert(
            {
                "user_id": user_id,
                "badge_code": badge_code,
                "period_key": period_key,
                "meta": meta or {},
            }
        ).execute()
    except Exception as e:
        # Yarış durumunda (aynı anda iki çağrı) DB unique index burada
        # düşer — zaten verilmiş demektir, sessizce yut (job_log.py'deki
        # "best-effort" deseniyle tutarlı).
        print(f"BADGE INSERT SKIP (user={user_id}, badge={badge_code}, period={period_key}): {e}")
        return False
    return True


async def get_user_badges(user_id: str) -> list[dict[str, Any]]:
    """Bir kullanıcının kazandığı tüm rozetleri, katalog bilgisiyle
    (isim/açıklama/emoji) birleştirilmiş olarak döndürür — profil sayfasında
    gösterim için. En yeni kazanılan en üstte."""
    res = (
        supabase_admin.table("user_badges")
        .select(
            "badge_code, period_key, earned_at, meta, "
            "badges(name_tr, name_en, name_de, name_fr, name_es, name_it, name_ar, name_ru, name_ja, name_pt, "
            "description_tr, description_en, description_de, description_fr, description_es, description_it, "
            "description_ar, description_ru, description_ja, description_pt, icon_emoji)"
        )
        .eq("user_id", user_id)
        .order("earned_at", desc=True)
        .execute()
    )
    return res.data or []


async def get_badges_catalog(user_id: str) -> list[dict[str, Any]]:
    """Rozetler ve Ödüller sayfası (V2 öncelik #2) için TAM katalog —
    kazanılan + henüz kazanılmayan TÜM rozetleri döner (bkz. migration
    063_badges_catalog_taxonomy: kind/category/requirement_tr/requirement_en
    alanları). get_user_badges()'ten farkı: o sadece kazanılanları dönüyordu
    (GET /stats/badges, profildeki kompakt BadgeShowcase için hâlâ kullanımda),
    bu ise katalog sayfası için kazanılmamışları da "locked" olarak içeriyor.

    Dönem bazlı rozetlerde (weekly_top1 gibi) kullanıcının o rozeti kaç kez /
    en son ne zaman kazandığı önemli değil — katalogda tek satır olarak
    görünür, earned=true + en son earned_at/period_key ile."""
    all_badges = (
        supabase_admin.table("badges")
        .select(
            "code, kind, category, icon_emoji, "
            "name_tr, name_en, name_de, name_fr, name_es, name_it, name_ar, name_ru, name_ja, name_pt, "
            "description_tr, description_en, description_de, description_fr, description_es, description_it, "
            "description_ar, description_ru, description_ja, description_pt, "
            "requirement_tr, requirement_en"
        )
        .execute()
    ).data or []

    earned_rows = (
        supabase_admin.table("user_badges")
        .select("badge_code, period_key, earned_at")
        .eq("user_id", user_id)
        .order("earned_at", desc=True)
        .execute()
    ).data or []

    # Aynı badge_code birden çok kez (farklı dönemlerde) kazanılmış olabilir —
    # earned_rows earned_at'e göre azalan sırada geldiği için ilk görülen
    # (en yeni) kayıt tutulur, sonrakiler atlanır.
    earned_by_code: dict[str, dict[str, Any]] = {}
    for row in earned_rows:
        code = row["badge_code"]
        if code not in earned_by_code:
            earned_by_code[code] = row

    catalog: list[dict[str, Any]] = []
    for badge in all_badges:
        earned = earned_by_code.get(badge["code"])
        catalog.append(
            {
                **badge,
                "earned": earned is not None,
                "earned_at": earned["earned_at"] if earned else None,
                "period_key": earned["period_key"] if earned else None,
            }
        )

    # Katalogda sabit/öngörülebilir bir sıra: önce kazanılanlar (en yeni
    # önce), sonra kazanılmayanlar kategoriye göre — kullanıcı sayfayı her
    # açtığında düzen aniden değişmesin.
    category_order = {"quest": 0, "quest_world": 1, "streak": 2, "duel": 3, "league": 4, "leaderboard": 5}
    catalog.sort(
        key=lambda b: (
            0 if b["earned"] else 1,
            -_earned_at_sort_key(b["earned_at"]) if b["earned"] else 0,
            category_order.get(b["category"], 99),
            b["code"],
        )
    )
    return catalog


def _earned_at_sort_key(earned_at: str | None) -> float:
    """earned_at ISO string'ini karşılaştırılabilir bir sayıya çevirir —
    yoksa 0 (sort key'de zaten sadece earned=true dallarında kullanılıyor)."""
    if not earned_at:
        return 0
    try:
        from datetime import datetime

        return datetime.fromisoformat(earned_at.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0
