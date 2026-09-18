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
    validated: list[dict] = []
    for q in raw_questions:
        options = q.get("options") or []
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


def generate_placement_questions(learning_lang: str, count: int = 50) -> list[dict]:
    """Belirtilen ogrenilen dil icin `count` adet (varsayilan 50) CEFR
    bandina yayilmis, gercek seviyeyi ortaya cikarmayi amaclayan coktan
    secmeli seviye tespit sorusu uretir. generate_questions ile ayni
    validasyon/hata deseni -- ag/yapilandirma/parse hatalarinda
    ExamQuestionGenerationError firlatir, gecersiz sorular sessizce elenir."""
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

    prompt = (
        f"{language_name} ogrenen bir kullanici icin GERCEK SEVIYESINI olcen "
        f"{count} soruluk bir seviye tespit sinavi (placement test) uret. "
        "Bu sinavin amaci ogrencinin GERCEK seviyesini ortaya cikarmak, o "
        "yuzden sorular CEFR A1'den C2'ye kadar TUM banda yayilmali -- "
        f"yaklasik olarak her seviyeden ({count // 6}-{count // 6 + 1} soru) "
        "esit agirlikta dagit, kolaydan zora dogru artan zorlukta sirala.\n\n"
        f"{context_block}\n\n"
        "Kurallar:\n"
        "- Her sorunun tam olarak 4 sikki olsun (id: a, b, c, d), sadece 1 tanesi dogru.\n"
        "- Sadece dilbilgisi degil, kelime bilgisi/kullanim sorulari da olsun (dogal karisim).\n"
        "- Sikklar birbirine yakin uzunlukta ve inandirici olsun, bariz yanlis sik olmasin.\n"
        f"- question_text ve options {language_name} dilinde olsun.\n"
        "- explanation alani Turkce yazilsin, dogru sikkin neden dogru oldugunu kisaca (1-2 cumle) anlatsin.\n"
        "- level alanina sorunun GERCEK CEFR zorluk seviyesini yaz (a1/a2/b1/b2/c1/c2) -- bu alan "
        "sinav sonunda kullanicinin seviyesini hesaplamak icin kullanilacak, o yuzden dikkatli isaretle.\n"
        "- Telif hakli bir metinden alinti yapma veya gercek bir sinavdan soru kopyalama -- tamamen ozgun icerik uret.\n"
        "- Sadece submit_placement_questions aracini cagirarak cevap ver, ek metin yazma."
    )

    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=8192,
            tools=[_PLACEMENT_SUBMIT_TOOL],
            tool_choice={"type": "tool", "name": "submit_placement_questions"},
            messages=[{"role": "user", "content": prompt}],
        )
    except APIError as exc:
        raise ExamQuestionGenerationError(f"Anthropic API hatasi: {exc}") from exc
    except Exception as exc:
        raise ExamQuestionGenerationError(
            f"AI seviye tespit sorusu uretimi beklenmeyen hatayla basarisiz oldu "
            f"({type(exc).__name__}): {exc}"
        ) from exc

    tool_use = next(
        (block for block in response.content if getattr(block, "type", None) == "tool_use"),
        None,
    )
    if tool_use is None:
        raise ExamQuestionGenerationError("Model tool_use blogu dondurmedi.")

    raw_questions = tool_use.input.get("questions") or []
    validated: list[dict] = []
    for q in raw_questions:
        options = q.get("options") or []
        ids = {opt.get("id") for opt in options}
        if len(options) != 4 or ids != {"a", "b", "c", "d"}:
            continue
        if q.get("correct_option") not in ids:
            continue
        if q.get("level") not in ("a1", "a2", "b1", "b2", "c1", "c2"):
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
                "level": q["level"],
                "topic_tag": (q.get("topic_tag") or None),
            }
        )

    if not validated:
        raise ExamQuestionGenerationError("Model gecerli formatta hic soru uretmedi.")

    return validated
