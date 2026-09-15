'use client';

import type { ScheduleItem } from '@/types';

// ── Çalışma Programı PDF Çıktısı ──────────────────────────────────────────
// KULLANICI İSTEĞİ (15 Eylül 2026): "çalışma programını uyguladıktan sonra,
// bunun pdf vb formatta çıktısını alma özelliği eksik, bunu yapalım, kişi o
// programın çıktısını alıp, çalışma masasında kullanabilir, kitaplığa veya
// başka bir yere asabilir, çıktı için canvadan template üret bir kaç tane,
// onun üzerine çalışma programını ekle."
//
// Üç farklı görsel şablon sunuyoruz (GradientPosterTemplate / MinimalPosterTemplate /
// ChecklistTemplate). Bunlardan biri <ScheduleExportModal> içinde ekran dışında
// (offscreen) tam boyutunda render ediliyor, html2canvas-pro ile rastere çevriliyor,
// jsPDF ile PDF'e gömülüp indiriliyor (bkz. exportScheduleToPdf).
//
// Not: Burada BİLİNÇLİ olarak Tailwind sınıfları değil, inline hex renkler
// kullanıldı — Tailwind v4'ün varsayılan paleti oklch() tabanlı ve html2canvas
// (klasik paket) bunu doğru yakalayamıyordu; html2canvas-pro seçilmesinin
// sebebi de bu, ama tasarım bileşenlerinde hex kullanmak ek bir güvenlik katmanı.

export type ExportTemplateId = 'gradient' | 'minimal' | 'checklist';

export interface ExportDayGroup {
  day: string;
  dayIndex: number;
  items: ScheduleItem[];
}

export interface ScheduleExportData {
  /** Pazartesi → Pazar sırasıyla, sadece aktif (is_active !== false) öğeler */
  groups: ExportDayGroup[];
  totalItems: number;
  activeDays: number;
  /** örn. "15 Eylül 2026" */
  dateLabel: string;
  ownerName: string;
}

export const EXPORT_TEMPLATES: { id: ExportTemplateId; name: string; desc: string; accent: string }[] = [
  { id: 'gradient', name: 'Duvar Posteri', desc: 'Lexis marka renkleri · A4 · asmak için ideal', accent: '#5B3EB0' },
  { id: 'minimal', name: 'Sade Baskı', desc: 'Beyaz zemin, az mürekkep · A4 · hızlı yazdır', accent: '#185FA5' },
  { id: 'checklist', name: 'Masa Kontrol Listesi', desc: 'Kutucuklu uzun liste · masada işaretleyerek kullan', accent: '#B7791F' },
];

// A4 @ 96dpi
const A4_W = 794;
const A4_H = 1123;

// Poster şablonlarında (gradient/minimal) sabit yüksekliğe taşmayı önlemek için
// gün başına gösterilen etkinlik sayısı sınırlanıyor; kontrol listesi şablonu
// (ChecklistTemplate) serbest yükseklikte olduğu için sınırsız.
const MAX_CHIPS_PER_DAY = 4;

// page.tsx'teki DAY_COLORS ile birebir aynı palet (uygulama içi görünümle
// tutarlılık için) — hex olarak burada tekrarlandı çünkü export şablonları
// Tailwind sınıfı kullanmıyor (yukarıdaki not).
const EXPORT_DAY_COLORS = [
  { bg: '#FAEEDA', text: '#854F0B' }, // 0 Pazar
  { bg: '#E6F1FB', text: '#185FA5' }, // 1 Pazartesi
  { bg: '#EAF3DE', text: '#3B6D11' }, // 2 Salı
  { bg: '#EEEDFE', text: '#534AB7' }, // 3 Çarşamba
  { bg: '#E1F5EE', text: '#0F6E56' }, // 4 Perşembe
  { bg: '#E6F1FB', text: '#185FA5' }, // 5 Cuma
  { bg: '#FAEEDA', text: '#854F0B' }, // 6 Cumartesi
];

const FONT_STACK = "'Poppins', 'Segoe UI', -apple-system, sans-serif";

// ── 1) Duvar Posteri — marka gradyanı (CEO duyuru posteriyle aynı görsel dil) ──
export function GradientPosterTemplate({ data }: { data: ScheduleExportData }) {
  return (
    <div
      style={{
        width: A4_W, height: A4_H, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, #09112E 0%, #131B3F 55%, #1B1447 100%)',
        fontFamily: FONT_STACK, color: '#FFFFFF', boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'absolute', top: -80, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(58,92,209,0.55), rgba(58,92,209,0) 70%)' }} />
      <div style={{ position: 'absolute', top: -40, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,62,176,0.45), rgba(91,62,176,0) 70%)' }} />
      <div style={{ position: 'absolute', bottom: -100, right: -80, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,62,176,0.5), rgba(91,62,176,0) 70%)' }} />

      <div style={{ position: 'relative', padding: '46px 44px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#1E2A5A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#FFFFFF' }}>L</div>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.3, opacity: 0.9 }}>Lexis</span>
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, lineHeight: 1.25 }}>Haftalık Çalışma Programım</h1>
        <p style={{ fontSize: 13, color: '#B0B7C9', margin: '8px 0 0' }}>{data.ownerName} · {data.dateLabel}</p>
        <p style={{ fontSize: 12, color: '#8790A8', margin: '4px 0 0' }}>{data.activeDays} aktif gün · {data.totalItems} etkinlik</p>
      </div>

      <div style={{ position: 'relative', padding: '22px 44px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.groups.map((g) => (
          <div
            key={g.dayIndex}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: '12px 16px', minHeight: 76, boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7C8CF0', display: 'inline-block' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{g.day}</span>
              {g.items.length > 0 && (
                <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 999, padding: '2px 8px', color: '#C9CFE6' }}>{g.items.length}</span>
              )}
            </div>
            {g.items.length === 0 ? (
              <p style={{ fontSize: 11, color: '#6C7590', margin: 0 }}>Etkinlik yok</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {g.items.slice(0, MAX_CHIPS_PER_DAY).map((it, idx) => (
                  <span key={idx} style={{ fontSize: 11, background: 'rgba(124,140,240,0.18)', color: '#DCE1FA', borderRadius: 10, padding: '4px 9px' }}>
                    {it.time_slot} · {it.activity}
                  </span>
                ))}
                {g.items.length > MAX_CHIPS_PER_DAY && (
                  <span style={{ fontSize: 11, color: '#8790A8', padding: '4px 6px' }}>+{g.items.length - MAX_CHIPS_PER_DAY} daha</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: 26, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: '#1E2A5A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>L</div>
        <span style={{ fontSize: 13, color: '#C9CFE6' }}>lexiswords.com</span>
      </div>
    </div>
  );
}

// ── 2) Sade Baskı — beyaz zemin, az mürekkep, uygulama içi renk paletiyle ──────
export function MinimalPosterTemplate({ data }: { data: ScheduleExportData }) {
  return (
    <div
      style={{
        width: A4_W, height: A4_H, position: 'relative', overflow: 'hidden',
        background: '#FFFFFF', fontFamily: FONT_STACK, color: '#1A1D23', boxSizing: 'border-box',
      }}
    >
      <div style={{ padding: '44px 44px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>L</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>Lexis</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Haftalık Çalışma Programım</h1>
        <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0' }}>
          {data.ownerName} · {data.dateLabel} · {data.activeDays} aktif gün · {data.totalItems} etkinlik
        </p>
        <div style={{ height: 1, background: '#E5E7EB', margin: '18px 0 0' }} />
      </div>

      <div style={{ padding: '18px 44px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.groups.map((g) => {
          const c = EXPORT_DAY_COLORS[g.dayIndex] ?? EXPORT_DAY_COLORS[0];
          return (
            <div key={g.dayIndex} style={{ display: 'flex', gap: 14, borderLeft: `4px solid ${c.text}`, paddingLeft: 14, minHeight: 56, boxSizing: 'border-box' }}>
              <div style={{ width: 96, flexShrink: 0, paddingTop: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.text, background: c.bg, borderRadius: 999, padding: '3px 10px', display: 'inline-block' }}>{g.day}</span>
              </div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                {g.items.length === 0 ? (
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>Etkinlik yok</span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {g.items.slice(0, MAX_CHIPS_PER_DAY).map((it, idx) => (
                      <span key={idx} style={{ fontSize: 12, color: '#374151', background: '#F3F4F6', borderRadius: 8, padding: '4px 10px' }}>
                        <b style={{ color: c.text }}>{it.time_slot}</b> · {it.activity}
                      </span>
                    ))}
                    {g.items.length > MAX_CHIPS_PER_DAY && (
                      <span style={{ fontSize: 11, color: '#9CA3AF', padding: '4px 4px' }}>+{g.items.length - MAX_CHIPS_PER_DAY} daha</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: '#9CA3AF' }}>
        lexiswords.com
      </div>
    </div>
  );
}

// ── 3) Masa Kontrol Listesi — kraft/krem zemin, kutucuklu, serbest yükseklik ──
// Not: sabit A4_H YOK — içerik ne kadar uzarsa o kadar yer kaplar; PDF'e
// gömerken sayfa boyutu bu doğal yüksekliğe göre ayarlanıyor (bkz.
// exportScheduleToPdf'teki fixedSize=false dalı) — hiçbir etkinlik kırpılmaz.
export function ChecklistTemplate({ data }: { data: ScheduleExportData }) {
  return (
    <div
      style={{
        width: A4_W, position: 'relative', background: '#FBF3E7',
        fontFamily: FONT_STACK, color: '#3B2A1A', paddingBottom: 40, boxSizing: 'border-box',
      }}
    >
      <div style={{ padding: '44px 48px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#9A5B22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBF3E7', fontWeight: 700, fontSize: 15 }}>L</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#8A6A47' }}>Lexis · Masa Kontrol Listesi</span>
        </div>
        <h1 style={{ fontSize: 27, fontWeight: 700, margin: 0 }}>Haftalık Çalışma Kontrol Listem</h1>
        <p style={{ fontSize: 12, color: '#8A6A47', margin: '6px 0 0' }}>
          {data.ownerName} · {data.dateLabel} · {data.activeDays} aktif gün · {data.totalItems} etkinlik
        </p>
        <div style={{ height: 2, background: '#E4C9A0', margin: '18px 0 0', borderRadius: 2 }} />
      </div>

      <div style={{ padding: '20px 48px 0' }}>
        {data.groups.map((g) => (
          <div key={g.dayIndex} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#7A4A16', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#B7791F', display: 'inline-block' }} />
              {g.day}
            </div>
            {g.items.length === 0 ? (
              <p style={{ fontSize: 12, color: '#B79A78', margin: '0 0 0 18px' }}>Etkinlik yok</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.55)', borderRadius: 10, padding: '8px 12px', boxSizing: 'border-box' }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid #9A5B22', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7A4A16', width: 56, flexShrink: 0 }}>{it.time_slot}</span>
                    <span style={{ fontSize: 13, color: '#3B2A1A', flex: 1 }}>{it.activity}</span>
                    <span style={{ fontSize: 11, color: '#9A7B54', flexShrink: 0 }}>{it.duration_min} dk</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: '#B79A78', marginTop: 6 }}>lexiswords.com</div>
    </div>
  );
}

export const EXPORT_TEMPLATE_SIZE = { width: A4_W, height: A4_H };

// ── PDF'e gömme ────────────────────────────────────────────────────────────
// node: DOM'a eklenmiş (offscreen olabilir), gerçek boyutunda render edilmiş
// şablon elemanı. fixedSize=true (varsayılan, poster şablonları) çıktıyı tam
// A4 sayfasına oturtur; fixedSize=false (kontrol listesi) sayfa boyutunu
// içeriğin doğal en-boy oranına göre ayarlar ki hiçbir satır kırpılmasın.
export async function exportScheduleToPdf(
  node: HTMLElement,
  opts?: { filename?: string; fixedSize?: boolean },
): Promise<void> {
  const { default: html2canvas } = await import('html2canvas-pro');
  const { default: jsPDF } = await import('jspdf');

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: null,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const fixedSize = opts?.fixedSize !== false;

  let pdf: InstanceType<typeof jsPDF>;
  if (fixedSize) {
    pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
  } else {
    const widthMm = 210; // A4 genişliği sabit — çoğu yazıcıyla hizalı kalır
    const heightMm = (canvas.height / canvas.width) * widthMm;
    pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [widthMm, heightMm] });
    pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
  }

  pdf.save(opts?.filename ?? 'lexis-calisma-programi.pdf');
}
