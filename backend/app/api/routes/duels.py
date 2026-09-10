"""
backend/app/api/routes/duels.py

V2 Yol Haritası §6.3 (Faz 3a) — Gerçek Zamanlı Düello, oda yaşam döngüsü.

KAPSAM (bilinçli sınır): bu modül SADECE oda oluştur/listele/katıl/ayrıl/
durum uçlarını içerir ("REST katmanı", plan §6.3/3a'nın tanımladığı gibi).
Round üretimi (hangi kelimeler sorulacak, seçenekler) ve gerçek oyun akışı
(soru sun / cevap al / puanla) BİLİNÇLİ OLARAK bu alt-fazda YOK — sebebi:
duel_rounds çok-oyunculu bir modelde her katılımcının FARKLI native_lang'i
olabilir (games.py'deki tek-oyunculu "general_word_pool" sorgusu
source_lang+target_lang ikilisine göre çalışıyor, ama bir duel odasında 2+
kullanıcının target_lang'i farklıysa hangi dilde anlam gösterileceği henüz
kullanıcıyla netleşmemiş bir ürün kararı). Bu karar, round-servis uçlarıyla
birlikte frontend akışı tasarlanırken (plan §6.3/3e) netleştirilip
uygulanacak — o zamana kadar tahmine dayalı bir tasarım kararı dayatmamak
için burada YARIM bırakıldı, "start" ucu sadece oda durumunu 'active'e
çeker.

Gerçek zamanlı yayın (Realtime broadcast/presence) da bu dosyada YOK — plan
§6.3/3a'nın kendi notuna göre FastAPI sadece state/skor KALICILIĞINI yönetir,
canlı senkronizasyon istemcilerin doğrudan Supabase Realtime channel'larına
bağlanmasıyla yapılacak (ayrı bir alt-adım).
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.duels import (
    DuelCreate,
    DuelListResponse,
    DuelParticipantItem,
    DuelResponse,
    DuelStatusResponse,
)

router = APIRouter()


def _get_learning_lang(user_id: str) -> str:
    profile = (
        supabase_admin.table("profiles")
        .select("learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return (profile.data or {}).get("learning_lang", "en")


def _get_duel_or_404(duel_id: str) -> dict:
    duel = (
        supabase_admin.table("duels")
        .select("*")
        .eq("id", duel_id)
        .single()
        .execute()
    )
    if not duel.data:
        raise HTTPException(status_code=404, detail="Düello odası bulunamadı.")
    return duel.data


def _participant_count(duel_id: str) -> int:
    result = (
        supabase_admin.table("duel_participants")
        .select("user_id", count="exact")
        .eq("duel_id", duel_id)
        .is_("left_at", "null")
        .execute()
    )
    return result.count or 0


def _to_duel_response(duel: dict) -> DuelResponse:
    return DuelResponse(
        id=duel["id"],
        mode=duel["mode"],
        status=duel["status"],
        learning_lang=duel["learning_lang"],
        created_by=duel["created_by"],
        max_players=duel["max_players"],
        round_count=duel["round_count"],
        created_at=duel["created_at"],
        started_at=duel.get("started_at"),
        ended_at=duel.get("ended_at"),
        participant_count=_participant_count(duel["id"]),
    )


@router.post("", response_model=DuelResponse, status_code=201)
async def create_duel(
    duel_in: DuelCreate,
    current_user=Depends(get_current_user),
):
    """Yeni düello odası aç. Oluşturan kullanıcı otomatik olarak ilk
    katılımcı olarak eklenir."""
    learning_lang = duel_in.learning_lang or _get_learning_lang(current_user.id)

    result = (
        supabase_admin.table("duels")
        .insert(
            {
                "learning_lang": learning_lang,
                "created_by": current_user.id,
                "max_players": duel_in.max_players,
                "round_count": duel_in.round_count,
            }
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Düello odası oluşturulamadı.")
    duel = result.data[0]

    supabase_admin.table("duel_participants").insert(
        {"duel_id": duel["id"], "user_id": current_user.id}
    ).execute()

    return _to_duel_response(duel)


@router.get("", response_model=DuelListResponse)
async def list_duels(
    learning_lang: str | None = Query(default=None),
    current_user=Depends(get_current_user),
):
    """Lobi — katılıma açık ('waiting') odaların listesi. Varsayılan olarak
    kullanıcının kendi öğrenme diline göre filtrelenir (farklı dil
    öğrenen kullanıcılarla eşleşme anlamsız — general_word_pool tek bir
    source_lang'e göre round üretecek)."""
    active_lang = learning_lang or _get_learning_lang(current_user.id)

    rows = (
        supabase_admin.table("duels")
        .select("*")
        .eq("status", "waiting")
        .eq("learning_lang", active_lang)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
        .data
    ) or []
    return DuelListResponse(items=[_to_duel_response(d) for d in rows])


@router.get("/{duel_id}", response_model=DuelStatusResponse)
async def get_duel_status(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    """Oda durumu + katılımcı listesi (canlı skor tablosu). Round içeriği
    (soru/doğru cevap) bilinçli olarak burada yok — bkz. modül docstring'i."""
    duel = _get_duel_or_404(duel_id)

    participant_rows = (
        supabase_admin.table("duel_participants")
        .select("user_id, score, joined_at, left_at")
        .eq("duel_id", duel_id)
        .order("score", desc=True)
        .execute()
        .data
    ) or []

    user_ids = [p["user_id"] for p in participant_rows]
    profiles_by_id: dict[str, dict] = {}
    if user_ids:
        profile_rows = (
            supabase_admin.table("profiles")
            .select("id, username, avatar_url")
            .in_("id", user_ids)
            .execute()
            .data
        ) or []
        profiles_by_id = {p["id"]: p for p in profile_rows}

    participants = [
        DuelParticipantItem(
            user_id=p["user_id"],
            username=profiles_by_id.get(p["user_id"], {}).get("username"),
            avatar_url=profiles_by_id.get(p["user_id"], {}).get("avatar_url"),
            score=p["score"],
            joined_at=p["joined_at"],
            left_at=p.get("left_at"),
        )
        for p in participant_rows
    ]

    base = _to_duel_response(duel)
    return DuelStatusResponse(**base.model_dump(), participants=participants)


@router.post("/{duel_id}/join", response_model=DuelResponse)
async def join_duel(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    duel = _get_duel_or_404(duel_id)
    if duel["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Bu odaya artık katılınamaz.")

    existing = (
        supabase_admin.table("duel_participants")
        .select("user_id, left_at")
        .eq("duel_id", duel_id)
        .eq("user_id", current_user.id)
        .execute()
        .data
    )
    if existing:
        if existing[0].get("left_at"):
            supabase_admin.table("duel_participants").update(
                {"left_at": None}
            ).eq("duel_id", duel_id).eq("user_id", current_user.id).execute()
        return _to_duel_response(duel)

    if _participant_count(duel_id) >= duel["max_players"]:
        raise HTTPException(status_code=400, detail="Oda dolu.")

    supabase_admin.table("duel_participants").insert(
        {"duel_id": duel_id, "user_id": current_user.id}
    ).execute()

    return _to_duel_response(duel)


@router.post("/{duel_id}/leave", status_code=204)
async def leave_duel(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    _get_duel_or_404(duel_id)
    supabase_admin.table("duel_participants").update(
        {"left_at": datetime.now(UTC).isoformat()}
    ).eq("duel_id", duel_id).eq("user_id", current_user.id).execute()


@router.post("/{duel_id}/start", response_model=DuelResponse)
async def start_duel(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    """Sadece odayı açan kullanıcı başlatabilir. En az 2 katılımcı gerekir.

    NOT: bu uç SADECE durumu 'active'e çekip started_at'i işaretler — round
    üretimi bilinçli olarak burada YOK (bkz. modül docstring'i). Yani şu an
    "başlat"tan sonra oynanabilir bir tur yok; bu, round-servis
    uçlarının ekleneceği bir sonraki alt-fazın (3e) işi.
    """
    duel = _get_duel_or_404(duel_id)
    if duel["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece oda sahibi başlatabilir.")
    if duel["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Oda zaten başlatılmış veya bitmiş.")
    if _participant_count(duel_id) < 2:
        raise HTTPException(status_code=400, detail="Başlamak için en az 2 katılımcı gerekiyor.")

    result = (
        supabase_admin.table("duels")
        .update({"status": "active", "started_at": datetime.now(UTC).isoformat()})
        .eq("id", duel_id)
        .execute()
    )
    return _to_duel_response(result.data[0])
