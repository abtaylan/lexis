"""
backend/app/schemas/organizations.py

V2 Yol Haritası §6.3 (Faz 3d) — B2B / kurumsal ligler şemaları.

13 Eylül 2026 — Öncelik #9 (Kurumsal/Dershane B2B Satış Paketi, migration
070): kurum artık bir "paket" taşıyor — plan (serbest metin paket adı),
member_limit (azami üye sayısı, NULL = sınırsız), expires_at (abonelik
bitiş tarihi, NULL = süresiz), notes (admin'in kendi takibi için serbest
not — sözleşme/fatura no, iletişim kişisi vb.). Ödeme/tahsilat BİLİNÇLİ
OLARAK manuel/fatura bazlı kaldı (bkz. migration 070 yorumu) — admin
müşteriyle kendisi anlaşıyor, buraya sadece sonucu (plan+limit+süre)
giriyor. `notes` SADECE admin uçlarında (AdminOrganizationItem) döner,
kurum üyelerinin gördüğü OrganizationItem'da YOK.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    # 13 Eylül 2026 — self-serve oluşturma kapatıldı (madde 9 B2B satış
    # paketi kapsamı netleşirken): artık SADECE admin (get_current_admin_full)
    # bu uca istek atabiliyor, müşterinin kendi Lexis hesabının e-postasını
    # owner_email olarak verip onu 'owner' yapıyor — admin kurumun üyesi
    # OLMUYOR (bkz. routes/organizations.py::create_organization).
    owner_email: str = Field(min_length=3, max_length=255)
    # Öncelik #9 (B2B Satış Paketi) — hepsi opsiyonel, admin boş bırakırsa
    # sınırsız/süresiz bir kurum açılır (mevcut davranışla geriye dönük
    # uyumlu).
    plan: str = Field(default="free", max_length=20)
    member_limit: int | None = Field(default=None, gt=0)
    expires_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)


class OrganizationAdminUpdate(BaseModel):
    """Admin panelinden mevcut bir kurumun paket bilgilerini güncelleme —
    hepsi opsiyonel (sadece gönderilen alanlar değişir, bkz. routes'taki
    `exclude_unset`)."""
    name: str | None = Field(default=None, min_length=2, max_length=100)
    plan: str | None = Field(default=None, max_length=20)
    member_limit: int | None = Field(default=None, gt=0)
    expires_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)


class OrganizationItem(BaseModel):
    id: str
    name: str
    plan: str
    created_at: datetime
    my_role: str
    # Öncelik #9 — kurum üyesi kendi paketinin limitini/süresini görebilir
    # (davet ekranında "X/Y üye" + süre uyarısı için), ama `notes` YOK.
    # `is_expired` backend'de hesaplanıp geliyor (frontend'de Date.now()
    # ile render sırasında hesaplama YAPILMIYOR — React purity kuralı).
    member_limit: int | None = None
    expires_at: datetime | None = None
    is_expired: bool = False


class OrganizationListResponse(BaseModel):
    items: list[OrganizationItem]


class OrganizationMemberItem(BaseModel):
    user_id: str
    username: str | None = None
    email: str | None = None
    role: str
    joined_at: datetime
    total_xp: int = 0
    # Faz 3 madde G (KVKK onay mekanizması) — bu üye kurum raporlarında
    # (top_learners) isimli görünmeye açıkça onay verdi mi. bkz.
    # organization_report_service.py + migration 067.
    consent_given: bool = False


class OrganizationMembersResponse(BaseModel):
    items: list[OrganizationMemberItem]


class OrganizationInviteRequest(BaseModel):
    email: str
    role: str = Field(default="member")


class OrganizationConsentRequest(BaseModel):
    consent: bool


class OrganizationConsentResponse(BaseModel):
    consent_given: bool
    consented_at: datetime | None = None


# ── Admin paneli — TÜM kurumların listesi (13 Eylül 2026) ──────────────
# list_my_organizations (yukarısı) sadece isteği yapanın ÜYE olduğu
# kurumları döner; admin artık oluşturduğu kurumların üyesi olmadığı
# için admin panelin göreceği ayrı, daha geniş bir görünüm.
class AdminOrganizationItem(BaseModel):
    id: str
    name: str
    plan: str
    created_at: datetime
    member_count: int
    owner_email: str | None = None
    owner_username: str | None = None
    # Öncelik #9 (B2B Satış Paketi) — sadece admin görür, `notes` dahil.
    member_limit: int | None = None
    expires_at: datetime | None = None
    is_expired: bool = False
    notes: str | None = None


class AdminOrganizationListResponse(BaseModel):
    items: list[AdminOrganizationItem]
