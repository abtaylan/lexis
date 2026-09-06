"""
backend/app/core/tokens.py

Basit HMAC tabanlı imzalı token üretimi — giriş yapmadan tıklanabilen
tek-tık işlemler için (örn. e-posta bildirim aboneliğinden çıkma linki,
bkz. app/services/email_service.py::send_daily_word_email ve
app/api/routes/notifications.py::unsubscribe).

JWT gibi ayrı bir kütüphane eklemeye gerek yok: token içinde taşınan tek
bilgi user_id + işlem adı, hassas veri değil — tek amaç "bu linki tıklayan
gerçekten bu kullanıcı için üretilmiş bir link mi" doğrulaması. SECRET_KEY
ile imzalanır, böylece kullanıcı user_id'sini bilse bile geçerli bir token
üretemez.
"""

import hashlib
import hmac

from app.core.config import settings


def make_action_token(user_id: str, action: str) -> str:
    msg = f"{user_id}:{action}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()[:24]


def verify_action_token(user_id: str, action: str, token: str) -> bool:
    expected = make_action_token(user_id, action)
    return hmac.compare_digest(expected, token or "")
