"""
backend/app/core/runtime.py

Madde 1d — Admin panel / sistem sağlığı: process başlangıç zamanı.
Ayrı, minik bir modülde tutuluyor ki circular import olmadan hem
main.py (lifespan) hem de admin_platform.py (uptime hesaplamak için)
aynı değeri okuyabilsin.
"""

import time

START_TIME = time.time()
