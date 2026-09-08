"""
backend/app/services/notify.py

KULLANICI GERİ BİLDİRİMİ (8 Eylül 2026): "Mesaj ve bildirim gelmiş ama
telefona gelmemiş bu bildirim. ... bunların da bildirimi gelmesi lazım
telefona." — kök neden: friends_service.py / messaging_service.py /
challenge_service.py / streak.py'deki TÜM sosyal/oyun bildirimleri
(arkadaşlık isteği, mesaj, meydan okuma, seri kilometre taşı vb.) sadece
`notifications` tablosuna satır ekliyordu (uygulama-içi liste) — hiçbiri
gerçek bir OS push bildirimi GÖNDERMİYORDU. push_service.send_push_batch
sadece günlük sabah/akşam hatırlatma cron'unda kullanılıyordu (Faz 2), gerçek
zamanlı olaylara hiç bağlanmamıştı (Faz 1'deki plana göre "Faz 2/3'te
sosyal olaylar eklendiğinde" notu vardı — o adım hiç atılmamış).

notify_user() bu ikisini TEK yerde birleştirir: hem uygulama-içi bildirimi
oluşturur hem de kullanıcının kayıtlı push token'ı varsa (push_tokens)
gerçek bir Expo push bildirimi de gönderir. Böylece "Bildirimler" ekranında
görünen her yeni satır, kullanıcının cihazına da bir push olarak düşer.

Bu fonksiyon push gönderiminde HATA olursa (ağ, Expo API, vb.) uygulama-içi
bildirimi ASLA engellemez — push en iyi çaba (best-effort) ile denenir,
başarısızsa sadece log'lanır.
"""

from app.core.database import supabase_admin
from app.services.push_service import send_push_batch


def notify_user(
    user_id: str,
    notif_type: str,
    title: str,
    message: str,
    push_category: str | None = None,
) -> None:
    """
    user_id: bildirimin gideceği kullanıcı.
    notif_type: notifications.type (örn. 'friend_request', 'new_message').
    title / message: hem uygulama-içi bildirim hem push başlığı/gövdesi.
    push_category: notification_log kategori adı — verilmezse notif_type
                   kullanılır (örn. 'friend_request', 'new_message').
    """
    supabase_admin.table("notifications").insert(
        {
            "user_id": user_id,
            "type": notif_type,
            "title": title,
            "message": message,
        }
    ).execute()

    try:
        tokens_res = (
            supabase_admin.table("push_tokens")
            .select("token")
            .eq("user_id", user_id)
            .execute()
        )
        tokens = [r["token"] for r in (tokens_res.data or []) if r.get("token")]
        if tokens:
            send_push_batch(tokens, title, message, push_category or notif_type)
    except Exception as e:
        # Push best-effort — uygulama-içi bildirim zaten kaydedildi, bu
        # hatayı yutup devam ediyoruz (kullanıcı en azından listede görür).
        print(f"NOTIFY_USER push warning (type={notif_type}, user={user_id}): {e}")
