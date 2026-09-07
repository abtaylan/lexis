"""
backend/app/services/job_log.py

Madde 1d — Admin panel: sistem sağlığı / servis durumu takibi.

expire_premium.py, send_schedule_reminders.py ve post_daily_content.py gibi
bağımsız cron script'lerinin her çalışmasını cron_job_runs tablosuna kaydeder,
böylece admin panelde "bu job en son ne zaman, ne sonuçla çalıştı" görülebilir.

Kullanım (script'in main() fonksiyonunu sarmalayarak):

    from app.services.job_log import job_run

    def main():
        ...

    if __name__ == "__main__":
        with job_run("expire_premium") as run:
            result = main()
            run.detail = {"expired_count": result}

Loglama başarısız olursa (örn. tablo henüz migrate edilmemişse) script'in asıl
işi engellenmez — hata sadece stdout'a yazılır (diğer servislerle aynı
"best-effort" deseni).
"""

from __future__ import annotations

from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any

from app.core.database import supabase_admin


# ── "Bugün zaten çalıştı mı?" idempotency kontrolü (7 Eylül 2026) ──
# NEDEN VAR: daily-word-email.yml ve push-reminders.yml GitHub Actions'ta
# günde sadece 1-2 kez tetiklenen cron'lardı — GitHub'ın özellikle tam
# saatteki (06:00 UTC gibi) cron tick'lerini bazen SESSİZCE hiç
# çalıştırmadığı (run bile oluşturmadığı) görüldü: her iki job da
# cron_job_runs tablosunda hiç kayıt bırakmadan günler geçirdi (bkz. 7
# Eylül 2026 araştırması). Çözüm: workflow'lar artık hedef saat aralığında
# birkaç dakikada bir birden fazla kez tetikleniyor (schedule-reminders.yml
# ile aynı, kanıtlanmış-güvenilir desen — o *_/5 * * * * ile hiç
# aksamadan çalışıyor), asıl gönderim işini burada bu fonksiyon
# "bugün zaten başarıyla çalıştı mı" diye kontrol ederek koruyor —
# tekrar tetiklenen denemeler gerçek işi tekrar yapmadan sessizce
# atlanıyor, kullanıcılara aynı e-posta/push'un birden fazla kez
# gitmesi engelleniyor.
def already_ran_today(job_name: str) -> bool:
    """
    job_name için bugün (UTC takvim günü) 'success' ile biten bir çalışma
    var mı? Tablo sorgusu başarısız olursa (örn. henüz migrate edilmemiş)
    False döner — job'un asıl işi engellenmez, en kötü ihtimalle eski
    "tek seferlik" davranışa düşer.
    """
    try:
        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        res = (
            supabase_admin.table("cron_job_runs")
            .select("id")
            .eq("job_name", job_name)
            .eq("status", "success")
            .gte("started_at", today_start.isoformat())
            .limit(1)
            .execute()
        )
        return bool(res.data)
    except Exception as e:
        print(f"JOB LOG WARNING (already_ran_today, {job_name}): {e}")
        return False


class _JobRun:
    def __init__(self, job_name: str):
        self.job_name = job_name
        self.id: str | None = None
        self.detail: dict[str, Any] | None = None


@contextmanager
def job_run(job_name: str):
    """
    Bir cron job çalışmasını cron_job_runs tablosunda 'running' olarak açar,
    blok hatasız biterse 'success', bir istisna fırlarsa 'failed' olarak
    kapatır (istisna yine de yeniden fırlatılır — script'in kendi hata
    davranışı değişmez).
    """
    run = _JobRun(job_name)
    try:
        res = (
            supabase_admin.table("cron_job_runs")
            .insert({"job_name": job_name, "status": "running"})
            .execute()
        )
        if res.data:
            run.id = res.data[0]["id"]
    except Exception as e:
        print(f"JOB LOG WARNING (start, {job_name}): {e}")

    error_text = None
    try:
        yield run
    except Exception as e:
        error_text = str(e)
        raise
    finally:
        if run.id:
            try:
                supabase_admin.table("cron_job_runs").update(
                    {
                        "status": "failed" if error_text else "success",
                        "finished_at": datetime.now(UTC).isoformat(),
                        "detail": run.detail,
                        "error": error_text,
                    }
                ).eq("id", run.id).execute()
            except Exception as e:
                print(f"JOB LOG WARNING (finish, {job_name}): {e}")
