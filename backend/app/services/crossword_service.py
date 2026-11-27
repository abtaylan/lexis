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

23 Kasim 2026 kullanici isteği ("her kelime bir biri ile bağlantılı olur,
hiç ayrık olmaması lazım"): _Grid.place_connected ARTIK izole (baska hicbir
kelimeyle kesismeyen) yerlestirmeyi tamamen yasakliyor -- kesisim bulamayan
kelime yerlestirilmeden elenir, _generate_puzzle_rows de elenenlerin yerine
daha genis bir aday havuzundan (word_count*_POOL_MULTIPLIER) digerlerini
deneyerek (_MAX_GRID_ATTEMPTS kez) hedef kelime sayisina ulasmaya calisir.
Sonuc: uretilen her bulmaca TEK bir bagli bilesendir (bkz. o fonksiyonlarin
docstring'leri).

23 Kasim 2026 -- UC MOD (bkz. migration 096_crossword_puzzle_modes.sql):
  standard  -> (eskisi gibi) ana dildeki ipucu -> ogrenilen dildeki kelime,
               general_word_pool'dan, (learning_lang, native_lang, level)
               basina PAYLASILAN tek bulmaca (user_id NULL).
  reverse   -> ogrenilen dildeki kelimenin KENDISI ipucu -> ana dildeki
               karsiligi bulunur; yine general_word_pool'dan ama 'answer'
               artik meaning alaninin ILK (virgulle ayrilmis) tek kelimelik
               parcasi -- meaning coklu es anlamli bir ifade oldugunda
               (orn. "aile, soy") digerleri atilir, ilk parca _WORD_RE'den
               gecmezse (bosluklu/cok uzun bir ifadeyse) o kelime tamamen
               elenir. Yine PAYLASILAN (user_id NULL).
  own_pool  -> kullanicinin KENDI 'words' (Kelimelerim) listesinden --
               genel havuzdan FARKLI olarak HER KULLANICIYA OZEL uretilip
               saklanir (user_id dolu); difficulty_level bandi yok (words
               tablosunda bu alan yok), kullanicinin o dil ciftindeki TUM
               kelimeleri aday havuzu olur.
"""

from __future__ import annotations

import random
import re
from dataclasses import dataclass

from app.core.database import supabase_admin

MAX_LEVEL = 200

# 23 Kasim 2026: uc bulmaca modu (bkz. modul docstring'i).
VALID_MODES = ("standard", "reverse", "own_pool")

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
            # Grid 4/6 yerine 6/9 pay birakiyor -- 18 Kasim 2026 _fits()
            # sikilastirmasi (bitisiklik kontrolu) daha az kesisim kabul
            # ediyor, bu da izole-satir yedegine daha sik dusulmesine yol
            # aciyordu; daha genis grid bu yedegin basarisizlik oranini
            # (hucre tukenmesiyle kelimenin sessizce atlanmasi) belirgin
            # dusuruyor (bkz. /tmp/test_crossword_fits.py simulasyonu:
            # 5 kelimelik en kucuk kademede TAM yerlesim orani ~58%->~84%).
            grid_width = min(word_count + 6, 16)
            grid_height = min(word_count + 9, 19)
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


def _candidate_rows(
    mode: str, learning_lang: str, native_lang: str, band: str, limit: int, user_id: str | None = None
) -> list[dict]:
    """Moda gore aday kelime satirlarini getirir, HEPSINI ayni normalize
    sekle (source_table, source_id, clue_text, answer) cevirir -- boylece
    _Grid ve _generate_puzzle_rows kaynaktan BAGIMSIZ calisabilir.

    - standard: general_word_pool, answer=word (ogrenilen dil), clue=meaning
      (ana dil).
    - reverse: general_word_pool, answer=meaning'in ILK virgul-oncesi parcasi
      (ana dil, TEK kelime olmali), clue=word (ogrenilen dil). meaning coklu
      es anlamli bir ifadeyse ilk parca disindakiler atilir; ilk parca da
      _WORD_RE'den gecmezse (bosluklu/cok uzun) o kelime tamamen elenir.
    - own_pool: kullanicinin 'words' (Kelimelerim) tablosu, answer=word,
      clue=meaning -- difficulty band FILTRESI YOK (words tablosunda yok),
      SADECE o kullanicinin o dil ciftindeki kelimeleri.
    """
    if mode == "own_pool":
        assert user_id is not None, "own_pool modu icin user_id sart"
        rows = (
            supabase_admin.table("words")
            .select("id, word, meaning")
            .eq("user_id", user_id)
            .eq("source_lang", learning_lang)
            .eq("target_lang", native_lang)
            .limit(limit * 6)
            .execute()
            .data
        ) or []
        out = []
        for r in rows:
            word = (r.get("word") or "").strip()
            if not word or not _WORD_RE.match(word):
                continue
            out.append({
                "source_table": "words",
                "source_id": r["id"],
                "clue_text": (r.get("meaning") or "").strip(),
                "answer": word.upper(),
            })
        random.shuffle(out)
        return out[:limit]

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
    out = []
    for r in rows:
        word = (r.get("word") or "").strip()
        meaning = (r.get("meaning") or "").strip()
        if mode == "reverse":
            answer = meaning.split(",")[0].strip()
            clue_text = word
        else:
            answer = word
            clue_text = meaning
        if not answer or not _WORD_RE.match(answer):
            continue
        out.append({
            "source_table": "general_word_pool",
            "source_id": r["id"],
            "clue_text": clue_text,
            "answer": answer.upper(),
        })
    random.shuffle(out)
    return out[:limit]


# 23 Kasim 2026 kullanici isteği: "Cengel bulmacada her kelime birbiri ile
# baglantili olur, hic ayrik olmamasi lazim" -- asagidaki _Grid.place_connected
# artik izole-satir yedegine HICBIR ZAMAN dusmuyor (bkz. o fonksiyonun
# docstring'i). Bunun bedeli, havuzda kesisim bulamayan kelimelerin
# yerlestirilmeden ELENMESI -- bu yuzden burada hedeflenenden COK DAHA GENIS
# bir aday havuzu cekip (_candidate_rows / _generate_puzzle_rows), elenen
# kelimelerin yerine havuzdaki digerleriyle degistirilebilmesini sagliyoruz.
_POOL_MULTIPLIER = 6
_MAX_GRID_ATTEMPTS = 40


class _Grid:
    """Kesisme-tabanli bulmaca yerlestirici (backtracking degil, acgozlu/
    greedy -- her kelime icin rastgele sirali kesisim adaylarindan ilk
    UYGUN olani kabul eder).

    23 Kasim 2026 kullanici isteği: eskiden kesisim bulunamayan kelime
    "izole", kendi satirina ayri yatay bir kelime olarak yerlestirilirdi
    (hicbir baska kelimeyle kesismeden) -- kullanici bunun yanlis oldugunu
    bildirdi: "her kelime bir biri ile bağlantılı olur, hiç ayrık olmaması
    lazım". Artik place_connected() kesisim bulamadigi kelimeyi YERLESTIRMEZ
    (False doner) -- izole fallback tamamen kaldirildi. Cagiran taraf
    (_generate_puzzle_rows) elenen kelimelerin yerine havuzdaki digerleriyle
    bos yer doldurmaya calisir; boylece uretilen bulmaca HER ZAMAN tek bir
    bagli bilesen olur (ilk kelime haric her kelime zaten yerlesmis bir
    hucreyle kesisir)."""

    def __init__(self, max_width: int, max_height: int):
        self.max_width = max_width
        self.max_height = max_height
        self.cells: dict[tuple[int, int], str] = {}
        self.placed: list[dict] = []

    def _fits(self, word: str, row: int, col: int, direction: str) -> bool:
        """Harf celismesinin yani sira -- KULLANICI GERI BILDIRIMI (18 Kasim
        2026): "Mutlu kelimesinin karsiligi HAPPY ama ustteki satirda R
        harfi vardi, mantiken yanlis oluyor" -- iki kural daha kontrol eder:
        (1) kelimenin hemen oncesi/sonrasi (kendi yonunde) bos olmali, baska
        bir kelimeye bitisik baslamasin/bitmesin; (2) kelimenin KESISIM
        OLMAYAN her hucresinde, dik komsu hucreler de bos olmali -- aksi
        halde alakasiz iki kelime yan yana/ust uste "bitisik" gorunur (ortak
        harfli GERCEK bir kesisim degil, sadece tesaduf). Eskiden sadece
        "ayni hucrede FARKLI harf var mi" kontrol ediliyordu, bu da iki
        kelimenin hic kesismeden teget gecmesine izin veriyordu."""
        n = len(word)
        before = (row - 1, col) if direction == "down" else (row, col - 1)
        after = (row + n, col) if direction == "down" else (row, col + n)
        if self.cells.get(before) is not None:
            return False
        if self.cells.get(after) is not None:
            return False
        for i, ch in enumerate(word):
            r = row + (i if direction == "down" else 0)
            c = col + (i if direction == "across" else 0)
            if r < 0 or c < 0 or r >= self.max_height or c >= self.max_width:
                return False
            existing = self.cells.get((r, c))
            if existing is not None:
                if existing != ch:
                    return False
                # Gercek kesisim hucresi -- dik komsu kontrolu burada
                # ISTENEREK atlanir (kesisen diger kelime zaten bu hucreden
                # dik yonde geciyor, bu beklenen/istenen durum).
                continue
            # Bos hucre: bu, baska bir kelimeyle GERCEK bir kesisim degil --
            # o zaman dik komsulari da bos olmali, yoksa alakasiz bir
            # kelimenin hucresine sessizce bitisik yerlesmis oluruz.
            if direction == "across":
                if self.cells.get((r - 1, c)) is not None or self.cells.get((r + 1, c)) is not None:
                    return False
            else:
                if self.cells.get((r, c - 1)) is not None or self.cells.get((r, c + 1)) is not None:
                    return False
        return True

    def _commit(self, word_row: dict, row: int, col: int, direction: str, answer: str):
        for i, ch in enumerate(answer):
            r = row + (i if direction == "down" else 0)
            c = col + (i if direction == "across" else 0)
            self.cells[(r, c)] = ch
        self.placed.append({**word_row, "row_start": row, "col_start": col, "direction": direction, "answer": answer})

    def place_connected(self, word_row: dict) -> bool:
        """Kelimeyi SADECE kesisimle yerlestirir (ilk kelime haric); kesisim
        bulunamazsa hicbir sey yapmadan False doner -- izole fallback YOK
        (bkz. sinif docstring'i). Basariysa True doner."""
        # word_row artik _candidate_rows tarafindan ONCEDEN normalize edilmis
        # geliyor ("answer" alani zaten buyuk harfe cevrilmis) -- kaynak
        # tablo (general_word_pool / words) farketmeksizin.
        answer = word_row["answer"]
        if not self.placed:
            # ilk kelime: yatay, ustten/soldan biraz pay birakarak ortaya yakin
            row = self.max_height // 2
            col = max(0, (self.max_width - len(answer)) // 2)
            if self._fits(answer, row, col, "across"):
                self._commit(word_row, row, col, "across", answer)
                return True
            return False
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
                return True
        return False

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


def _generate_puzzle_rows(
    mode: str, learning_lang: str, native_lang: str, level: int, user_id: str | None = None
) -> dict:
    tier = tier_for_level(level)
    # 23 Kasim 2026: hedeften COK DAHA GENIS bir aday havuzu cekiyoruz --
    # kesisim bulamayan kelimeler artik izole yerlestirilmek yerine ELENIYOR
    # (bkz. _Grid.place_connected), o yuzden yerlerine koyacak yedeklerimiz
    # olmasi lazim.
    pool = _candidate_rows(mode, learning_lang, native_lang, tier.band, tier.word_count * _POOL_MULTIPLIER, user_id=user_id)
    if len(pool) < 3:
        if mode == "own_pool":
            # own_pool'da sebep HER ZAMAN "yeterli kelime eklenmemis" --
            # kullaniciya aksiyon alinabilir bir mesaj verelim.
            raise LookupError(
                "Bu bulmaca modu icin 'Kelimelerim' listende bu dil ciftinde "
                f"en az 3 kelime olmali (su an {len(pool)} tane var)."
            )
        raise LookupError(
            f"'{learning_lang}->{native_lang}' icin '{tier.band}' bandinda yeterli kelime yok "
            f"({len(pool)} bulundu, en az 3 gerekiyor)."
        )

    # Her denemede: uzun kelimeleri once yerlestirmek kesisim basarisini
    # artirir (klasik kural), ama kesisim adaylari da rastgele siralandigi
    # icin (bkz. place_connected) farkli denemeler farkli yerlesimler verir
    # -- en iyisini (en cok kelime yerlestireni) tutuyoruz. Hedefe (
    # tier.word_count) ulasan ilk denemede erken cikiyoruz.
    best: _Grid | None = None
    for _attempt in range(_MAX_GRID_ATTEMPTS):
        candidates = list(pool)
        random.shuffle(candidates)
        candidates.sort(key=lambda w: len(w["answer"]), reverse=True)

        grid = _Grid(tier.grid_width, tier.grid_height)
        for w in candidates:
            if len(grid.placed) >= tier.word_count:
                break
            grid.place_connected(w)

        if best is None or len(grid.placed) > len(best.placed):
            best = grid
        if len(best.placed) >= tier.word_count:
            break

    assert best is not None
    if len(best.placed) > tier.word_count:
        # Guvenlik: yukaridaki ic donguler zaten word_count'ta durduruyor,
        # ama olur da asarsa -- yerlestirme SIRASINI koruyarak kirp (her
        # kelime SADECE o ana kadar yerlesmis hucrelerle kesistigi icin
        # bastan kirpmak bagliligi asla bozmaz).
        best.placed = best.placed[: tier.word_count]
    if len(best.placed) < 3:
        detail = (
            "Kelimelerin arasinda yeterince ortak harf yok"
            if mode == "own_pool"
            else f"'{learning_lang}->{native_lang}' icin '{tier.band}' bandindaki kelimeler birbiriyle yeterince kesismiyor"
        )
        raise LookupError(f"{detail} (sadece {len(best.placed)} kelime baglanabildi, en az 3 gerekiyor).")

    grid_width, grid_height = best.normalize()
    return {
        "tier": tier,
        "grid_width": grid_width,
        "grid_height": grid_height,
        "placed": best.placed,
    }


def _own_pool_word_count(user_id: str, learning_lang: str, native_lang: str) -> int:
    """Kullanicinin bu dil ciftindeki 'Kelimelerim' satir sayisi -- own_pool
    bulmacasinin tazelenmesi gerekip gerekmedigini anlamak icin kullanilir
    (bkz. _maybe_refresh_own_pool). _candidate_rows'taki gibi tek tek
    gecerlilik regex'i uygulamiyoruz -- kaba bir sayim, kucuk bir fark bile
    (ornegin yeni eklenen bir kelime) tazelemeyi tetiklemeli."""
    res = (
        supabase_admin.table("words")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("source_lang", learning_lang)
        .eq("target_lang", native_lang)
        .execute()
    )
    return res.count or 0


def _build_and_insert_puzzle(
    mode: str, learning_lang: str, native_lang: str, level: int, user_id: str | None, source_word_count: int | None
) -> dict:
    """_generate_puzzle_rows ile bir bulmaca uretip crossword_puzzles +
    crossword_puzzle_words'e yazar. get_or_create_puzzle (ilk uretim) ve
    _maybe_refresh_own_pool (yeniden uretim) tarafindan ORTAK kullanilir."""
    built = _generate_puzzle_rows(mode, learning_lang, native_lang, level, user_id=user_id)
    tier = built["tier"]
    puzzle_insert = (
        supabase_admin.table("crossword_puzzles")
        .insert({
            "learning_lang": learning_lang,
            "native_lang": native_lang,
            "level": level,
            "mode": mode,
            "user_id": user_id if mode == "own_pool" else None,
            "tier": tier.band,
            "grid_width": built["grid_width"],
            "grid_height": built["grid_height"],
            "word_count": len(built["placed"]),
            "source_word_count": source_word_count,
        })
        .execute()
        .data
    )
    puzzle = puzzle_insert[0]

    word_rows = []
    for p in built["placed"]:
        row = {
            "puzzle_id": puzzle["id"],
            "clue_text": p["clue_text"],
            "answer": p["answer"],
            "row_start": p["row_start"],
            "col_start": p["col_start"],
            "direction": p["direction"],
            "answer_length": len(p["answer"]),
        }
        # Kaynak tabloya gore tam olarak BIRI dolu olmali (bkz. migration 096
        # crossword_puzzle_words_exactly_one_source CHECK'i).
        if p["source_table"] == "words":
            row["user_word_id"] = p["source_id"]
        else:
            row["general_word_id"] = p["source_id"]
        word_rows.append(row)
    inserted_words = (
        supabase_admin.table("crossword_puzzle_words").insert(word_rows).execute().data
    ) or []
    puzzle["crossword_puzzle_words"] = inserted_words
    return puzzle


def _maybe_refresh_own_pool(
    puzzle: dict, learning_lang: str, native_lang: str, level: int, user_id: str
) -> dict:
    """23 Kasim 2026 kullanici isteği: "Kendi listemdeki kelimeler her gecen
    gun artacaktir, buna gore burasi yeni kelime geldikce guncellenmeli."
    own_pool bulmacalari eskiden ILK uretimden sonra sonsuza kadar
    cache'leniyordu (bkz. migration 098). Burada: kullanicinin GUNCEL kelime
    sayisi, bulmaca uretildigi andaki sayidan (source_word_count) FARKLIYSA
    VE kullanici bu bulmacada henuz hic ilerleme kaydetmediyse (ne kelime
    cozmus ne tamamlamis), eski satir silinip (crossword_puzzle_words +
    user_crossword_sessions ON DELETE CASCADE ile birlikte gider) GUNCEL
    kelime havuzundan yeniden uretilir. Zaten cozulmeye baslanmis/
    tamamlanmis bir own_pool bulmacaya ASLA dokunulmaz -- kullanicinin
    emegi kaybolmasin diye."""
    current_count = _own_pool_word_count(user_id, learning_lang, native_lang)
    if current_count == (puzzle.get("source_word_count") or 0):
        return puzzle

    session = (
        supabase_admin.table("user_crossword_sessions")
        .select("solved_word_ids, completed_at")
        .eq("user_id", user_id)
        .eq("puzzle_id", puzzle["id"])
        .execute()
        .data
    )
    if session:
        s = session[0]
        if s.get("completed_at") or (s.get("solved_word_ids") or []):
            return puzzle  # ilerleme var -- dokunma

    try:
        rebuilt = _build_and_insert_puzzle(
            "own_pool", learning_lang, native_lang, level, user_id, current_count
        )
    except LookupError:
        # Guncel havuzla yeniden uretim basarisiz olursa (ornegin kelime
        # sayisi azaldi ve artik yeterli degil) -- eski bulmacayi koru,
        # kullanici en azindan oynayabilsin.
        return puzzle

    supabase_admin.table("crossword_puzzles").delete().eq("id", puzzle["id"]).execute()
    return rebuilt


def get_or_create_puzzle(
    mode: str, learning_lang: str, native_lang: str, level: int, user_id: str | None = None
) -> dict:
    """Var olan bulmacayi DB'den okur; yoksa uretir ve yazar. Donus: puzzle
    satiri + kelime listesi (answer DAHIL -- bu fonksiyon SADECE backend ici
    kullanim icindir, answer'i istemciye gondermeden once api/routes/
    crossword.py filtrelemeli).

    standard/reverse: PAYLASILAN satir (user_id NULL) -- herkes ayni
    bulmacayi cozer (bkz. migration 096). own_pool: user_id ZORUNLU, her
    kullaniciya ayri, kendi 'words' listesinden uretilmis bir satir --
    kullanicinin kelime sayisi degistikce _maybe_refresh_own_pool ile
    tazelenir (bkz. migration 098)."""
    if mode == "own_pool" and not user_id:
        raise ValueError("own_pool modu icin user_id sart")

    query = (
        supabase_admin.table("crossword_puzzles")
        .select("*, crossword_puzzle_words(*, general_word_pool(definition, example), words(example))")
        .eq("learning_lang", learning_lang)
        .eq("native_lang", native_lang)
        .eq("level", level)
        .eq("mode", mode)
    )
    query = query.eq("user_id", user_id) if mode == "own_pool" else query.is_("user_id", "null")
    existing = query.execute().data
    if existing:
        if mode == "own_pool":
            return _maybe_refresh_own_pool(existing[0], learning_lang, native_lang, level, user_id)
        return existing[0]

    source_word_count = (
        _own_pool_word_count(user_id, learning_lang, native_lang) if mode == "own_pool" else None
    )
    return _build_and_insert_puzzle(mode, learning_lang, native_lang, level, user_id, source_word_count)


def get_user_progress(user_id: str, learning_lang: str, mode: str = "standard") -> int:
    rows = (
        supabase_admin.table("user_crossword_progress")
        .select("current_level")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .eq("mode", mode)
        .execute()
        .data
    ) or []
    return rows[0]["current_level"] if rows else 1


def advance_user_progress(user_id: str, learning_lang: str, completed_level: int, mode: str = "standard") -> int:
    """completed_level bitince ilerlemeyi bir sonraki seviyeye tasir (max
    MAX_LEVEL). Zaten daha ileri bir seviyedeyse (ayni bulmaca tekrar
    cozulduyse) geri almaz. 23 Kasim 2026: her mod KENDI ilerlemesini
    (mode sutunu) bagimsiz tutar -- standard'da 50. seviyede olmak reverse/
    own_pool'u etkilemez."""
    current = get_user_progress(user_id, learning_lang, mode)
    next_level = min(max(current, completed_level + 1), MAX_LEVEL)
    supabase_admin.table("user_crossword_progress").upsert(
        {
            "user_id": user_id,
            "learning_lang": learning_lang,
            "mode": mode,
            "current_level": next_level,
        },
        on_conflict="user_id,learning_lang,mode",
    ).execute()
    return next_level
