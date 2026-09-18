"""
backend/app/services/exam_question_generator.py

Sınav Hazırlık İstatistik & İçerik Motoru — Faz 2b: AI ile soru üretimi.

Admin panelinden (POST /api/v1/exams/admin/questions/generate-ai) tetiklenir.
Üretilen sorular DOĞRUDAN havuza girmez — diğer kaynaklarla (kullanıcı önerisi)
aynı moderasyon kuyruğundan geçer: source_type='ai', status='pending' olarak
kaydedilir (bkz. supabase/migrations/026_exam_prep_stats_and_content.sql).
Admin, GET /admin/questions/pending üzerinden inceleyip onaylar/reddeder —
next_question/list_exam_types zaten sadece status=approved sorularla çalışıyor,
o yüzden AI çıktısı hiçbir zaman incelenmeden kullanıcıya gösterilmez.

Model: Anthropic Messages API, zorunlu tool-use ile yapılandırılmış JSON
çıktısı alınır (serbest metin parse etmek yerine — daha güvenilir).
"""

import json
import re

from anthropic import Anthropic, APIError

from app.core.config import settings
from app.core.database import supabase_admin

# Sınav türü başına kısa bağlam — üretilen soruların o sınavın tarzına
# (kapsam/zorluk) yakın olması için. Şu an tüm sınav türleri sadece
# native_lang=tr + learning_lang=en kullanıcılarına gösteriliyor (bkz.
# routes/exams.py modül docstring'i) — çoklu dil genellemesi V2 yol
# haritasında ayrı bir madde (§ çoklu dil/sınav genellemesi).
EXAM_TOPIC_HINTS: dict[str, str] = {
    "yds": (
        "YDS (Yabancı Dil Bilgisi Seviye Tespit Sınavı) tarzında sorular: "
        "İngilizce dilbilgisi, kelime bilgisi, cloze test, cümle/paragraf "
        "tamamlama, çeviri mantığı."
    ),
    "yokdil": (
        "YÖKDİL tarzında sorular: akademik İngilizce, bilimsel/akademik metin "
        "anlama, dilbilgisi ve kelime bilgisi."
    ),
    "ielts": (
        "IELTS tarzında sorular: genel ve akademik İngilizce yeterlilik "
        "(reading/grammar/vocabulary), gerçek sınav formatına yakın zorluk."
    ),
    "toefl": (
        "TOEFL tarzında sorular: akademik İngilizce yeterlilik "
        "(reading/grammar/vocabulary), gerçek sınav formatına yakın zorluk."
    ),
}

_SUBMIT_TOOL = {
    "name": "submit_questions",
    "description": "Üretilen çoktan seçmeli sınav sorularını yapılandırılmış olarak gönderir.",
    "input_schema": {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question_text": {
                            "type": "string",
                            "description": "Soru kökü (İngilizce).",
                        },
                        "options": {
                            "type": "array",
                            "minItems": 4,
                            "maxItems": 4,
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string", "enum": ["a", "b", "c", "d"]},
                                    "text": {"type": "string"},
                                },
                                "required": ["id", "text"],
                            },
                        },
                        "correct_option": {"type": "string", "enum": ["a", "b", "c", "d"]},
                        "explanation": {
                            "type": "string",
                            "description": "Türkçe kısa açıklama: doğru şık neden doğru.",
                        },
                        "topic_tag": {
                            "type": "string",
                            "description": "Kısa İngilizce konu etiketi, örn. 'tenses', 'phrasal-verbs', 'reading-comprehension'.",
                        },
                    },
                    "required": ["question_text", "options", "correct_option", "explanation"],
                },
            },
        },
        "required": ["questions"],
    },
}


class ExamQuestionGenerationError(Exception):
    """AI ile soru üretimi başarısız olduğunda fırlatılır — route bunu
    HTTP 502 (upstream/model hatası) ya da 500'e (yapılandırma eksikliği için
    400/500) çevirir."""


def _parse_stringified_questions(raw: str) -> list | None:
    """Model "questions" alanina native dizi yerine JSON-encode edilmis bir
    STRING koydugunda (bkz. asagidaki cagri yerlerindeki notlar) bu stringi
    gercek bir Python listesine cevirmeyi dener.

    18 Eylul 2026 (it/c2 vakasi): duz json.loads() cogu zaman yetersiz kaldi
    -- model bu "elle yazilmis" JSON stringinde SIK SIK trailing comma
    birakiyor (orn. bir dizinin son elemanindan sonra, kapanan `]`'den
    hemen once bir virgul kalmasi: `..."d"},\n],`), ki bu standart JSON'da
    gecersizdir ve json.loads() ValueError firlatir. Once duz parse'i dene,
    olmazsa yaygin trailing-comma hatasini regex ile temizleyip tekrar dene.
    Ikisi de basarisiz olursa None doner (cagiran taraf bos listeye duser)."""
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        pass
    # `]` veya `}`'den hemen once gelen tek bir virgulu temizle.
    repaired = re.sub(r",(\s*[\]}])", r"\1", raw)
    try:
        return json.loads(repaired)
    except (json.JSONDecodeError, TypeError):
        return None

# ── V2 backlog #10 (14 Eylül 2026) — kullanıcı soru önerisi AI ön-kontrolü ──
# generate_questions()'dan farkı: burada model soru ÜRETMİYOR, kullanıcının
# ZATEN gönderdiği bir soruyu (question_text/options/correct_option/
# explanation) inceleyip "doğru şık gerçekten doğru mu, soru anlamlı mı"
# konusunda bir ön-görüş veriyor. Bu görüş ASLA otomatik onay/red tetiklemez
# — sadece admin'in GET /admin/questions/pending kuyruğunda gördüğü bir
# etiket+not (bkz. exams.py::suggest_question). Bu yüzden generate_questions'ın
# aksine BU FONKSİYON HİÇBİR ZAMAN EXCEPTION FIRLATMAZ: kullanıcının soru
# gönderme isteği, AI doğrulaması çöktü diye asla başarısız olmamalı — hata
# durumunda sessizce verdict="uncertain" + açıklayıcı not döner, admin normal
# şekilde manuel inceler.

_VERIFY_TOOL = {
    "name": "submit_verification",
    "description": "Bir sınav sorusu önerisinin ön-değerlendirmesini gönderir.",
    "input_schema": {
        "type": "object",
        "properties": {
            "verdict": {
                "type": "string",
                "enum": ["likely_correct", "likely_incorrect", "uncertain"],
                "description": (
                    "likely_correct: işaretlenen şık gerçekten doğru ve soru "
                    "anlamlı görünüyor. likely_incorrect: işaretlenen şık "
                    "muhtemelen YANLIŞ ya da soru bozuk/anlamsız. uncertain: "
                    "emin olunamıyor (belirsiz/tartışmalı)."
                ),
            },
            "note": {
                "type": "string",
                "description": (
                    "Admin'e yönelik, Türkçe, 1-2 cümlelik kısa gerekçe. "
                    "likely_incorrect ise hangi şıkkın neden daha doğru "
                    "olduğunu belirt."
                ),
            },
        },
        "required": ["verdict", "note"],
    },
}


def verify_question(
    exam_type: str,
    question_text: str,
    options: list[dict],
    correct_option: str,
    explanation: str | None,
    topic_tag: str | None = None,
) -> dict:
    """Kullanıcının önerdiği bir soruyu AI ile ön-kontrol eder. Her zaman
    {"verdict": ..., "note": ...} döner — asla exception fırlatmaz (bkz.
    yukarıdaki modül notu)."""
    if not settings.ANTHROPIC_API_KEY:
        return {
            "verdict": "uncertain",
            "note": "AI doğrulama şu an kullanılamıyor (ANTHROPIC_API_KEY yapılandırılmamış).",
        }

    hint = EXAM_TOPIC_HINTS.get(exam_type, "")
    options_text = "\n".join(f"{opt.get('id')}) {opt.get('text')}" for opt in options)
    topic_line = f"Konu etiketi: {topic_tag}." if topic_tag else ""

    prompt = (
        f"Aşağıda bir kullanıcının {exam_type.upper()} sınav hazırlık alanına "
        f"önerdiği çoktan seçmeli bir soru var. {hint} {topic_line}\n\n"
        f"Soru: {question_text}\n\n"
        f"Şıklar:\n{options_text}\n\n"
        f"Kullanıcının işaretlediği doğru şık: {correct_option}\n"
        f"Kullanıcının açıklaması: {explanation or '(açıklama girilmemiş)'}\n\n"
        "Bu soruyu incele: işaretlenen şık gerçekten doğru mu, soru "
        "anlamlı/kullanılabilir mi? Sadece submit_verification aracını "
        "çağırarak cevap ver, ek metin yazma."
    )

    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1024,
            tools=[_VERIFY_TOOL],
            tool_choice={"type": "tool", "name": "submit_verification"},
            messages=[{"role": "user", "content": prompt}],
        )
        tool_use = next(
            (block for block in response.content if getattr(block, "type", None) == "tool_use"),
            None,
        )
        if tool_use is None:
            return {"verdict": "uncertain", "note": "Model yapılandırılmış bir yanıt döndürmedi."}

        verdict = tool_use.input.get("verdict")
        if verdict not in ("likely_correct", "likely_incorrect", "uncertain"):
            verdict = "uncertain"
        note = (tool_use.input.get("note") or "").strip()[:500]
        return {"verdict": verdict, "note": note or "(not verilmedi)"}
    except Exception as exc:
        # generate_questions'ın aksine burada kasıtlı olarak yutuluyor —
        # bkz. modül notu: kullanıcının soru gönderme isteği bu yüzden asla
        # başarısız olmamalı.
        print(f"VERIFY_QUESTION warning: {type(exc).__name__}: {exc}")
        return {
            "verdict": "uncertain",
            "note": f"AI doğrulama sırasında bir hata oluştu ({type(exc).__name__}), admin manuel incelemeli.",
        }


def generate_questions(
    exam_type: str, count: int, topic_tag: str | None = None
) -> list[dict]:
    """Anthropic API ile `count` adet çoktan seçmeli soru üretir; her biri
    exam_questions.options ile aynı şekle (list[{"id","text"}]) sahip,
    doğrulanmış dict olarak döner. Ağ/yapılandırma/parse hatalarında
    ExamQuestionGenerationError fırlatır."""
    if not settings.ANTHROPIC_API_KEY:
        raise ExamQuestionGenerationError(
            "ANTHROPIC_API_KEY yapılandırılmamış — AI soru üretimi kapalı."
        )

    hint = EXAM_TOPIC_HINTS.get(exam_type, "")
    topic_line = (
        f"Sadece şu konuya odaklan: {topic_tag}."
        if topic_tag
        else "Konu çeşitliliği olsun, aynı konu art arda tekrar etmesin."
    )

    prompt = (
        f"{hint}\n\n"
        f"Bu sınav formatında, İngilizce öğrenen orta-ileri seviye (B2-C1) bir "
        f"öğrenci için {count} adet ÖZGÜN, birbirinden farklı çoktan seçmeli "
        f"soru üret. {topic_line}\n\n"
        "Kurallar:\n"
        "- Her sorunun tam olarak 4 şıkkı olsun (id: a, b, c, d), sadece 1 tanesi doğru.\n"
        "- Şıklar birbirine yakın uzunlukta ve inandırıcı olsun (çeldirici kalitesi önemli, "
        "bariz yanlış şık olmasın).\n"
        "- explanation alanı Türkçe yazılsın, öğrenciye doğru şıkkın neden doğru olduğunu "
        "kısaca (1-2 cümle) anlatsın.\n"
        "- question_text ve options İngilizce olsun.\n"
        "- Telif hakkı olan bir metinden alıntı yapma veya gerçek bir sınavdan soru kopyalama — "
        "tamamen özgün içerik üret.\n"
        "- Sadece submit_questions aracını çağırarak cevap ver, ek metin yazma."
    )

    # NOT (12 Eylül 2026): admin panelinde bu uç 500 Internal Server Error
    # döndürmüştü (bkz. devir notu) — sebebi burada sadece APIError
    # yakalanıp Anthropic istemcisinin OLUŞTURULMASI try bloğunun DIŞINDA
    # bırakılmış olmasıydı; SDK sürüm uyumsuzluğu/TLS/ağ gibi APIError
    # OLMAYAN bir hata (örn. anthropic==1.4.0'ın httpx2/truststore tabanlı
    # istemcisinden gelebilecek bir hata) yakalanmadan route'a sızıp opak
    # bir 500'e dönüşüyordu. Artık istemci oluşturma + çağrı TEK try
    # bloğunda ve APIError dışındaki her şey de yakalanıp ExamQuestionGenerationError
    # olarak (dolayısıyla route'ta 502 + GERÇEK hata metniyle) yükseltiliyor.
    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=4096,
            tools=[_SUBMIT_TOOL],
            tool_choice={"type": "tool", "name": "submit_questions"},
            messages=[{"role": "user", "content": prompt}],
        )
    except APIError as exc:
        raise ExamQuestionGenerationError(f"Anthropic API hatası: {exc}") from exc
    except Exception as exc:
        raise ExamQuestionGenerationError(
            f"AI soru üretimi beklenmeyen hatayla başarısız oldu "
            f"({type(exc).__name__}): {exc}"
        ) from exc

    tool_use = next(
        (block for block in response.content if getattr(block, "type", None) == "tool_use"),
        None,
    )
    if tool_use is None:
        raise ExamQuestionGenerationError("Model tool_use bloğu döndürmedi.")

    raw_questions = tool_use.input.get("questions") or []
    if isinstance(raw_questions, str):
        # 18 Eylul 2026: model bazen "questions" alanina native dizi yerine
        # JSON-encode edilmis bir STRING koyuyor (gozlemlendi: tr/b2, tr/c2 --
        # stop_reason='tool_use' oldugu halde raw_questions bir string olup
        # karakter karakter iterasyona giriyor, hicbir soru validasyondan
        # gecmiyordu). Bu durumda stringi JSON olarak parse edip gercek
        # listeyi kurtarmayi dene; olmazsa bos listeye dus (asagidaki
        # dongude zaten dict-olmayanlar elenir).
        parsed = _parse_stringified_questions(raw_questions)
        raw_questions = parsed if parsed is not None else []
    if not isinstance(raw_questions, list):
        raw_questions = []
    validated: list[dict] = []
    for q in raw_questions:
        # 18 Eylul 2026: generate_placement_questions'da yakalanan hatayla
        # ayni sinif -- model "questions" icine dict olmayan bir eleman
        # koyarsa .get() AttributeError firlatip tum uretimi cokertmesin.
        if not isinstance(q, dict):
            continue
        options = q.get("options") or []
        if not isinstance(options, list):
            continue
        options = [opt for opt in options if isinstance(opt, dict)]
        ids = {opt.get("id") for opt in options}
        if len(options) != 4 or ids != {"a", "b", "c", "d"}:
            continue  # bozuk/eksik şık seti — sessizce atla, moderasyon kuyruğuna eksik veri girmesin
        if q.get("correct_option") not in ids:
            continue
        if not q.get("question_text") or not q.get("explanation"):
            continue
        validated.append(
            {
                "question_text": q["question_text"].strip(),
                "options": [
                    {"id": opt["id"], "text": (opt.get("text") or "").strip()}
                    for opt in options
                ],
                "correct_option": q["correct_option"],
                "explanation": q["explanation"].strip(),
                "topic_tag": (q.get("topic_tag") or topic_tag or None),
            }
        )

    if not validated:
        raise ExamQuestionGenerationError("Model geçerli formatta hiç soru üretmedi.")

    return validated


# ──────────────────────────────────────────────────────────────────────
# Faz 3g (18 Eylul 2026, kullanici istegi) -- Coklu Dil Seviye Tespit
# Sinavi. generate_questions()'dan farki: exam_type sabit degil ('placement'),
# learning_lang PARAMETRE (12 dilin herhangi biri olabilir, generate_questions
# ise sadece Ingilizce icin hardcoded), ve difficulty_level alanina
# "kolay/orta/zor" yerine gercek CEFR seviyesi (a1..c2) yazilir -- amaci
# gercek seviyeyi ortaya cikarmak oldugu icin sorular kasitli olarak tum
# CEFR bandina yayilir. learning_lang='en' icin grammar_topics tablosundaki
# (bkz. supabase/migrations/027_grammar_reference.sql) yayinlanmis konular
# gercek zeminleme (grounding) baglami olarak modele verilir -- kullanicinin
# "bizim sistemdeki gramer konularini ele alarak hazirla" talebi budur.
# Diger diller icin boyle bir konu tablosu YOK, o yuzden o dilin CEFR
# cercevesindeki temel gramer alanlarini genel olarak kapsamasi istenir.
# Uretilen sorular da generate_questions gibi ASLA otomatik onaylanmaz --
# source_type='ai', status='pending' olarak seed_placement_exam_questions.py
# tarafindan kaydedilir, admin GET /admin/questions/pending'den onaylar.

LANGUAGE_NAMES: dict[str, str] = {
    "en": "Ingilizce",
    "tr": "Turkce",
    "de": "Almanca",
    "fr": "Fransizca",
    "es": "Ispanyolca",
    "it": "Italyanca",
    "ar": "Arapca",
    "ru": "Rusca",
    "ja": "Japonca",
    "pt": "Portekizce",
    "ko": "Korece",
    "zh": "Cince",
}

_PLACEMENT_SUBMIT_TOOL = {
    "name": "submit_placement_questions",
    "description": "Uretilen coktan secmeli seviye tespit sinavi sorularini yapilandirilmis olarak gonderir.",
    "input_schema": {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question_text": {
                            "type": "string",
                            "description": "Soru koku, hedef dilde.",
                        },
                        "options": {
                            "type": "array",
                            "minItems": 4,
                            "maxItems": 4,
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string", "enum": ["a", "b", "c", "d"]},
                                    "text": {"type": "string"},
                                },
                                "required": ["id", "text"],
                            },
                        },
                        "correct_option": {"type": "string", "enum": ["a", "b", "c", "d"]},
                        "explanation": {
                            "type": "string",
                            "description": "Turkce kisa aciklama: dogru sik neden dogru.",
                        },
                        "level": {
                            "type": "string",
                            "enum": ["a1", "a2", "b1", "b2", "c1", "c2"],
                            "description": "Bu sorunun gercek CEFR zorluk seviyesi.",
                        },
                        "topic_tag": {
                            "type": "string",
                            "description": "Kisa Ingilizce gramer/konu etiketi, orn. 'present-simple', 'word-order', 'articles'.",
                        },
                    },
                    "required": ["question_text", "options", "correct_option", "explanation", "level"],
                },
            },
        },
        "required": ["questions"],
    },
}


def _fetch_grammar_context(learning_lang: str, limit: int = 40) -> str:
    """learning_lang icin yayinlanmis grammar_topics kayitlarindan kisa bir
    baglam metni uretir (sadece learning_lang='en' icin veri var su an --
    bkz. seed_grammar_topics.py). Veri yoksa bos string doner, cagiran
    taraf bu durumda genel bir talimata duser."""
    try:
        result = (
            supabase_admin.table("grammar_topics")
            .select("title_tr, level, summary_tr, slug")
            .eq("learning_lang", learning_lang)
            .eq("status", "published")
            .order("sort_order")
            .limit(limit)
            .execute()
        )
    except Exception as exc:  # noqa: BLE001 -- baglam opsiyonel, sorgu basarisiz olursa sessizce atla
        print(f"_fetch_grammar_context warning: {type(exc).__name__}: {exc}")
        return ""

    rows = result.data or []
    if not rows:
        return ""

    lines = [
        f"- [{row.get('level', '?').upper()}] {row.get('title_tr')} (etiket: {row.get('slug')}): {row.get('summary_tr')}"
        for row in rows
    ]
    return (
        "Sistemimizdeki gramer rehberi konulari (bu sinav ONCELIKLE bu "
        "konulari kapsamali, topic_tag alaninda mumkun oldugunca asagidaki "
        "etiketleri kullan):\n" + "\n".join(lines)
    )


def _build_placement_prompt(language_name: str, context_block: str, level: str, batch_count: int) -> str:
    return (
        f"{language_name} ogrenen bir kullanici icin GERCEK SEVIYESINI olcen bir "
        f"seviye tespit sinavinin (placement test) SADECE CEFR {level.upper()} "
        f"seviyesine ait bolumunu uret: tam olarak {batch_count} soru, hepsi "
        f"{level.upper()} zorlugunda olsun (baska seviyeden soru KARISTIRMA).\n\n"
        f"{context_block}\n\n"
        "Kurallar:\n"
        "- Her sorunun tam olarak 4 sikki olsun (id: a, b, c, d), sadece 1 tanesi dogru.\n"
        "- Sadece dilbilgisi degil, kelime bilgisi/kullanim sorulari da olsun (dogal karisim).\n"
        "- Sikklar birbirine yakin uzunlukta ve inandirici olsun, bariz yanlis sik olmasin.\n"
        f"- question_text ve options {language_name} dilinde olsun.\n"
        "- explanation alani Turkce yazilsin, dogru sikkin neden dogru oldugunu kisaca (1-2 cumle) anlatsin.\n"
        f"- level alanina her zaman '{level}' yaz.\n"
        "- Telif hakli bir metinden alinti yapma veya gercek bir sinavdan soru kopyalama -- tamamen ozgun icerik uret.\n"
        "- Sadece submit_placement_questions aracini cagirarak cevap ver, ek metin yazma."
    )


def _generate_placement_batch(
    learning_lang: str, language_name: str, context_block: str, level: str, batch_count: int
) -> list[dict]:
    """Tek bir CEFR seviyesi icin `batch_count` soru uretir (tek API cagrisi).
    Buyuk tek cagrilarda (orn. 50 soru birden) model ciktisinin max_tokens
    sinirinda kesilip gecersiz JSON'a donusme riski vardi (bkz. 18 Eylul 2026
    "Model gecerli formatta hic soru uretmedi" hatasi) -- seviye basina kucuk
    cagrilara bolmek hem bu riski ortadan kaldirir hem de CEFR dagilimini
    modelin taktirine birakmadan garanti eder."""
    prompt = _build_placement_prompt(language_name, context_block, level, batch_count)

    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=90.0)  # 18 Eylul 2026: kucuk batch sonrasi takilirsa hizli fail olsun diye acik timeout
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=4096,
            tools=[_PLACEMENT_SUBMIT_TOOL],
            tool_choice={"type": "tool", "name": "submit_placement_questions"},
            messages=[{"role": "user", "content": prompt}],
        )
    except APIError as exc:
        raise ExamQuestionGenerationError(f"Anthropic API hatasi ({level}): {exc}") from exc
    except Exception as exc:
        raise ExamQuestionGenerationError(
            f"AI seviye tespit sorusu uretimi beklenmeyen hatayla basarisiz oldu "
            f"({level}, {type(exc).__name__}): {exc}"
        ) from exc

    tool_use = next(
        (block for block in response.content if getattr(block, "type", None) == "tool_use"),
        None,
    )
    if tool_use is None:
        raise ExamQuestionGenerationError(f"Model tool_use blogu dondurmedi ({level}).")

    raw_questions = tool_use.input.get("questions") or []
    if isinstance(raw_questions, str):
        # 18 Eylul 2026: model bazen "questions" alanina native dizi yerine
        # JSON-encode edilmis bir STRING koyuyor (gozlemlendi: tr/b2, tr/c2 --
        # stop_reason='tool_use' oldugu halde raw_questions bir string olup
        # karakter karakter iterasyona giriyor, hicbir soru validasyondan
        # gecmiyordu). Bu durumda stringi JSON olarak parse edip gercek
        # listeyi kurtarmayi dene; olmazsa bos listeye dus (asagidaki
        # dongude zaten dict-olmayanlar elenir).
        parsed = _parse_stringified_questions(raw_questions)
        raw_questions = parsed if parsed is not None else []
    if not isinstance(raw_questions, list):
        raw_questions = []
    validated: list[dict] = []
    for q in raw_questions:
        # 18 Eylul 2026: bazen model "questions" dizisine dict yerine string
        # (ornegin dict'i JSON'a cevirip string olarak koymus) veya baska
        # beklenmedik bir tip koyabiliyor -- .get() cagrisi AttributeError
        # ile tum batch'i (ve indirekt olarak tum dili) cokertmesin diye
        # dict olmayan girdileri sessizce atla.
        if not isinstance(q, dict):
            continue
        options = q.get("options") or []
        if not isinstance(options, list):
            continue
        options = [opt for opt in options if isinstance(opt, dict)]
        ids = {opt.get("id") for opt in options}
        if len(options) != 4 or ids != {"a", "b", "c", "d"}:
            continue
        if q.get("correct_option") not in ids:
            continue
        if not q.get("question_text") or not q.get("explanation"):
            continue
        validated.append(
            {
                "question_text": q["question_text"].strip(),
                "options": [
                    {"id": opt["id"], "text": (opt.get("text") or "").strip()}
                    for opt in options
                ],
                "correct_option": q["correct_option"],
                "explanation": q["explanation"].strip(),
                # level'i modelin kendi beyanina degil, bu cagrida ACIKCA
                # istedigimiz seviyeye sabitliyoruz -- boylece dagilim her
                # zaman garanti dogru olur.
                "level": level,
                "topic_tag": (q.get("topic_tag") or None),
            }
        )

    if not validated:
        # 18 Eylul 2026: bir dil TUM seviyelerde sifir soru uretirse (ornek:
        # 'tr' calistirmasi) sebebi anlasilamiyordu -- model gecerli JSON
        # dondurmus olabilir ama beklenmedik bir sekilde (orn. stop_reason
        # 'max_tokens' ile yarida kesilmis, ya da hicbir soru objesi
        # validasyondan gecmemis olabilir). Teshis icin stop_reason ve ham
        # ciktinin bir ozetini stderr'e yaziyoruz -- API anahtari gibi hicbir
        # hassas veri icermez, sadece model ciktisi.
        import sys

        block_summaries = [
            (getattr(b, "type", None), getattr(b, "text", None) if getattr(b, "type", None) == "text" else None)
            for b in response.content
        ]
        print(
            f"[DEBUG] {learning_lang}/{level}: stop_reason={response.stop_reason!r} "
            f"usage={response.usage!r} "
            f"content_blocks={block_summaries!r} "
            f"tool_use.input_keys={list(tool_use.input.keys())!r} "
            f"tool_use.input_repr={tool_use.input!r} "
            f"raw_questions_count={len(raw_questions)} "
            f"raw_questions_sample={raw_questions[:2]!r}",
            file=sys.stderr,
        )
        raise ExamQuestionGenerationError(f"Model {level} seviyesi icin gecerli formatta soru uretmedi.")

    return validated


def generate_placement_questions(
    learning_lang: str, count: int = 50, levels: list[str] | None = None
) -> list[dict]:
    """Belirtilen ogrenilen dil icin `count` adet (varsayilan 50) CEFR
    bandina yayilmis, gercek seviyeyi ortaya cikarmayi amaclayan coktan
    secmeli seviye tespit sorusu uretir.

    `levels` verilirse (orn. ["a1", "b1"]) SADECE o CEFR seviyeleri icin
    soru uretilir -- 6 seviyenin tamami degil. Her seviyenin hedef soru
    sayisi yine `count`'a gore hesaplanan sabit dagilimdan (orn. count=50 ->
    8,8,8,8,9,9) gelir, sadece hangi seviyelerin uretilecegi filtrelenir.
    Bu, seed_placement_exam_questions.py'nin idempotentlik kontrolunun artik
    dil basina degil SEVIYE BASINA calismasini saglar (bkz. 18 Eylul 2026
    -- 'tr' dilinde a1/b1/c1 eksik kalinca dil TOPTAN yeniden uretilince a2
    seviyesi zaten yeterliyken tekrar uretilip mukerrer soru birikmisti).

    18 Eylul 2026 GUNCELLEME: tek buyuk API cagrisi (50 soru, max_tokens=8192)
    bazi dillerde (orn. Ingilizce) modelin ciktisinin kesilmesine ve
    "Model gecerli formatta hic soru uretmedi" hatasina yol aciyordu --
    Anthropic yaniti max_tokens sinirinda kesilince tool_use.input'daki JSON
    ya bos ya da gecersiz kaliyordu. Cozum: sinavi CEFR seviyesi basina ayri,
    kucuk API cagrilarina bolduk (bkz. _generate_placement_batch). Bu hem
    kesilme riskini ortadan kaldirir hem de seviye dagilimini modelin
    taktirine birakmadan garanti eder, hem de bir seviye basarisiz olsa bile
    digerlerinden gelen sorular kaybolmaz (kismi basari mumkun)."""
    if not settings.ANTHROPIC_API_KEY:
        raise ExamQuestionGenerationError(
            "ANTHROPIC_API_KEY yapilandirilmamis -- AI soru uretimi kapali."
        )

    language_name = LANGUAGE_NAMES.get(learning_lang, learning_lang)
    grammar_context = _fetch_grammar_context(learning_lang)
    context_block = (
        grammar_context
        if grammar_context
        else (
            f"{language_name} icin ozel bir konu listemiz yok -- bu dilin CEFR "
            "cercevesindeki temel gramer alanlarini (zaman/kip, sozcuk sirasi, "
            "tanimlik/durum ekleri, baglaclar, edatlar, sifat/zarf kullanimi vb., "
            "dile uygun olanlari) dengeli sekilde kapsa."
        )
    )

    all_levels = ["a1", "a2", "b1", "b2", "c1", "c2"]
    base, remainder = divmod(count, len(all_levels))
    # ilk `len(all_levels) - remainder` seviye `base`, kalan `remainder`
    # seviye `base + 1` soru alir (orn. count=50 -> 8,8,8,8,9,9 -- toplam 50).
    # Bu esleme her zaman TUM 6 seviye icin hesaplanir ki `levels` ile bir
    # alt kume istendiginde bile ayni seviyenin hedef sayisi degismesin.
    level_count_by_level = {
        lvl: base + (1 if i >= len(all_levels) - remainder else 0)
        for i, lvl in enumerate(all_levels)
    }
    target_levels = [lvl for lvl in all_levels if levels is None or lvl in levels]
    level_counts = [level_count_by_level[lvl] for lvl in target_levels]
    levels = target_levels

    # 18 Eylul 2026: bir seviyenin sifir soruyla donmesi (once stringlestirme
    # bug'i, simdi ise sadece modelin o cagrida stokastik olarak bos dizi
    # dondurmesi -- bkz. tr/a1,b1,c1 debug ciktisi: stop_reason='tool_use'
    # ama raw_questions gercekten bos) tekrar denendiginde genelde duzeliyor.
    # O yuzden seviye basina birkac deneme hakki taniyoruz, hepsi tukenirse
    # o seviyeyi atlayip digerleriyle devam ediyoruz.
    MAX_ATTEMPTS_PER_LEVEL = 3

    validated: list[dict] = []
    batch_errors: list[str] = []
    for level, batch_count in zip(levels, level_counts):
        if batch_count <= 0:
            continue
        last_exc: ExamQuestionGenerationError | None = None
        for attempt in range(1, MAX_ATTEMPTS_PER_LEVEL + 1):
            try:
                batch = _generate_placement_batch(
                    learning_lang, language_name, context_block, level, batch_count
                )
            except ExamQuestionGenerationError as exc:
                last_exc = exc
                print(
                    f"generate_placement_questions warning ({learning_lang}/{level}, "
                    f"deneme {attempt}/{MAX_ATTEMPTS_PER_LEVEL}): {exc}"
                )
                continue
            validated.extend(batch)
            last_exc = None
            break
        if last_exc is not None:
            batch_errors.append(f"{level}: {last_exc}")

    if not validated:
        raise ExamQuestionGenerationError(
            "Hicbir CEFR seviyesinde gecerli soru uretilemedi: " + " | ".join(batch_errors)
        )

    return validated
