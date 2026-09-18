"""
backend/cleanup_bot_users.py

TEK SEFERLIK bakim script'i (kullanici istegi, 18 Eylul 2026): "sistemdeki
bot user'lari temizleyelim, bir tane bile kalmasin". simulate_bot_activity.py
tarafindan 10 Eylul'de olusturulan 119 sahte bot hesabinin (profiles.is_bot=
true, @bots.lexis.internal) TAMAMEN ve KALICI olarak silinmesi icin.

admin.py::delete_user_permanently / _purge_user_dependent_rows ile AYNI
bagimlilik temizleme sirasini kullanir (game_attempts/challenges/
game_sessions/user_badges/xp_events -- bunlar auth.users'a NO ACTION FK ile
bagli, auth.admin.delete_user() ONCESINDE elle temizlenmezse foreign key
violation ile patlar). Geri kalani (words, daily_progress, subscriptions,
notifications, study_schedule, blocks, follows, friendships,
conversations+messages, user_learning_languages, push_tokens vb.)
auth.users(id) ON DELETE CASCADE oldugu icin auth.admin.delete_user()
cagrisiyla otomatik temizleniyor.

BILINCLI FARK (admin.py'deki tekil admin silme akisindan): account_deletions
tablosuna YAZILMIYOR -- o tablo gunluk uyelik bildirimi
(notify_membership_changes.py) icin GERCEK kullanici churn'unu izliyor, bot
temizligi churn degil, buraya yazilirsa yarinki rapor "119 kisi hesabini
sildi" gibi yanlis bir alarm verir.

Guvenlik: sadece is_bot=true VE role admin/admin_readonly OLMAYAN kayitlari
siler (asla olmamasi gereken ama admin.py'deki ayni guvenlik kontrolu
burada da korunuyor). Her kullanici icin ayri try/except -- biri patlarsa
digerleri etkilenmez, sonunda basarili/basarisiz ozeti yazdirilir.

Kullanim (Railway Console'dan, TEK SEFERLIK, kullanicinin kendisi tarafindan
calistirilmak uzere):
  python cleanup_bot_users.py
"""

from app.core.database import supabase_admin

ADMIN_ROLES = {"admin", "admin_readonly"}


def _purge_user_dependent_rows(user_id: str) -> None:
    word_ids = [
        w["id"] for w in (
            supabase_admin.table("words").select("id").eq("user_id", user_id).execute().data or []
        )
    ]
    session_ids = [
        s["id"] for s in (
            supabase_admin.table("game_sessions").select("id").eq("user_id", user_id).execute().data or []
        )
    ]

    if session_ids:
        supabase_admin.table("game_attempts").delete().in_("session_id", session_ids).execute()
        supabase_admin.table("challenges").delete().in_("challenger_session_id", session_ids).execute()
        supabase_admin.table("challenges").delete().in_("challenged_session_id", session_ids).execute()
    if word_ids:
        supabase_admin.table("game_attempts").delete().in_("word_id", word_ids).execute()

    supabase_admin.table("challenges").delete().eq("challenger_id", user_id).execute()
    supabase_admin.table("challenges").delete().eq("challenged_id", user_id).execute()

    supabase_admin.table("game_sessions").delete().eq("user_id", user_id).execute()
    supabase_admin.table("user_badges").delete().eq("user_id", user_id).execute()
    supabase_admin.table("xp_events").delete().eq("user_id", user_id).execute()


def main() -> dict:
    bots = (
        supabase_admin.table("profiles")
        .select("id, display_name, role")
        .eq("is_bot", True)
        .execute()
    ).data or []

    print(f"{len(bots)} bot hesabi bulundu, siliniyor...")

    deleted = 0
    skipped: list[str] = []
    failed: list[str] = []

    for bot in bots:
        uid = bot["id"]
        if bot.get("role") in ADMIN_ROLES:
            print(f"ATLANDI (admin rolü) -- {uid}")
            skipped.append(uid)
            continue
        try:
            _purge_user_dependent_rows(uid)
            supabase_admin.auth.admin.delete_user(uid)
            deleted += 1
            print(f"Silindi ({deleted}/{len(bots)}) -- {uid} ({bot.get('display_name')})")
        except Exception as e:
            print(f"HATA -- {uid}: {e}")
            failed.append(uid)

    result = {"total": len(bots), "deleted": deleted, "skipped": skipped, "failed": failed}
    print(f"\nTAMAMLANDI: {result}")
    return result


if __name__ == "__main__":
    main()
