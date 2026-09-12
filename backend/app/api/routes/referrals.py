"""
backend/app/api/routes/referrals.py

Referans/Davet Programı (V2 öncelik #8, 12 Eylül 2026). Kullanıcının kendi
referral_code'u (profiles.referral_code — trigger'da otomatik atanır, bkz.
migration 069_referral_program.sql) zaten GET /auth/me yanıtında var; bu
router SADECE davet ettiği kişilerin listesini/durumunu döner — auth.py'yi
şişirmemek için ayrı tutuldu.

Ödül mantığı BURADA YOK — o process_referral_rewards.py'nin (ayrı, periyodik
çalışan bir script) işi (bkz. o dosyanın docstring'i). Bu router sadece
OKUMA yapar.
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.database import supabase_admin

router = APIRouter()


@router.get("/me")
async def my_referrals(current_user=Depends(get_current_user)):
    """Kendi referans kodun + davet ettiğin kişilerin listesi/durumu.

    `pending`: kayıt oldu ama henüz 3 günlük seriye ulaşmadı (ödül bekliyor).
    `rewarded`: ödül (XP + Premium, davet edene) zaten verildi.
    """
    profile = (
        supabase_admin.table("profiles")
        .select("referral_code")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    referral_code = (profile.data or {}).get("referral_code")

    rows = (
        supabase_admin.table("referrals")
        .select("referred_id, status, created_at, rewarded_at")
        .eq("referrer_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
        .data
    ) or []

    referred_ids = [r["referred_id"] for r in rows]
    profiles_by_id: dict[str, dict] = {}
    if referred_ids:
        prof_rows = (
            supabase_admin.table("profiles")
            .select("id, display_name, username")
            .in_("id", referred_ids)
            .execute()
            .data
        ) or []
        profiles_by_id = {p["id"]: p for p in prof_rows}

    items = [
        {
            "display_name": (profiles_by_id.get(r["referred_id"]) or {}).get("display_name") or "",
            "username": (profiles_by_id.get(r["referred_id"]) or {}).get("username") or "",
            "status": r["status"],
            "created_at": r["created_at"],
            "rewarded_at": r["rewarded_at"],
        }
        for r in rows
    ]

    return {
        "referral_code": referral_code,
        "total_invited": len(items),
        "total_rewarded": sum(1 for i in items if i["status"] == "rewarded"),
        "items": items,
    }
