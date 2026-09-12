"""
backend/app/services/report_export_service.py

İstatistik & Raporlama V2 öncelik #3, Faz 3 madde F — "Dağıtım: Resend
e-posta + PDF/CSV/Excel export". Bu modül SADECE render mantığını içerir
(Supabase'e hiç dokunmaz, dependency-injection ile test edilebilir) —
zaten hesaplanmış bir rapor sözlüğünü (user_report_service.get_user_report,
organization_report_service.get_organization_report,
platform_snapshot_service.get_snapshots) ortak bir ReportDocument ara
temsiline çevirip CSV/XLSX/PDF byte'larına dönüştürür.

PDF'te Türkçe karakterler (İ, ş, ğ, ü, ö, ç) için reportlab'ın varsayılan
Helvetica fontu YETERSİZ (Type1, tam Unicode desteği yok) — bu yüzden
backend/app/assets/fonts/DejaVuSans(-Bold).ttf gömülü font olarak
kaydediliyor (Railway/nixpacks image'ında hangi sistem fontlarının olduğu
garanti değil, bu yüzden repo'ya gömüldü).

DİL DESTEĞİ (kullanıcı isteği, 12 Eylül 2026): export edilen dosyanın
İÇERİĞİ artık `profiles.native_lang`'a göre, uygulamanın diğer 10 dilli
yerlerle (reportLocale.ts/orgReportLocale.ts/email_service.py'nin
_DAILY_WORD_UI_STRINGS'i) AYNI 10 dilde (tr/en/de/fr/es/it/ar/ru/ja/pt)
üretiliyor — bkz. `_L` sözlüğü. Route katmanı çağıranın (kullanıcının ya
da kurum raporu isteyen admin'in) `native_lang`'ını okuyup `lang=` olarak
geçiyor; desteklenmeyen/boş bir kod gelirse "en"e düşülüyor (diğer
_DAILY_WORD_UI_STRINGS.get(..., ["en"]) desenleriyle tutarlı).

Arapça (ar) İÇİN ÖZEL NOT: reportlab, Arapça harflerin bağlamsal şekillerini
(başta/ortada/sonda farklı harf biçimleri) ve sağdan-sola okuma yönünü
KENDİLİĞİNDEN uygulamıyor — ham Arapça metin PDF'e basılırsa harfler ayrı
ayrı ve ters sırada görünür. Bu yüzden PDF'te (sadece PDF'te — CSV/XLSX
Excel/metin editörlerinin kendi bidi motoruna güveniyor, XLSX ayrıca sayfa
yönünü sağdan-sola çeviriyor) `arabic_reshaper` + `python-bidi` ile her
metin reportlab'a verilmeden önce "görsel sıraya" çevriliyor — bu, reportlab
ile Arapça PDF üretmenin standart yöntemi. Gerçek bir örnek Arapça
paragrafla render edilip pdftoppm'le PNG'ye çevrilerek GÖZLE doğrulandı
(sağdan sola doğru, doğru şekillerle okunuyor).

Japonca (ja) İÇİN ÖZEL NOT: DejaVuSans, CJK (kanji/hiragana/katakana) glif
İÇERMİYOR. reportlab'ın dosyasız yerleşik CID fontu (HeiseiKakuGo-W5) ilk
denemede kullanıldı ama PDF'e gömülmüyor — görüntüleyicinin kendi sistem
fontuyla ikame etmesine güveniyor, ve test sırasında (pdftoppm/poppler) bazı
ASCII rakam/harflerin (tarih, yüzde gibi karma içerik) boş kutu çıktığı
görüldü. Bunun yerine backend/app/assets/fonts/NotoSansCJKjp-Regular.ttf
gömüldü — sistemdeki Noto Sans CJK (OFL lisanslı) .ttc koleksiyonundan
Japonca alt-fontu fontTools ile çıkarılıp (CFF->TrueType glyf dönüşümü,
otf2ttf) yaygın Japonca+ASCII Unicode aralıklarına subset edilerek boyutu
küçültüldü (~19MB -> ~13MB). NOT: bu subset Türkçe'ye özgü ı/ğ/ş harflerini
içermiyor — sadece Japonca rapor içine literal Türkçe özel ad (ör. çevrilmemiş
lig kademe adı) karışırsa etkiler, ayrı ve daha geniş bir kapsam (uygulama
genelinde oyun içi sabit adların TÜMÜNÜN dile göre çevrilmesi). Gerçek
builder çıktısıyla üretilen bir Japonca PDF pdftoppm'le PNG'ye çevrilip
GÖZLE doğrulandı (kanji/kana + rakamlar + karma İngilizce içerik doğru
okunuyor).
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import arabic_reshaper
from bidi.algorithm import get_display
from openpyxl import Workbook
from openpyxl.styles import Font as XlsxFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import ParagraphStyle

_FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
_FONT_REGISTERED = False


def _ensure_fonts_registered() -> None:
    global _FONT_REGISTERED
    if _FONT_REGISTERED:
        return
    pdfmetrics.registerFont(TTFont("DejaVuSans", str(_FONTS_DIR / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(_FONTS_DIR / "DejaVuSans-Bold.ttf")))
    # DejaVuSans Latin/Kiril/Yunan/Arapça (presentation forms) karakterleri
    # kapsıyor ama CJK (Japonca kanji/kana) glif İÇERMİYOR. İlk denemede
    # reportlab'ın dosya gerektirmeyen yerleşik CID fontu (HeiseiKakuGo-W5)
    # kullanıldı, ama bu font PDF'e GÖMÜLMÜYOR — sadece isimle referans
    # veriliyor ve görüntüleyicinin kendi sistem fontuyla ikame etmesine
    # güveniyor. Test sırasında (pdftoppm/poppler) bu ikamenin bazı ASCII
    # rakam/harfleri (tarih, yüzde gibi karma içerik) boş kutu olarak
    # gösterdiği görüldü — güvenilmez. Bunun yerine Noto Sans CJK JP
    # (OFL lisanslı) sistem fontundan Japonca alt-fontu çıkarılıp
    # (fontTools ile CFF->TrueType glyf dönüşümü + yaygın Japonca+ASCII
    # aralıklarına subset) DejaVuSans ile AYNI şekilde repo'ya gömüldü —
    # garanti/tutarlı render için. NOT: bu subset, Türkçe'ye özgü bazı
    # harfleri (ı, ğ, ş) içermiyor — bu sadece Japonca rapor içine literal
    # Türkçe özel ad (ör. lig kademe adı) karışırsa etkiler, ayrı bir
    # kapsam (uygulama genelinde lig/rozet adlarının TÜMÜNÜN çevrilmesi).
    pdfmetrics.registerFont(TTFont("NotoSansCJKjp", str(_FONTS_DIR / "NotoSansCJKjp-Regular.ttf")))
    _FONT_REGISTERED = True


def _rtl(text: str, lang: str) -> str:
    """lang='ar' ise metni reportlab için görsel sıraya (reshape+bidi)
    çevirir, aksi halde olduğu gibi döner. Sadece to_pdf() içinde
    kullanılıyor (bkz. modül docstring'i)."""
    if lang != "ar" or not text:
        return text
    return get_display(arabic_reshaper.reshape(text))


@dataclass
class ReportSection:
    title: str
    kv_pairs: list[tuple[str, str]] = field(default_factory=list)
    table_headers: list[str] | None = None
    table_rows: list[list[str]] | None = None
    note: str | None = None


@dataclass
class ReportDocument:
    title: str
    subtitle: str
    generated_at: str
    sections: list[ReportSection] = field(default_factory=list)


def to_csv(doc: ReportDocument) -> bytes:
    """Basit, tek sayfalık düz CSV — her bölüm bir başlık satırı + veri
    satırlarıyla art arda yazılır (Excel/Sheets'te açılınca okunaklı).
    Arapça için özel bir işlem YOK — CSV açan her uygulama (Excel, Google
    Sheets, metin editörleri) Unicode bidi algoritmasını kendisi uyguluyor,
    reportlab'daki gibi manuel reshape/bidi gerekmiyor."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([doc.title])
    writer.writerow([doc.subtitle])
    writer.writerow([doc.generated_at])
    writer.writerow([])
    for section in doc.sections:
        writer.writerow([section.title])
        for label, value in section.kv_pairs:
            writer.writerow([label, value])
        if section.table_headers and section.table_rows is not None:
            writer.writerow(section.table_headers)
            for row in section.table_rows:
                writer.writerow(row)
        if section.note:
            writer.writerow([section.note])
        writer.writerow([])
    # BOM: Excel'in Türkçe/diğer Unicode karakterleri (İ, ş, ğ, Arapça, vb.)
    # doğru göstermesi için — BOM'suz UTF-8 CSV'yi Excel çoğu zaman Latin-1
    # sanıp karakterleri bozuyor.
    return b"\xef\xbb\xbf" + buf.getvalue().encode("utf-8")


def to_xlsx(doc: ReportDocument, lang: str = "tr") -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Rapor"
    if lang == "ar":
        # Excel kendi bidi/şekillendirme motorunu kullanıyor (reportlab'ın
        # aksine manuel reshape gerekmiyor) — sadece sayfa yönünü sağdan
        # sola çevirmek yeterli, daha doğal bir okuma deneyimi sağlıyor.
        ws.sheet_view.rightToLeft = True

    bold = XlsxFont(bold=True)
    title_font = XlsxFont(bold=True, size=14)

    row = 1
    ws.cell(row=row, column=1, value=doc.title).font = title_font
    row += 1
    ws.cell(row=row, column=1, value=doc.subtitle)
    row += 1
    ws.cell(row=row, column=1, value=doc.generated_at)
    row += 2

    for section in doc.sections:
        ws.cell(row=row, column=1, value=section.title).font = bold
        row += 1
        for label, value in section.kv_pairs:
            ws.cell(row=row, column=1, value=label)
            ws.cell(row=row, column=2, value=value)
            row += 1
        if section.table_headers and section.table_rows is not None:
            for col_idx, header in enumerate(section.table_headers, start=1):
                ws.cell(row=row, column=col_idx, value=header).font = bold
            row += 1
            for table_row in section.table_rows:
                for col_idx, cell_value in enumerate(table_row, start=1):
                    ws.cell(row=row, column=col_idx, value=cell_value)
                row += 1
        if section.note:
            ws.cell(row=row, column=1, value=section.note)
            row += 1
        row += 1

    # Sütun genişliklerini içeriğe göre kabaca ayarla (openpyxl otomatik yapmıyor).
    for col_cells in ws.columns:
        length = max((len(str(c.value)) for c in col_cells if c.value is not None), default=8)
        ws.column_dimensions[col_cells[0].column_letter].width = min(max(length + 2, 10), 60)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def to_pdf(doc: ReportDocument, lang: str = "tr") -> bytes:
    _ensure_fonts_registered()
    buf = io.BytesIO()
    pdf_doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
    )
    align = {"alignment": TA_RIGHT} if lang == "ar" else {}
    # Japonca için DejaVuSans yerine gömülü Noto Sans CJK JP (bkz.
    # _ensure_fonts_registered) — bu fontun ayrı bir kalın varyantı repo'ya
    # gömülü değil, normal ağırlığıyla kalın yerine geçiyor.
    base_font = "NotoSansCJKjp" if lang == "ja" else "DejaVuSans"
    bold_font = "NotoSansCJKjp" if lang == "ja" else "DejaVuSans-Bold"

    title_style = ParagraphStyle("Title", fontName=bold_font, fontSize=17, leading=21, spaceAfter=4, **align)
    subtitle_style = ParagraphStyle("Subtitle", fontName=base_font, fontSize=10, leading=14, textColor=colors.HexColor("#64748B"), **align)
    meta_style = ParagraphStyle("Meta", fontName=base_font, fontSize=8, leading=11, textColor=colors.HexColor("#94A3B8"), spaceAfter=10, **align)
    section_style = ParagraphStyle("Section", fontName=bold_font, fontSize=12, leading=15, spaceBefore=12, spaceAfter=6, textColor=colors.HexColor("#0F172A"), **align)
    kv_style = ParagraphStyle("KV", fontName=base_font, fontSize=9.5, leading=13, **align)
    note_style = ParagraphStyle("Note", fontName=base_font, fontSize=8.5, leading=12, textColor=colors.HexColor("#64748B"), spaceBefore=4, **align)

    def R(text: str) -> str:
        return _rtl(text, lang)

    story = [
        Paragraph(R(doc.title), title_style),
        Paragraph(R(doc.subtitle), subtitle_style),
        Paragraph(R(doc.generated_at), meta_style),
    ]

    table_align = "RIGHT" if lang == "ar" else "LEFT"
    for section in doc.sections:
        story.append(Paragraph(R(section.title), section_style))
        for label, value in section.kv_pairs:
            if lang == "ar":
                story.append(Paragraph(f"{R(value)} :<b>{R(label)}</b>", kv_style))
            else:
                story.append(Paragraph(f"<b>{R(label)}:</b> {R(value)}", kv_style))
        if section.table_headers and section.table_rows is not None:
            headers = [R(h) for h in section.table_headers]
            rows = [[R(c) for c in row] for row in section.table_rows]
            data = [headers] + rows
            table = Table(data, hAlign="LEFT", repeatRows=1)
            table.setStyle(TableStyle([
                ("FONTNAME", (0, 0), (-1, -1), base_font),
                ("FONTNAME", (0, 0), (-1, 0), bold_font),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEEDFE")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#534AB7")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), table_align),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(Spacer(1, 4))
            story.append(table)
        if section.note:
            story.append(Paragraph(R(section.note), note_style))

    pdf_doc.build(story)
    return buf.getvalue()


_MEDIA_TYPES = {
    "csv": "text/csv; charset=utf-8",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}

SUPPORTED_FORMATS = tuple(_MEDIA_TYPES.keys())


def render(doc: ReportDocument, fmt: str, lang: str = "tr") -> tuple[bytes, str]:
    """(bytes, media_type) döner. Route katmanı bunu FastAPI Response'a
    sarmalıyor (bkz. stats.py/organizations.py/admin_platform.py::*_export_route).
    Desteklenmeyen fmt için ValueError — route bunu 400'e çeviriyor.
    `lang`: sadece PDF (Arapça shaping) ve XLSX (sayfa yönü) için kullanılıyor,
    CSV'ye etkisi yok (bkz. to_csv docstring'i)."""
    if fmt == "csv":
        return to_csv(doc), _MEDIA_TYPES["csv"]
    if fmt == "xlsx":
        return to_xlsx(doc, lang=lang), _MEDIA_TYPES["xlsx"]
    if fmt == "pdf":
        return to_pdf(doc, lang=lang), _MEDIA_TYPES["pdf"]
    raise ValueError(f"Desteklenmeyen export formatı: {fmt}")


# ─────────────────────────────────────────────────────────────────────────
# "Builder" fonksiyonları — user_report_service/organization_report_service/
# platform_snapshot_service'in zaten hesapladığı dict'leri yukarıdaki ortak
# ReportDocument temsiline çevirir. Bu fonksiyonlar da Supabase'e dokunmaz —
# tamamen saf, girdi->çıktı dönüşümü (route katmanı gerçek dict'i çekip
# buraya veriyor).
#
# `lang`: çağıranın (kullanıcının/admin'in) `profiles.native_lang`'ı —
# email_service.py'deki _DAILY_WORD_UI_STRINGS ile AYNI 10 dil, aynı
# .get(lang, _L["en"]) fallback deseni.
# ─────────────────────────────────────────────────────────────────────────

_L: dict[str, dict[str, str]] = {
    "tr": {
        "generated_at": "Oluşturulma", "period_week": "Haftalık", "period_month": "Aylık",
        "yes": "Evet", "no": "Hayır", "new": "Yeni", "weak_prefix": "Zayıf", "strong_prefix": "Güçlü",
        "user_title": "Lexis Kullanıcı Raporu", "user_subtitle_tpl": "{period} dönem — öğrenilen dil: {lang}",
        "sec_study": "Çalışma Özeti", "sec_vocab": "Kelime Hazinesi", "sec_games": "Oyun Performansı",
        "sec_exam": "Sınav / Konu Doğruluğu", "sec_quests": "Görev Haritası", "sec_badges": "Rozetler",
        "sec_league": "Lig Durumu", "sec_subscription": "Abonelik", "sec_platform": "Platform Karşılaştırması",
        "kv_study_minutes": "Çalışma Süresi (dakika)", "kv_sessions": "Oturum Sayısı",
        "kv_current_streak": "Güncel Seri", "kv_longest_streak": "En Uzun Seri",
        "kv_total_words": "Toplam Kelime", "kv_learned_words": "Öğrenilen Kelime",
        "kv_new_words_period": "Bu Dönem Yeni Kelime", "kv_avg_score": "Ortalama Skor",
        "kv_accuracy": "Doğruluk Oranı", "kv_previous_period": "Önceki Dönem",
        "kv_completed_total": "Toplam Tamamlanan", "kv_completed_period": "Bu Dönem Tamamlanan",
        "kv_progress": "İlerleme", "kv_badges_total": "Toplam Kazanılan", "kv_badges_period": "Bu Dönem Kazanılan",
        "kv_current_tier": "Güncel Kademe", "kv_premium_status": "Premium Durumu", "kv_premium_until": "Premium Bitiş",
        "kv_platform_avg_minutes": "Platform Ort. Süre (dk)", "kv_platform_avg_words": "Platform Ort. Yeni Kelime",
        "kv_platform_avg_accuracy": "Platform Ort. Doğruluk", "kv_xp_percentile": "XP Yüzdelik Dilimi",
        "col_topic": "Konu", "col_attempts": "Deneme", "col_accuracy": "Doğruluk",
        "col_week": "Hafta", "col_tier": "Kademe", "col_outcome": "Sonuç", "col_rank": "Sıralama", "col_xp": "XP",
        "note_same_country": "Bu karşılaştırma şu an aynı ülkedeki (Türkiye) kullanıcı tabanına dayanıyor.",
        "org_title": "Lexis Kurum Raporu", "org_subtitle_tpl": "{period} dönem",
        "sec_org_summary": "Kurum Özeti", "sec_top_learners": "En Aktif Üyeler", "sec_weak_topics": "Zayıf Konular",
        "kv_org_name": "Kurum", "kv_org_plan": "Plan", "kv_member_count": "Üye Sayısı",
        "kv_active_member_count": "Aktif Üye Sayısı", "kv_org_total_minutes": "Toplam Süre (dakika)",
        "kv_org_badges": "Bu Dönem Kazanılan Rozet", "col_user": "Kullanıcı", "col_xp_gained": "Kazanılan XP", "note_consent_summary_tpl": "{consented}/{total} üye bu raporda isimli görünmeyi onayladı.",
        "platform_title": "Lexis Platform Günlük Özet Geçmişi", "platform_subtitle_tpl": "Son {n} gün (bot hariç)",
        "sec_daily_summaries": "Günlük Özetler", "col_date": "Tarih", "col_new_signups": "Yeni Kayıt",
        "col_active_users": "Aktif Kullanıcı", "col_total_minutes": "Toplam Süre (dk)", "col_new_words": "Yeni Kelime",
        "col_avg_accuracy": "Ort. Doğruluk", "col_xp_awarded": "Verilen XP", "col_premium": "Premium",
        "col_total_profiles": "Toplam Aktif Profil",
        "note_avg_accuracy": "Ort. Doğruluk o gün topic_practice_attempts'e hiç kayıt düşmediyse '—' gösterir (0 ile karıştırılmamalı).",
    },
    "en": {
        "generated_at": "Generated", "period_week": "Weekly", "period_month": "Monthly",
        "yes": "Yes", "no": "No", "new": "New", "weak_prefix": "Weak", "strong_prefix": "Strong",
        "user_title": "Lexis User Report", "user_subtitle_tpl": "{period} period — learning language: {lang}",
        "sec_study": "Study Time", "sec_vocab": "Vocabulary", "sec_games": "Game Performance",
        "sec_exam": "Exam / Topic Accuracy", "sec_quests": "Quest Map", "sec_badges": "Badges",
        "sec_league": "League Status", "sec_subscription": "Subscription", "sec_platform": "Platform Comparison",
        "kv_study_minutes": "Study Time (minutes)", "kv_sessions": "Sessions",
        "kv_current_streak": "Current Streak", "kv_longest_streak": "Longest Streak",
        "kv_total_words": "Total Words", "kv_learned_words": "Learned Words",
        "kv_new_words_period": "New Words This Period", "kv_avg_score": "Average Score",
        "kv_accuracy": "Accuracy Rate", "kv_previous_period": "Previous Period",
        "kv_completed_total": "Total Completed", "kv_completed_period": "Completed This Period",
        "kv_progress": "Progress", "kv_badges_total": "Total Earned", "kv_badges_period": "Earned This Period",
        "kv_current_tier": "Current Tier", "kv_premium_status": "Premium Status", "kv_premium_until": "Premium Until",
        "kv_platform_avg_minutes": "Platform Avg. Time (min)", "kv_platform_avg_words": "Platform Avg. New Words",
        "kv_platform_avg_accuracy": "Platform Avg. Accuracy", "kv_xp_percentile": "XP Percentile",
        "col_topic": "Topic", "col_attempts": "Attempts", "col_accuracy": "Accuracy",
        "col_week": "Week", "col_tier": "Tier", "col_outcome": "Outcome", "col_rank": "Rank", "col_xp": "XP",
        "note_same_country": "This comparison is currently based on users in the same country (Turkey).",
        "org_title": "Lexis Organization Report", "org_subtitle_tpl": "{period} period",
        "sec_org_summary": "Organization Summary", "sec_top_learners": "Top Learners", "sec_weak_topics": "Weak Topics",
        "kv_org_name": "Organization", "kv_org_plan": "Plan", "kv_member_count": "Member Count",
        "kv_active_member_count": "Active Members", "kv_org_total_minutes": "Total Time (minutes)",
        "kv_org_badges": "Badges Earned This Period", "col_user": "User", "col_xp_gained": "XP Gained", "note_consent_summary_tpl": "{consented}/{total} members have consented to appear by name in this report.",
        "platform_title": "Lexis Platform Daily Summary History", "platform_subtitle_tpl": "Last {n} days (bots excluded)",
        "sec_daily_summaries": "Daily Summaries", "col_date": "Date", "col_new_signups": "New Signups",
        "col_active_users": "Active Users", "col_total_minutes": "Total Time (min)", "col_new_words": "New Words",
        "col_avg_accuracy": "Avg. Accuracy", "col_xp_awarded": "XP Awarded", "col_premium": "Premium",
        "col_total_profiles": "Total Active Profiles",
        "note_avg_accuracy": "Avg. Accuracy shows '—' if no topic_practice_attempts were recorded that day (not to be confused with 0).",
    },
    "de": {
        "generated_at": "Erstellt", "period_week": "Wöchentlich", "period_month": "Monatlich",
        "yes": "Ja", "no": "Nein", "new": "Neu", "weak_prefix": "Schwach", "strong_prefix": "Stark",
        "user_title": "Lexis-Nutzerbericht", "user_subtitle_tpl": "{period} Zeitraum — Lernsprache: {lang}",
        "sec_study": "Lernzeit", "sec_vocab": "Wortschatz", "sec_games": "Spielleistung",
        "sec_exam": "Prüfungs-/Themengenauigkeit", "sec_quests": "Aufgabenkarte", "sec_badges": "Abzeichen",
        "sec_league": "Liga-Status", "sec_subscription": "Abonnement", "sec_platform": "Plattformvergleich",
        "kv_study_minutes": "Lernzeit (Minuten)", "kv_sessions": "Sitzungen",
        "kv_current_streak": "Aktuelle Serie", "kv_longest_streak": "Längste Serie",
        "kv_total_words": "Wörter gesamt", "kv_learned_words": "Gelernte Wörter",
        "kv_new_words_period": "Neue Wörter in diesem Zeitraum", "kv_avg_score": "Durchschnittliche Punktzahl",
        "kv_accuracy": "Genauigkeit", "kv_previous_period": "Vorheriger Zeitraum",
        "kv_completed_total": "Insgesamt abgeschlossen", "kv_completed_period": "In diesem Zeitraum abgeschlossen",
        "kv_progress": "Fortschritt", "kv_badges_total": "Insgesamt verdient", "kv_badges_period": "In diesem Zeitraum verdient",
        "kv_current_tier": "Aktuelle Stufe", "kv_premium_status": "Premium-Status", "kv_premium_until": "Premium bis",
        "kv_platform_avg_minutes": "Plattform-Durchschnitt (Min.)", "kv_platform_avg_words": "Plattform-Durchschnitt (neue Wörter)",
        "kv_platform_avg_accuracy": "Plattform-Durchschnittsgenauigkeit", "kv_xp_percentile": "XP-Perzentil",
        "col_topic": "Thema", "col_attempts": "Versuche", "col_accuracy": "Genauigkeit",
        "col_week": "Woche", "col_tier": "Stufe", "col_outcome": "Ergebnis", "col_rank": "Rang", "col_xp": "XP",
        "note_same_country": "Dieser Vergleich basiert derzeit auf Nutzern im selben Land (Türkei).",
        "org_title": "Lexis-Organisationsbericht", "org_subtitle_tpl": "{period} Zeitraum",
        "sec_org_summary": "Organisationsübersicht", "sec_top_learners": "Aktivste Mitglieder", "sec_weak_topics": "Schwache Themen",
        "kv_org_name": "Organisation", "kv_org_plan": "Plan", "kv_member_count": "Mitgliederzahl",
        "kv_active_member_count": "Aktive Mitglieder", "kv_org_total_minutes": "Gesamtzeit (Minuten)",
        "kv_org_badges": "In diesem Zeitraum verdiente Abzeichen", "col_user": "Nutzer", "col_xp_gained": "Erhaltene XP", "note_consent_summary_tpl": "{consented}/{total} Mitglieder haben zugestimmt, in diesem Bericht namentlich zu erscheinen.",
        "platform_title": "Lexis Plattform-Tagesübersicht-Verlauf", "platform_subtitle_tpl": "Letzte {n} Tage (ohne Bots)",
        "sec_daily_summaries": "Tagesübersichten", "col_date": "Datum", "col_new_signups": "Neuanmeldungen",
        "col_active_users": "Aktive Nutzer", "col_total_minutes": "Gesamtzeit (Min.)", "col_new_words": "Neue Wörter",
        "col_avg_accuracy": "Durchschn. Genauigkeit", "col_xp_awarded": "Vergebene XP", "col_premium": "Premium",
        "col_total_profiles": "Aktive Profile gesamt",
        "note_avg_accuracy": "Durchschn. Genauigkeit zeigt '—', wenn an diesem Tag keine topic_practice_attempts erfasst wurden (nicht mit 0 verwechseln).",
    },
    "fr": {
        "generated_at": "Généré le", "period_week": "Hebdomadaire", "period_month": "Mensuel",
        "yes": "Oui", "no": "Non", "new": "Nouveau", "weak_prefix": "Faible", "strong_prefix": "Fort",
        "user_title": "Rapport utilisateur Lexis", "user_subtitle_tpl": "Période {period} — langue apprise : {lang}",
        "sec_study": "Temps d'étude", "sec_vocab": "Vocabulaire", "sec_games": "Performance aux jeux",
        "sec_exam": "Précision aux examens / sujets", "sec_quests": "Carte des Quêtes", "sec_badges": "Badges",
        "sec_league": "Statut de Ligue", "sec_subscription": "Abonnement", "sec_platform": "Comparaison avec la plateforme",
        "kv_study_minutes": "Temps d'étude (minutes)", "kv_sessions": "Sessions",
        "kv_current_streak": "Série actuelle", "kv_longest_streak": "Plus longue série",
        "kv_total_words": "Mots au total", "kv_learned_words": "Mots appris",
        "kv_new_words_period": "Nouveaux mots cette période", "kv_avg_score": "Score moyen",
        "kv_accuracy": "Taux de précision", "kv_previous_period": "Période précédente",
        "kv_completed_total": "Total terminé", "kv_completed_period": "Terminé cette période",
        "kv_progress": "Progression", "kv_badges_total": "Total obtenu", "kv_badges_period": "Obtenu cette période",
        "kv_current_tier": "Niveau actuel", "kv_premium_status": "Statut Premium", "kv_premium_until": "Premium jusqu'au",
        "kv_platform_avg_minutes": "Moyenne plateforme (min)", "kv_platform_avg_words": "Moyenne plateforme (nouveaux mots)",
        "kv_platform_avg_accuracy": "Précision moyenne plateforme", "kv_xp_percentile": "Percentile XP",
        "col_topic": "Sujet", "col_attempts": "Essais", "col_accuracy": "Précision",
        "col_week": "Semaine", "col_tier": "Niveau", "col_outcome": "Résultat", "col_rank": "Rang", "col_xp": "XP",
        "note_same_country": "Cette comparaison est actuellement basée sur des utilisateurs du même pays (Turquie).",
        "org_title": "Rapport d'organisation Lexis", "org_subtitle_tpl": "Période {period}",
        "sec_org_summary": "Résumé de l'organisation", "sec_top_learners": "Membres les plus actifs", "sec_weak_topics": "Sujets faibles",
        "kv_org_name": "Organisation", "kv_org_plan": "Plan", "kv_member_count": "Nombre de membres",
        "kv_active_member_count": "Membres actifs", "kv_org_total_minutes": "Temps total (minutes)",
        "kv_org_badges": "Badges obtenus cette période", "col_user": "Utilisateur", "col_xp_gained": "XP gagnés", "note_consent_summary_tpl": "{consented}/{total} membres ont consenti à apparaître nommément dans ce rapport.",
        "platform_title": "Historique du résumé quotidien de la plateforme Lexis", "platform_subtitle_tpl": "{n} derniers jours (bots exclus)",
        "sec_daily_summaries": "Résumés quotidiens", "col_date": "Date", "col_new_signups": "Nouvelles inscriptions",
        "col_active_users": "Utilisateurs actifs", "col_total_minutes": "Temps total (min)", "col_new_words": "Nouveaux mots",
        "col_avg_accuracy": "Précision moy.", "col_xp_awarded": "XP attribués", "col_premium": "Premium",
        "col_total_profiles": "Total profils actifs",
        "note_avg_accuracy": "La précision moy. affiche « — » si aucune tentative (topic_practice_attempts) n'a été enregistrée ce jour-là (à ne pas confondre avec 0).",
    },
    "es": {
        "generated_at": "Generado", "period_week": "Semanal", "period_month": "Mensual",
        "yes": "Sí", "no": "No", "new": "Nuevo", "weak_prefix": "Débil", "strong_prefix": "Fuerte",
        "user_title": "Informe de usuario de Lexis", "user_subtitle_tpl": "Periodo {period} — idioma de aprendizaje: {lang}",
        "sec_study": "Tiempo de estudio", "sec_vocab": "Vocabulario", "sec_games": "Rendimiento en juegos",
        "sec_exam": "Precisión de examen / tema", "sec_quests": "Mapa de Misiones", "sec_badges": "Insignias",
        "sec_league": "Estado de la Liga", "sec_subscription": "Suscripción", "sec_platform": "Comparación con la plataforma",
        "kv_study_minutes": "Tiempo de estudio (minutos)", "kv_sessions": "Sesiones",
        "kv_current_streak": "Racha actual", "kv_longest_streak": "Racha más larga",
        "kv_total_words": "Palabras totales", "kv_learned_words": "Palabras aprendidas",
        "kv_new_words_period": "Nuevas palabras este periodo", "kv_avg_score": "Puntuación media",
        "kv_accuracy": "Tasa de precisión", "kv_previous_period": "Periodo anterior",
        "kv_completed_total": "Total completado", "kv_completed_period": "Completado este periodo",
        "kv_progress": "Progreso", "kv_badges_total": "Total obtenido", "kv_badges_period": "Obtenido este periodo",
        "kv_current_tier": "Nivel actual", "kv_premium_status": "Estado Premium", "kv_premium_until": "Premium hasta",
        "kv_platform_avg_minutes": "Media plataforma (min)", "kv_platform_avg_words": "Media plataforma (palabras nuevas)",
        "kv_platform_avg_accuracy": "Precisión media plataforma", "kv_xp_percentile": "Percentil de XP",
        "col_topic": "Tema", "col_attempts": "Intentos", "col_accuracy": "Precisión",
        "col_week": "Semana", "col_tier": "Nivel", "col_outcome": "Resultado", "col_rank": "Posición", "col_xp": "XP",
        "note_same_country": "Esta comparación se basa actualmente en usuarios del mismo país (Turquía).",
        "org_title": "Informe de organización Lexis", "org_subtitle_tpl": "Periodo {period}",
        "sec_org_summary": "Resumen de la organización", "sec_top_learners": "Miembros más activos", "sec_weak_topics": "Temas débiles",
        "kv_org_name": "Organización", "kv_org_plan": "Plan", "kv_member_count": "Número de miembros",
        "kv_active_member_count": "Miembros activos", "kv_org_total_minutes": "Tiempo total (minutos)",
        "kv_org_badges": "Insignias obtenidas este periodo", "col_user": "Usuario", "col_xp_gained": "XP obtenidos", "note_consent_summary_tpl": "{consented}/{total} miembros han dado su consentimiento para aparecer con su nombre en este informe.",
        "platform_title": "Historial de resúmenes diarios de la plataforma Lexis", "platform_subtitle_tpl": "Últimos {n} días (bots excluidos)",
        "sec_daily_summaries": "Resúmenes diarios", "col_date": "Fecha", "col_new_signups": "Nuevos registros",
        "col_active_users": "Usuarios activos", "col_total_minutes": "Tiempo total (min)", "col_new_words": "Palabras nuevas",
        "col_avg_accuracy": "Precisión media", "col_xp_awarded": "XP otorgados", "col_premium": "Premium",
        "col_total_profiles": "Total de perfiles activos",
        "note_avg_accuracy": "La precisión media muestra «—» si ese día no se registró ningún topic_practice_attempts (no confundir con 0).",
    },
    "it": {
        "generated_at": "Generato", "period_week": "Settimanale", "period_month": "Mensile",
        "yes": "Sì", "no": "No", "new": "Nuovo", "weak_prefix": "Debole", "strong_prefix": "Forte",
        "user_title": "Report utente Lexis", "user_subtitle_tpl": "Periodo {period} — lingua di apprendimento: {lang}",
        "sec_study": "Tempo di studio", "sec_vocab": "Vocabolario", "sec_games": "Prestazioni nei giochi",
        "sec_exam": "Precisione esami / argomenti", "sec_quests": "Mappa delle Missioni", "sec_badges": "Badge",
        "sec_league": "Stato Lega", "sec_subscription": "Abbonamento", "sec_platform": "Confronto con la piattaforma",
        "kv_study_minutes": "Tempo di studio (minuti)", "kv_sessions": "Sessioni",
        "kv_current_streak": "Serie attuale", "kv_longest_streak": "Serie più lunga",
        "kv_total_words": "Parole totali", "kv_learned_words": "Parole apprese",
        "kv_new_words_period": "Nuove parole in questo periodo", "kv_avg_score": "Punteggio medio",
        "kv_accuracy": "Tasso di precisione", "kv_previous_period": "Periodo precedente",
        "kv_completed_total": "Totale completato", "kv_completed_period": "Completato in questo periodo",
        "kv_progress": "Progresso", "kv_badges_total": "Totale ottenuti", "kv_badges_period": "Ottenuti in questo periodo",
        "kv_current_tier": "Livello attuale", "kv_premium_status": "Stato Premium", "kv_premium_until": "Premium fino al",
        "kv_platform_avg_minutes": "Media piattaforma (min)", "kv_platform_avg_words": "Media piattaforma (nuove parole)",
        "kv_platform_avg_accuracy": "Precisione media piattaforma", "kv_xp_percentile": "Percentile XP",
        "col_topic": "Argomento", "col_attempts": "Tentativi", "col_accuracy": "Precisione",
        "col_week": "Settimana", "col_tier": "Livello", "col_outcome": "Esito", "col_rank": "Posizione", "col_xp": "XP",
        "note_same_country": "Questo confronto si basa attualmente su utenti dello stesso paese (Turchia).",
        "org_title": "Report organizzazione Lexis", "org_subtitle_tpl": "Periodo {period}",
        "sec_org_summary": "Riepilogo organizzazione", "sec_top_learners": "Membri più attivi", "sec_weak_topics": "Argomenti deboli",
        "kv_org_name": "Organizzazione", "kv_org_plan": "Piano", "kv_member_count": "Numero di membri",
        "kv_active_member_count": "Membri attivi", "kv_org_total_minutes": "Tempo totale (minuti)",
        "kv_org_badges": "Badge ottenuti in questo periodo", "col_user": "Utente", "col_xp_gained": "XP ottenuti", "note_consent_summary_tpl": "{consented}/{total} membri hanno acconsentito a comparire con il proprio nome in questo report.",
        "platform_title": "Cronologia riepiloghi giornalieri della piattaforma Lexis", "platform_subtitle_tpl": "Ultimi {n} giorni (bot esclusi)",
        "sec_daily_summaries": "Riepiloghi giornalieri", "col_date": "Data", "col_new_signups": "Nuove iscrizioni",
        "col_active_users": "Utenti attivi", "col_total_minutes": "Tempo totale (min)", "col_new_words": "Nuove parole",
        "col_avg_accuracy": "Precisione media", "col_xp_awarded": "XP assegnati", "col_premium": "Premium",
        "col_total_profiles": "Totale profili attivi",
        "note_avg_accuracy": "La precisione media mostra '—' se quel giorno non è stato registrato alcun topic_practice_attempts (da non confondere con 0).",
    },
    "ar": {
        "generated_at": "تم الإنشاء", "period_week": "أسبوعي", "period_month": "شهري",
        "yes": "نعم", "no": "لا", "new": "جديد", "weak_prefix": "ضعيف", "strong_prefix": "قوي",
        "user_title": "تقرير مستخدم Lexis", "user_subtitle_tpl": "فترة {period} — لغة التعلم: {lang}",
        "sec_study": "وقت الدراسة", "sec_vocab": "المفردات", "sec_games": "أداء الألعاب",
        "sec_exam": "دقة الاختبار / الموضوع", "sec_quests": "خريطة المهام", "sec_badges": "الأوسمة",
        "sec_league": "حالة الدوري", "sec_subscription": "الاشتراك", "sec_platform": "مقارنة مع المنصة",
        "kv_study_minutes": "وقت الدراسة (دقائق)", "kv_sessions": "عدد الجلسات",
        "kv_current_streak": "السلسلة الحالية", "kv_longest_streak": "أطول سلسلة",
        "kv_total_words": "إجمالي الكلمات", "kv_learned_words": "الكلمات المتعلمة",
        "kv_new_words_period": "كلمات جديدة هذه الفترة", "kv_avg_score": "متوسط النتيجة",
        "kv_accuracy": "نسبة الدقة", "kv_previous_period": "الفترة السابقة",
        "kv_completed_total": "إجمالي المكتمل", "kv_completed_period": "مكتمل هذه الفترة",
        "kv_progress": "التقدم", "kv_badges_total": "إجمالي المكتسب", "kv_badges_period": "مكتسب هذه الفترة",
        "kv_current_tier": "المستوى الحالي", "kv_premium_status": "حالة Premium", "kv_premium_until": "Premium حتى",
        "kv_platform_avg_minutes": "متوسط المنصة (دقائق)", "kv_platform_avg_words": "متوسط المنصة (كلمات جديدة)",
        "kv_platform_avg_accuracy": "متوسط دقة المنصة", "kv_xp_percentile": "الشريحة المئوية لنقاط الخبرة",
        "col_topic": "الموضوع", "col_attempts": "المحاولات", "col_accuracy": "الدقة",
        "col_week": "الأسبوع", "col_tier": "المستوى", "col_outcome": "النتيجة", "col_rank": "الترتيب", "col_xp": "XP",
        "note_same_country": "تعتمد هذه المقارنة حاليًا على المستخدمين في نفس البلد (تركيا).",
        "org_title": "تقرير مؤسسة Lexis", "org_subtitle_tpl": "فترة {period}",
        "sec_org_summary": "ملخص المؤسسة", "sec_top_learners": "الأعضاء الأكثر نشاطًا", "sec_weak_topics": "المواضيع الضعيفة",
        "kv_org_name": "المؤسسة", "kv_org_plan": "الخطة", "kv_member_count": "عدد الأعضاء",
        "kv_active_member_count": "الأعضاء النشطون", "kv_org_total_minutes": "الوقت الإجمالي (دقائق)",
        "kv_org_badges": "الأوسمة المكتسبة هذه الفترة", "col_user": "المستخدم", "col_xp_gained": "XP المكتسبة", "note_consent_summary_tpl": "{consented}/{total} من الأعضاء وافقوا على الظهور بالاسم في هذا التقرير.",
        "platform_title": "سجل الملخص اليومي لمنصة Lexis", "platform_subtitle_tpl": "آخر {n} يومًا (باستثناء البوتات)",
        "sec_daily_summaries": "الملخصات اليومية", "col_date": "التاريخ", "col_new_signups": "تسجيلات جديدة",
        "col_active_users": "مستخدمون نشطون", "col_total_minutes": "الوقت الإجمالي (دقائق)", "col_new_words": "كلمات جديدة",
        "col_avg_accuracy": "متوسط الدقة", "col_xp_awarded": "XP الممنوحة", "col_premium": "Premium",
        "col_total_profiles": "إجمالي الملفات النشطة",
        "note_avg_accuracy": "يعرض متوسط الدقة '—' إذا لم يتم تسجيل أي topic_practice_attempts في ذلك اليوم (لا يجب الخلط بينه وبين 0).",
    },
    "ru": {
        "generated_at": "Создано", "period_week": "Еженедельный", "period_month": "Ежемесячный",
        "yes": "Да", "no": "Нет", "new": "Новое", "weak_prefix": "Слабый", "strong_prefix": "Сильный",
        "user_title": "Отчёт пользователя Lexis", "user_subtitle_tpl": "Период: {period} — изучаемый язык: {lang}",
        "sec_study": "Время учёбы", "sec_vocab": "Словарный запас", "sec_games": "Результаты в играх",
        "sec_exam": "Точность экзаменов / тем", "sec_quests": "Карта заданий", "sec_badges": "Значки",
        "sec_league": "Статус лиги", "sec_subscription": "Подписка", "sec_platform": "Сравнение с платформой",
        "kv_study_minutes": "Время учёбы (минуты)", "kv_sessions": "Сессии",
        "kv_current_streak": "Текущая серия", "kv_longest_streak": "Самая длинная серия",
        "kv_total_words": "Всего слов", "kv_learned_words": "Выучено слов",
        "kv_new_words_period": "Новые слова за этот период", "kv_avg_score": "Средний счёт",
        "kv_accuracy": "Точность", "kv_previous_period": "Предыдущий период",
        "kv_completed_total": "Всего выполнено", "kv_completed_period": "Выполнено за этот период",
        "kv_progress": "Прогресс", "kv_badges_total": "Всего получено", "kv_badges_period": "Получено за этот период",
        "kv_current_tier": "Текущий уровень", "kv_premium_status": "Статус Premium", "kv_premium_until": "Premium до",
        "kv_platform_avg_minutes": "Среднее по платформе (мин)", "kv_platform_avg_words": "Среднее по платформе (новые слова)",
        "kv_platform_avg_accuracy": "Средняя точность платформы", "kv_xp_percentile": "Процентиль по опыту (XP)",
        "col_topic": "Тема", "col_attempts": "Попытки", "col_accuracy": "Точность",
        "col_week": "Неделя", "col_tier": "Уровень", "col_outcome": "Результат", "col_rank": "Место", "col_xp": "XP",
        "note_same_country": "Это сравнение сейчас основано на пользователях из одной страны (Турция).",
        "org_title": "Отчёт организации Lexis", "org_subtitle_tpl": "Период: {period}",
        "sec_org_summary": "Сводка организации", "sec_top_learners": "Самые активные участники", "sec_weak_topics": "Слабые темы",
        "kv_org_name": "Организация", "kv_org_plan": "Тариф", "kv_member_count": "Количество участников",
        "kv_active_member_count": "Активные участники", "kv_org_total_minutes": "Общее время (минуты)",
        "kv_org_badges": "Значков получено за этот период", "col_user": "Пользователь", "col_xp_gained": "Получено XP", "note_consent_summary_tpl": "{consented}/{total} участников дали согласие на отображение по имени в этом отчёте.",
        "platform_title": "История ежедневных сводок платформы Lexis", "platform_subtitle_tpl": "Последние {n} дн. (без ботов)",
        "sec_daily_summaries": "Ежедневные сводки", "col_date": "Дата", "col_new_signups": "Новые регистрации",
        "col_active_users": "Активные пользователи", "col_total_minutes": "Общее время (мин)", "col_new_words": "Новые слова",
        "col_avg_accuracy": "Средняя точность", "col_xp_awarded": "Начислено XP", "col_premium": "Premium",
        "col_total_profiles": "Всего активных профилей",
        "note_avg_accuracy": "Средняя точность показывает «—», если в этот день не было записей topic_practice_attempts (не путать с 0).",
    },
    "ja": {
        "generated_at": "作成日時", "period_week": "週次", "period_month": "月次",
        "yes": "はい", "no": "いいえ", "new": "新規", "weak_prefix": "苦手", "strong_prefix": "得意",
        "user_title": "Lexis ユーザーレポート", "user_subtitle_tpl": "{period}期間 — 学習言語: {lang}",
        "sec_study": "学習時間", "sec_vocab": "語彙", "sec_games": "ゲーム成績",
        "sec_exam": "試験・トピック正答率", "sec_quests": "クエストマップ", "sec_badges": "バッジ",
        "sec_league": "リーグ状況", "sec_subscription": "サブスクリプション", "sec_platform": "プラットフォーム比較",
        "kv_study_minutes": "学習時間（分）", "kv_sessions": "セッション数",
        "kv_current_streak": "現在の連続記録", "kv_longest_streak": "最長記録",
        "kv_total_words": "合計単語数", "kv_learned_words": "習得済み単語",
        "kv_new_words_period": "この期間の新規単語", "kv_avg_score": "平均スコア",
        "kv_accuracy": "正答率", "kv_previous_period": "前期間",
        "kv_completed_total": "累計完了数", "kv_completed_period": "この期間の完了数",
        "kv_progress": "進捗", "kv_badges_total": "累計獲得数", "kv_badges_period": "この期間の獲得数",
        "kv_current_tier": "現在のティア", "kv_premium_status": "プレミアム状況", "kv_premium_until": "プレミアム有効期限",
        "kv_platform_avg_minutes": "プラットフォーム平均（分）", "kv_platform_avg_words": "プラットフォーム平均（新規単語）",
        "kv_platform_avg_accuracy": "プラットフォーム平均正答率", "kv_xp_percentile": "XPパーセンタイル",
        "col_topic": "トピック", "col_attempts": "試行回数", "col_accuracy": "正答率",
        "col_week": "週", "col_tier": "ティア", "col_outcome": "結果", "col_rank": "順位", "col_xp": "XP",
        "note_same_country": "この比較は現在、同じ国（トルコ）のユーザーに基づいています。",
        "org_title": "Lexis 組織レポート", "org_subtitle_tpl": "{period}期間",
        "sec_org_summary": "組織概要", "sec_top_learners": "最も活発なメンバー", "sec_weak_topics": "弱いトピック",
        "kv_org_name": "組織", "kv_org_plan": "プラン", "kv_member_count": "メンバー数",
        "kv_active_member_count": "アクティブメンバー数", "kv_org_total_minutes": "合計時間（分）",
        "kv_org_badges": "この期間に獲得したバッジ", "col_user": "ユーザー", "col_xp_gained": "獲得XP", "note_consent_summary_tpl": "{consented}/{total} 人のメンバーがこのレポートに氏名を表示することに同意しました。",
        "platform_title": "Lexis プラットフォーム日次サマリー履歴", "platform_subtitle_tpl": "過去{n}日間（ボットを除く）",
        "sec_daily_summaries": "日次サマリー", "col_date": "日付", "col_new_signups": "新規登録",
        "col_active_users": "アクティブユーザー", "col_total_minutes": "合計時間（分）", "col_new_words": "新規単語",
        "col_avg_accuracy": "平均正答率", "col_xp_awarded": "付与XP", "col_premium": "プレミアム",
        "col_total_profiles": "合計アクティブプロフィール",
        "note_avg_accuracy": "その日にtopic_practice_attemptsの記録がない場合、平均正答率は「—」と表示されます（0とは異なります）。",
    },
    "pt": {
        "generated_at": "Gerado", "period_week": "Semanal", "period_month": "Mensal",
        "yes": "Sim", "no": "Não", "new": "Novo", "weak_prefix": "Fraco", "strong_prefix": "Forte",
        "user_title": "Relatório de Utilizador Lexis", "user_subtitle_tpl": "Período {period} — idioma de aprendizagem: {lang}",
        "sec_study": "Tempo de Estudo", "sec_vocab": "Vocabulário", "sec_games": "Desempenho em Jogos",
        "sec_exam": "Precisão de Exame / Tópico", "sec_quests": "Mapa de Missões", "sec_badges": "Insígnias",
        "sec_league": "Estado da Liga", "sec_subscription": "Assinatura", "sec_platform": "Comparação com a Plataforma",
        "kv_study_minutes": "Tempo de Estudo (minutos)", "kv_sessions": "Sessões",
        "kv_current_streak": "Sequência atual", "kv_longest_streak": "Sequência mais longa",
        "kv_total_words": "Total de palavras", "kv_learned_words": "Palavras aprendidas",
        "kv_new_words_period": "Novas palavras neste período", "kv_avg_score": "Pontuação média",
        "kv_accuracy": "Taxa de precisão", "kv_previous_period": "Período anterior",
        "kv_completed_total": "Total concluído", "kv_completed_period": "Concluído neste período",
        "kv_progress": "Progresso", "kv_badges_total": "Total conquistado", "kv_badges_period": "Conquistado neste período",
        "kv_current_tier": "Nível atual", "kv_premium_status": "Estado Premium", "kv_premium_until": "Premium até",
        "kv_platform_avg_minutes": "Média da plataforma (min)", "kv_platform_avg_words": "Média da plataforma (novas palavras)",
        "kv_platform_avg_accuracy": "Precisão média da plataforma", "kv_xp_percentile": "Percentil de XP",
        "col_topic": "Tópico", "col_attempts": "Tentativas", "col_accuracy": "Precisão",
        "col_week": "Semana", "col_tier": "Nível", "col_outcome": "Resultado", "col_rank": "Posição", "col_xp": "XP",
        "note_same_country": "Esta comparação baseia-se atualmente em utilizadores do mesmo país (Turquia).",
        "org_title": "Relatório de Organização Lexis", "org_subtitle_tpl": "Período {period}",
        "sec_org_summary": "Resumo da Organização", "sec_top_learners": "Membros Mais Ativos", "sec_weak_topics": "Tópicos Fracos",
        "kv_org_name": "Organização", "kv_org_plan": "Plano", "kv_member_count": "Número de Membros",
        "kv_active_member_count": "Membros Ativos", "kv_org_total_minutes": "Tempo Total (minutos)",
        "kv_org_badges": "Insígnias Conquistadas Neste Período", "col_user": "Utilizador", "col_xp_gained": "XP Ganho", "note_consent_summary_tpl": "{consented}/{total} membros consentiram em aparecer com o nome neste relatório.",
        "platform_title": "Histórico de Resumos Diários da Plataforma Lexis", "platform_subtitle_tpl": "Últimos {n} dias (bots excluídos)",
        "sec_daily_summaries": "Resumos Diários", "col_date": "Data", "col_new_signups": "Novos Registos",
        "col_active_users": "Utilizadores Ativos", "col_total_minutes": "Tempo Total (min)", "col_new_words": "Novas Palavras",
        "col_avg_accuracy": "Precisão Média", "col_xp_awarded": "XP Atribuído", "col_premium": "Premium",
        "col_total_profiles": "Total de Perfis Ativos",
        "note_avg_accuracy": "A Precisão Média mostra '—' se nenhum topic_practice_attempts foi registado nesse dia (não confundir com 0).",
    },
}


def _get_labels(lang: str) -> dict[str, str]:
    """email_service.py::_DAILY_WORD_UI_STRINGS ile aynı fallback deseni:
    desteklenmeyen/boş bir kod -> İngilizce."""
    return _L.get(lang, _L["en"])


def _fmt_num(value: int | float | None, suffix: str = "") -> str:
    return "—" if value is None else f"{value}{suffix}"


def _fmt_change(value: int | float | None, new_label: str) -> str:
    if value is None:
        return new_label
    sign = "+" if value >= 0 else ""
    return f"{sign}{value}%"


def _fmt_bool(value: bool | None, yes_label: str, no_label: str) -> str:
    return yes_label if value else no_label


def build_user_report_document(
    report: dict[str, Any], *, username: str, generated_at: str, lang: str = "tr"
) -> ReportDocument:
    L = _get_labels(lang)
    period_label = L["period_week"] if report.get("period") == "week" else L["period_month"]
    study = report.get("study", {})
    streak = report.get("streak", {})
    vocab = report.get("vocabulary", {})
    games = report.get("games", {})
    exam = report.get("exam", {})
    quests = report.get("quests", {})
    badges = report.get("badges", {})
    league = report.get("league", {})
    subscription = report.get("subscription", {})
    platform = report.get("platform", {})

    topic_rows = [
        [f"{L['weak_prefix']}: {t['topic_tag']}", str(t["attempts"]), f"%{t['accuracy']}"]
        for t in exam.get("weak_topics", [])
    ] + [
        [f"{L['strong_prefix']}: {t['topic_tag']}", str(t["attempts"]), f"%{t['accuracy']}"]
        for t in exam.get("strong_topics", [])
    ]

    league_rows = [
        [
            h.get("week_start") or "—",
            h.get("tier_slug") or "—",
            h.get("outcome") or "—",
            str(h.get("final_rank")) if h.get("final_rank") is not None else "—",
            str(h.get("final_xp")) if h.get("final_xp") is not None else "—",
        ]
        for h in league.get("history", [])
    ]

    sections = [
        ReportSection(
            title=L["sec_study"],
            kv_pairs=[
                (L["kv_study_minutes"], f"{study.get('minutes_current', 0)} ({_fmt_change(study.get('minutes_change_pct'), L['new'])})"),
                (L["kv_sessions"], f"{study.get('sessions_current', 0)} ({_fmt_change(study.get('sessions_change_pct'), L['new'])})"),
                (L["kv_current_streak"], f"{streak.get('current', 0)}"),
                (L["kv_longest_streak"], f"{streak.get('longest', 0)}"),
            ],
        ),
        ReportSection(
            title=L["sec_vocab"],
            kv_pairs=[
                (L["kv_total_words"], str(vocab.get("total_words", 0))),
                (L["kv_learned_words"], f"{vocab.get('learned_words', 0)} (%{vocab.get('learned_pct', 0)})"),
                (L["kv_new_words_period"], f"{vocab.get('new_words_current', 0)} ({_fmt_change(vocab.get('new_words_change_pct'), L['new'])})"),
            ],
        ),
        ReportSection(
            title=L["sec_games"],
            kv_pairs=[
                (L["kv_sessions"], f"{games.get('sessions_current', 0)} ({_fmt_change(games.get('sessions_change_pct'), L['new'])})"),
                (L["kv_avg_score"], f"{games.get('avg_score_current', 0)}"),
            ],
        ),
        ReportSection(
            title=L["sec_exam"],
            kv_pairs=[
                (L["kv_accuracy"], _fmt_num(exam.get("accuracy_current"), "%")),
                (L["kv_previous_period"], _fmt_num(exam.get("accuracy_previous"), "%")),
            ],
            table_headers=[L["col_topic"], L["col_attempts"], L["col_accuracy"]] if topic_rows else None,
            table_rows=topic_rows or None,
        ),
        ReportSection(
            title=L["sec_quests"],
            kv_pairs=[
                (L["kv_completed_total"], str(quests.get("completed_total", 0))),
                (L["kv_completed_period"], str(quests.get("completed_current", 0))),
                (L["kv_progress"], f"%{quests.get('progress_pct', 0)}"),
            ],
        ),
        ReportSection(
            title=L["sec_badges"],
            kv_pairs=[
                (L["kv_badges_total"], str(badges.get("total_earned", 0))),
                (L["kv_badges_period"], str(badges.get("earned_current", 0))),
            ],
        ),
        ReportSection(
            title=L["sec_league"],
            kv_pairs=[(L["kv_current_tier"], league.get("current_tier") or "—")],
            table_headers=[L["col_week"], L["col_tier"], L["col_outcome"], L["col_rank"], L["col_xp"]] if league_rows else None,
            table_rows=league_rows or None,
        ),
        ReportSection(
            title=L["sec_subscription"],
            kv_pairs=[
                (L["kv_premium_status"], _fmt_bool(subscription.get("is_premium"), L["yes"], L["no"])),
                (L["kv_premium_until"], subscription.get("premium_until") or "—"),
            ],
        ),
        ReportSection(
            title=L["sec_platform"],
            kv_pairs=[
                (L["kv_platform_avg_minutes"], _fmt_num(platform.get("avg_minutes_current"))),
                (L["kv_platform_avg_words"], _fmt_num(platform.get("avg_new_words_current"))),
                (L["kv_platform_avg_accuracy"], _fmt_num(platform.get("avg_accuracy_current"), "%")),
                (L["kv_xp_percentile"], _fmt_num(platform.get("xp_percentile"), "%")),
            ],
            note=L["note_same_country"] if platform.get("same_country_cohort") else None,
        ),
    ]

    return ReportDocument(
        title=f"{L['user_title']} — {username}",
        subtitle=L["user_subtitle_tpl"].format(period=period_label, lang=str(report.get("learning_lang", "—")).upper()),
        generated_at=f"{L['generated_at']}: {generated_at}",
        sections=sections,
    )


def build_org_report_document(report: dict[str, Any], *, generated_at: str, lang: str = "tr") -> ReportDocument:
    L = _get_labels(lang)
    org = report.get("org", {})
    period_label = L["period_week"] if report.get("period") == "week" else L["period_month"]
    study = report.get("study", {})
    accuracy = report.get("accuracy", {})
    vocab = report.get("vocabulary", {})
    top_learners = report.get("top_learners", [])
    weak_topics = report.get("weak_topics", [])
    consent_summary = report.get("consent_summary", {})

    sections = [
        ReportSection(
            title=L["sec_org_summary"],
            kv_pairs=[
                (L["kv_org_name"], org.get("name") or "—"),
                (L["kv_org_plan"], org.get("plan") or "—"),
                (L["kv_member_count"], str(report.get("member_count", 0))),
                (L["kv_active_member_count"], str(report.get("active_member_count", 0))),
            ],
        ),
        ReportSection(
            title=L["sec_study"],
            kv_pairs=[
                (L["kv_org_total_minutes"], f"{study.get('minutes_current', 0)} ({_fmt_change(study.get('minutes_change_pct'), L['new'])})"),
                (L["kv_sessions"], f"{study.get('sessions_current', 0)} ({_fmt_change(study.get('sessions_change_pct'), L['new'])})"),
                (L["kv_accuracy"], _fmt_num(accuracy.get("current"), "%")),
                (L["kv_new_words_period"], f"{vocab.get('new_words_current', 0)} ({_fmt_change(vocab.get('new_words_change_pct'), L['new'])})"),
                (L["kv_org_badges"], str(report.get("badges_earned_current", 0))),
            ],
        ),
        ReportSection(
            # madde G (KVKK onay mekanizması): top_learners zaten sadece
            # report_consent_at dolu üyeleri içeriyor (bkz.
            # organization_report_service.py) — bu not, kurum adminine
            # ŞEFFAFLIK için kaç üyeden kaçının onaylı olduğunu gösteriyor.
            title=L["sec_top_learners"],
            table_headers=[L["col_user"], L["col_xp_gained"]] if top_learners else None,
            table_rows=[[t.get("username") or t.get("user_id", "—"), str(t.get("xp_gained", 0))] for t in top_learners] or None,
            note=L["note_consent_summary_tpl"].format(
                consented=consent_summary.get("consented_count", 0),
                total=consent_summary.get("total_count", 0),
            ) if consent_summary.get("total_count") else None,
        ),
        ReportSection(
            title=L["sec_weak_topics"],
            table_headers=[L["col_topic"], L["col_attempts"], L["col_accuracy"]] if weak_topics else None,
            table_rows=[[t["topic_tag"], str(t["attempts"]), f"%{t['accuracy']}"] for t in weak_topics] or None,
        ),
    ]

    return ReportDocument(
        title=f"{L['org_title']} — {org.get('name') or '—'}",
        subtitle=L["org_subtitle_tpl"].format(period=period_label),
        generated_at=f"{L['generated_at']}: {generated_at}",
        sections=sections,
    )


def build_platform_snapshots_document(
    snapshots: list[dict[str, Any]], *, generated_at: str, lang: str = "tr"
) -> ReportDocument:
    L = _get_labels(lang)
    rows = [
        [
            str(s.get("snapshot_date", "—")),
            str(s.get("new_signups_count", 0)),
            str(s.get("active_users_count", 0)),
            str(s.get("total_study_minutes", 0)),
            str(s.get("total_new_words", 0)),
            _fmt_num(s.get("avg_topic_accuracy"), "%"),
            str(s.get("total_xp_awarded", 0)),
            str(s.get("premium_users_count", 0)),
            str(s.get("total_active_profiles", 0)),
        ]
        for s in snapshots
    ]
    return ReportDocument(
        title=L["platform_title"],
        subtitle=L["platform_subtitle_tpl"].format(n=len(snapshots)),
        generated_at=f"{L['generated_at']}: {generated_at}",
        sections=[
            ReportSection(
                title=L["sec_daily_summaries"],
                table_headers=[
                    L["col_date"], L["col_new_signups"], L["col_active_users"], L["col_total_minutes"],
                    L["col_new_words"], L["col_avg_accuracy"], L["col_xp_awarded"], L["col_premium"], L["col_total_profiles"],
                ],
                table_rows=rows,
                note=L["note_avg_accuracy"],
            )
        ],
    )
