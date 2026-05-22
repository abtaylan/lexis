from datetime import datetime, timezone, timedelta, date
from app.core.database import supabase_admin


async def update_streak(user_id: str, action: str = "word_added"):
    """
    Günlük ilerleme ve streak'i güncelle.
    action: 'word_added' | 'word_reviewed'
    """
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    # Kullanıcının hedefini al
    profile = (
        supabase_admin.table("profiles")
        .select("daily_goal")
        .eq("id", user_id)
        .single()
        .execute()
    )
    daily_goal = profile.data.get("daily_goal", 5) if profile.data else 5

    # Bugünkü kaydı bul
    today_row = (
        supabase_admin.table("daily_progress")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", today)
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
        # Dünkü streak'i bul
        yesterday_row = (
            supabase_admin.table("daily_progress")
            .select("streak_day")
            .eq("user_id", user_id)
            .eq("date", yesterday)
            .execute()
        )
        prev_streak = yesterday_row.data[0]["streak_day"] if yesterday_row.data else 0
        new_streak = prev_streak + 1 if prev_streak > 0 else 1

        insert_data = {
            "user_id": user_id,
            "date": today,
            "words_added": 1 if action == "word_added" else 0,
            "words_reviewed": 1 if action == "word_reviewed" else 0,
            "goal": daily_goal,
            "streak_day": new_streak,
        }
        supabase_admin.table("daily_progress").insert(insert_data).execute()
