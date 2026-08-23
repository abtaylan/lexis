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

from typing import Any, Optional

from app.core.database import supabase_admin


async def award_badge(
    user_id: str,
    badge_code: str,
    period_key: Optional[str] = None,
    meta: Optional[dict[str, Any]] = None,
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
            "badges(name_tr, name_en, description_tr, description_en, icon_emoji)"
        )
        .eq("user_id", user_id)
        .order("earned_at", desc=True)
        .execute()
    )
    return res.data or []
