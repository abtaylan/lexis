"""
Supabase auth.users için sayfalama destekli ortak yardımcı.

Kök neden (9 Eylül 2026, admin.py'de bulundu): supabase_admin.auth.admin.list_users()
sayfalama parametresi verilmeden çağrıldığında GoTrue admin API'sinin varsayılanı
per_page=50 ile TEK SAYFA dönüyor. Kullanıcı sayısı 50'yi geçtiğinde bu deseni
kullanan her yer (e-posta eşleştirme, e-posta ile kullanıcı arama, toplu e-posta
gönderimi vb.) sessizce eksik/yanlış çalışıyor. Bu modül TÜM sayfaları gezen tek
bir ortak fonksiyon sağlıyor — aynı deseni ayrı ayrı kopyalamak yerine buradan
import edilmeli.
"""

from app.core.database import supabase_admin


def list_all_auth_users(max_pages: int = 50) -> list:
    """auth.users tablosundaki TÜM kullanıcıları (sayfalayarak) döner."""
    all_users: list = []
    page_num = 1
    while page_num <= max_pages:
        page = supabase_admin.auth.admin.list_users(page=page_num, per_page=200)
        users = page if isinstance(page, list) else getattr(page, "users", [])
        if not users:
            break
        all_users.extend(users)
        if len(users) < 200:
            break
        page_num += 1
    return all_users
