from datetime import datetime, timezone, timedelta, date
from typing import Optional
from app.core.database import supabase_admin
from app.services import badge_service, xp_service

# Ödül sistemi — seri kilometre taşları (bkz. backlog "Ödül sistemi:
# ödülleri sen belirle, sana bırakıyorum"). Rozet kodları (streak_7 vb.)
# migration create_badges_and_user_badges'teki badges katalogla eşleşiyor.
# Bonus XP miktarları kilometre taşı büyüdükçe artıyor — xp_service'teki
# diğer ödüllerle (game_wordle=15, daily_goal_bonus=20 vb.) kıyaslanınca
# "gerçekten özel bir an" hissi versin diye kasıtlı olarak yüksek tutuldu.
STREAK_MILESTONES: dict[int, int] = {
    7: 30,
    30: 150,
    100: 500,
    365: 2000,
}


async def _maybe_award_streak_milestone(user_id: str, streak_days: int) -> None:
    bonus_xp = STREAK_MILESTONES.get(streak_days)
    if bonus_xp is None:
        return
    badge_code = f"streak_{streak_days}"
    newly_awarded = await badge_service.award_badge(user_id, badge_code, meta={"streak_days": streak_days})
    if not newly_awarded:
        return  # zaten kazanılmış (örn. iki farklı dilde aynı gün ilerleme kaydı) — tekrar XP verme
    await xp_service.award_xp(
        user_id,
        "streak_milestone",
        amount=bonus_xp,
        metadata={"streak_days": streak_days, "badge_code": badge_code},
    )
    try:
        supabase_admin.table("notifications").insert(
            {
                "user_id": user_id,
                "type": "reward",
                "title": f"🔥 {streak_days} günlük seri!",
                "message": f"Tebrikler, {streak_days} gün üst üste çalıştın! +{bonus_xp} XP ve yeni bir rozet kazandın.",
            }
        ).execute()
    except Exception as e:
        print(f"STREAK MILESTONE NOTIFICATION WARNING (user={user_id}): {e}")


async def update_streak(user_id: str, action: str = "word_added", learning_lang: Optional[str] = None):
    """
    Günlük ilerleme ve streak'i güncelle.
    action: 'word_added' | 'word_reviewed'

    learning_lang: Bu ilerlemenin hangi öğrenme diline ait olduğu (Kullanıcı
    Madde 2 — streak/günlük hedef dil bazında ayrı tutulur). Verilmezse
    kullanıcının o anki aktif dili (profiles.learning_lang aynası) kullanılır
    — eski çağıran kodlarla geriye dönük uyumluluk için.
    """
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    # Kullanıcının profilini al (varsayılan günlük hedef + aktif dil fallback)
    profile = (
        supabase_admin.table("profiles")
        .select("daily_goal, learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    profile_data = profile.data or {}
    daily_goal = profile_data.get("daily_goal", 5)

    if not learning_lang:
        learning_lang = profile_data.get("learning_lang", "en")

    # Dile özel günlük hedef override'ı varsa onu kullan
    lang_row = (
        supabase_admin.table("user_learning_languages")
        .select("daily_goal")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
    )
    if lang_row.data and lang_row.data[0].get("daily_goal") is not None:
        daily_goal = lang_row.data[0]["daily_goal"]

    # Bugünkü kaydı bul (bu dile ait)
    today_row = (
        supabase_admin.table("daily_progress")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", today)
        .eq("learning_lang", learning_lang)
        .execute()
    )

    if today_row.data:
        # Güncelle
        row = today_row.data[0]
        update_data = {"goal": daily_goal}
        if action == "word_added":
            update_data["words_added"] = row["words_added"] + 1
        elif action == "word_reviewed":
            update_data["words_reviewed"] = row["words_reviewed"] + 1

        supabase_admin.table("daily_progress").update(update_data).eq("id", row["id"]).execute()
    else:
        # Dünkü streak'i bul (aynı dil)
        yesterday_row = (
            supabase_admin.table("daily_progress")
            .select("streak_day")
            .eq("user_id", user_id)
            .eq("date", yesterday)
            .eq("learning_lang", learning_lang)
            .execute()
        )
        prev_streak = yesterday_row.data[0]["streak_day"] if yesterday_row.data else 0
        new_streak = prev_streak + 1 if prev_streak > 0 else 1

        await _maybe_award_streak_milestone(user_id, new_streak)

        insert_data = {
            "user_id": user_id,
            "date": today,
            "learning_lang": learning_lang,
            "words_added": 1 if action == "word_added" else 0,
            "words_reviewed": 1 if action == "word_reviewed" else 0,
            "goal": daily_goal,
            "streak_day": new_streak,
        }
        supabase_admin.table("daily_progress").insert(insert_data).execute()
