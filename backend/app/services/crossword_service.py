"""
backend/app/services/crossword_service.py

Cengel bulmaca (hook crossword) oyun modu -- 18 Kasim 2026 kullanici
istegi. 200 sabit seviye, (learning_lang, native_lang) basina paylasilan
katalog -- herkes ayni "Level N"yi cozuyor. Bir seviye ilk istendiginde
burada uretilip crossword_puzzles/crossword_puzzle_words'e yaziliyor
(lazy + cache), sonraki istekler DB'den okunuyor. Ilerleme (hangi seviyede
olundugu) kullanicinin genel kelime seviyesinden BAGIMSIZ, her zaman 1'den
basliyor (bkz. user_crossword_progress, migration 095).

Zorluk kademesi general_word_pool.difficulty_level (beginner/intermediate/
advanced -- 3 bant) uzerinden; Ileri (101-150) ve Advance (151-200) ayni
DB bandini (advanced) kullanir, Advance'i daha zor yapan sey daha fazla
kelime + daha buyuk grid (bkz. _tier_for_level).
"""

from __future__ import annotations

import random
import re
from dataclasses import dataclass

from app.core.database import supabase_admin

MAX_LEVEL = 200

# (ust_sinir_level, db_band, tier_adi_tr, tier_kelime_bonusu, tamamlama_bonus_xp)
_TIER_TABLE: list[tuple[int, str, str, int, int]] = [
    (50, "beginner", "Başlangıç", 0, 20),
    (100, "intermediate", "Orta", 1, 30),
    (150, "advanced", "İleri", 2, 45),
    (200, "advanced", "Advance", 4, 60),
]

_WORD_RE = re.compile(r"^\S{3,12}$")  # bosluksuz, 3-12 karakter (grid'e sigsin)


@dataclass
class TierInfo:
    name: str
    band: str
    word_count: int
    grid_width: int
    grid_height: int
    completion_xp: int


def tier_for_level(level: int) -> TierInfo:
    if level < 1 or level > MAX_LEVEL:
        raise ValueError(f"Gecersiz seviye: {level} (1-{MAX_LEVEL} araliginda olmali)")
    for upper, band, name, bonus, completion_xp in _TIER_TABLE:
        if level <= upper:
            word_count = min(5 + (level - 1) // 25 + bonus, 18)
            grid_width = min(word_count + 4, 14)
            grid_height = min(word_count + 6, 16)
            return TierInfo(name, band, word_count, grid_width, grid_height, completion_xp)
    raise AssertionError("unreachable")


def all_tiers_summary() -> list[dict]:
    """Mobil 'Level 1, Level 2 ...' listesi icin seviye araliklarinin ozeti."""
    out = []
    lower = 1
    for upper, band, name, _bonus, completion_xp in _TIER_TABLE:
        out.append({
            "name": name,
            "band": band,
            "level_from": lower,
            "level_to": upper,
            "completion_xp": completion_xp,
        })
        lower = upper + 1
    return out


def _candidate_words(learning_lang: str, native_lang: str, band: str, limit: int) -> list[dict]:
    rows = (
        supabase_admin.table("general_word_pool")
        .select("id, word, meaning")
        .eq("source_lang", learning_lang)
        .eq("target_lang", native_lang)
        .eq("difficulty_level", band)
        .eq("is_active", True)
        .limit(limit * 6)  # filtrelemeden (bosluk/uzunluk) sonra yeterli kalsin diye bol cek
        .execute()
        .data
    ) or []
    clean = [r for r in rows if r.get("word") and _WORD_RE.match(r["word"].strip())]
    random.shuffle(clean)
    return clean[:limit]


class _Grid:
    """Basit kesisme-tabanli bulmaca yerlestirici (backtracking degil,
    acgozlu/greedy -- her kelime icin ilk uygun kesisimi kabul eder, yoksa
    izole bir satira duser. Uretim bir kez yapilip DB'ye yazildigi icin
    mukemmel paketleme yerine HIZLI ve HER ZAMAN BASARILI olmasi tercih
    edildi)."""

    def __init__(self, max_width: int, max_height: int):
        self.max_width = max_width
        self.max_height = max_height
        self.cells: dict[tuple[int, int], str] = {}
        self.placed: list[dict] = []
        self._next_isolated_row = 0

    def _fits(self, word: str, row: int, col: int, direction: str) -> bool:
        for i, ch in enumerate(word):
            r = row + (i if direction == "down" else 0)
            c = col + (i if direction == "across" else 0)
            if r < 0 or c < 0 or r >= self.max_height or c >= self.max_width:
                return False
            existing = self.cells.get((r, c))
            if existing is not None and existing != ch:
                return False
        return True

    def _commit(self, word_row: dict, row: int, col: int, direction: str, answer: str):
        for i, ch in enumerate(answer):
            r = row + (i if direction == "down" else 0)
            c = col + (i if direction == "across" else 0)
            self.cells[(r, c)] = ch
        self.placed.append({**word_row, "row_start": row, "col_start": col, "direction": direction, "answer": answer})
        self._next_isolated_row = max(self._next_isolated_row, row + (len(answer) if direction == "down" else 1) + 1)

    def place(self, word_row: dict):
        answer = word_row["word"].strip().upper()
        if not self.placed:
            # ilk kelime: yatay, ustten/soldan biraz pay birakarak ortaya yakin
            row = self.max_height // 2
            col = max(0, (self.max_width - len(answer)) // 2)
            if self._fits(answer, row, col, "across"):
                self._commit(word_row, row, col, "across", answer)
                return
        # kesisim ara: mevcut hucrelerden ayni harfi paylasan bir yerlesim bul
        candidates: list[tuple[int, int, str]] = []
        for i, ch in enumerate(answer):
            for (r, c), existing_ch in self.cells.items():
                if existing_ch != ch:
                    continue
                candidates.append((r - i, c, "down"))   # dikey: kesisim hucresi (r,c)'de i. harf
                candidates.append((r, c - i, "across"))  # yatay
        random.shuffle(candidates)
        for row, col, direction in candidates:
            if self._fits(answer, row, col, direction):
                self._commit(word_row, row, col, direction, answer)
                return
        # kesisim bulunamadi: izole, kendi satirina yatay yerlestir (garanti basari)
        row = min(self._next_isolated_row, self.max_height - 1)
        col = 0
        if self._fits(answer, row, col, "across"):
            self._commit(word_row, row, col, "across", answer)
        # (son care basarisizsa -- grid cok kucukse -- kelime sessizce atlanir;
        # cagiran taraf word_count'un gercek len(placed) ile hafif farkli
        # olabilecegini hesaba katmali)

    def normalize(self) -> tuple[int, int]:
        """Koordinatlari 0'a hizalar, gercek bounding box genislik/yukseklik dondurur."""
        if not self.placed:
            return (0, 0)
        min_row = min(p["row_start"] for p in self.placed)
        min_col = min(p["col_start"] for p in self.placed)
        max_row = max_col = 0
        for p in self.placed:
            p["row_start"] -= min_row
            p["col_start"] -= min_col
            end_row = p["row_start"] + (len(p["answer"]) - 1 if p["direction"] == "down" else 0)
            end_col = p["col_start"] + (len(p["answer"]) - 1 if p["direction"] == "across" else 0)
            max_row = max(max_row, end_row)
            max_col = max(max_col, end_col)
        return (max_col + 1, max_row + 1)


def _generate_puzzle_rows(learning_lang: str, native_lang: str, level: int) -> dict:
    tier = tier_for_level(level)
    words = _candidate_words(learning_lang, native_lang, tier.band, tier.word_count)
    if len(words) < 3:
        # Bu dil/seviye kombinasyonu icin havuzda yeterli kelime yok.
        raise LookupError(
            f"'{learning_lang}->{native_lang}' icin '{tier.band}' bandinda yeterli kelime yok "
            f"({len(words)} bulundu, en az 3 gerekiyor)."
        )
    # uzun kelimeleri once yerlestirmek kesisim basarisini artirir (klasik kural)
    words.sort(key=lambda w: len(w["word"].strip()), reverse=True)

    grid = _Grid(tier.grid_width, tier.grid_height)
    for w in words:
        grid.place(w)

    grid_width, grid_height = grid.normalize()
    return {
        "tier": tier,
        "grid_width": grid_width,
        "grid_height": grid_height,
        "placed": grid.placed,
    }


def get_or_create_puzzle(learning_lang: str, native_lang: str, level: int) -> dict:
    """Var olan bulmacayi DB'den okur; yoksa uretir ve yazar. Donus: puzzle
    satiri + kelime listesi (answer DAHIL -- bu fonksiyon SADECE backend ici
    kullanim icindir, answer'i istemciye gondermeden once api/routes/
    crossword.py filtrelemeli)."""
    existing = (
        supabase_admin.table("crossword_puzzles")
        .select("*, crossword_puzzle_words(*)")
        .eq("learning_lang", learning_lang)
        .eq("native_lang", native_lang)
        .eq("level", level)
        .execute()
        .data
    )
    if existing:
        return existing[0]

    built = _generate_puzzle_rows(learning_lang, native_lang, level)
    tier = built["tier"]
    puzzle_insert = (
        supabase_admin.table("crossword_puzzles")
        .insert({
            "learning_lang": learning_lang,
            "native_lang": native_lang,
            "level": level,
            "tier": tier.band,
            "grid_width": built["grid_width"],
            "grid_height": built["grid_height"],
            "word_count": len(built["placed"]),
        })
        .execute()
        .data
    )
    puzzle = puzzle_insert[0]

    word_rows = [
        {
            "puzzle_id": puzzle["id"],
            "general_word_id": p["id"],
            "clue_text": p["meaning"],
            "answer": p["answer"],
            "row_start": p["row_start"],
            "col_start": p["col_start"],
            "direction": p["direction"],
            "answer_length": len(p["answer"]),
        }
        for p in built["placed"]
    ]
    inserted_words = (
        supabase_admin.table("crossword_puzzle_words").insert(word_rows).execute().data
    ) or []
    puzzle["crossword_puzzle_words"] = inserted_words
    return puzzle


def get_user_progress(user_id: str, learning_lang: str) -> int:
    rows = (
        supabase_admin.table("user_crossword_progress")
        .select("current_level")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
        .data
    ) or []
    return rows[0]["current_level"] if rows else 1


def advance_user_progress(user_id: str, learning_lang: str, completed_level: int) -> int:
    """completed_level bitince ilerlemeyi bir sonraki seviyeye tasir (max
    MAX_LEVEL). Zaten daha ileri bir seviyedeyse (ayni bulmaca tekrar
    cozulduyse) geri almaz."""
    current = get_user_progress(user_id, learning_lang)
    next_level = min(max(current, completed_level + 1), MAX_LEVEL)
    supabase_admin.table("user_crossword_progress").upsert(
        {
            "user_id": user_id,
            "learning_lang": learning_lang,
            "current_level": next_level,
        },
        on_conflict="user_id,learning_lang",
    ).execute()
    return next_level
