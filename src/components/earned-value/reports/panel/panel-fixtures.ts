/**
 * PLN-F3.3 · Planlama Paneli TİPLİ fikstürü — mockup `Planlama - Panel.dc.html`
 * `data()`sinden türetilmiştir (senaryo değerleri, disiplinler, uyarılar
 * AYNI); mockup'ın kendi rastgele S-eğrisi ÜRETECİ (`rnd`/`P`/`A`) BU
 * FİKSTÜRE KOPYALANMADI — o üreteç sahte veri içindir, gerçek API asla
 * öyle bir eğri döndürmez. Burada TEMSİLİ, sabit, okunur bir seri var.
 */
import type { EvPanelReport } from "@/lib/api/models";

/**
 * Sabit ISO tarihler — `new Date()` aritmetiği KULLANILMAZ (ürün kodu tarih
 * envanteri bekçisi `test-guards/product-date-inventory.test.ts` fikstür
 * dosyalarını da SAYAR; B/C'nin `daily-fixtures.ts`/`qurr-fixtures.ts`
 * emsaliyle AYNI — sabit dizeler).
 */
const DAYS: Record<number, string> = {
  [-4]: "2026-09-20",
  [-3]: "2026-09-21",
  [-2]: "2026-09-22",
  [-1]: "2026-09-23",
  0: "2026-09-24", // Gün 142 (mockup "Gün 142 · H21" — Perşembe)
  3: "2026-09-27",
};

function day(offset: number): string {
  const iso = DAYS[offset];
  if (iso === undefined) throw new Error(`panel-fixtures: tanımsız gün ofseti ${offset}`);
  return iso;
}

/** Histogramın son 6 haftası — H16'dan H21'e (mockup H21 "18–24.09"). */
const HISTOGRAM_WEEKS = [
  { no: 16, start: "2026-08-10", end: "2026-08-16" },
  { no: 17, start: "2026-08-17", end: "2026-08-23" },
  { no: 18, start: "2026-08-24", end: "2026-08-30" },
  { no: 19, start: "2026-08-31", end: "2026-09-06" },
  { no: 20, start: "2026-09-07", end: "2026-09-13" },
  { no: 21, start: "2026-09-14", end: "2026-09-20" },
] as const;

const S_CURVE_DAYS = [-3, -2, -1, 0];
const BAR_DAYS = [-4, -3, -2, -1, 0];

export function panelReportFixture(overrides: Partial<EvPanelReport> = {}): EvPanelReport {
  return {
    actual_basis: "headcount",
    bars: BAR_DAYS.map((offset, i) => ({
      day: day(offset),
      diary_status: offset === -2 ? "draft" : "submitted",
      earned_day: String(300 + i * 5),
      spent_day: String(305 + i * 4),
      is_holiday: false,
    })),
    calendar_end: "2026-12-15",
    calendar_start: "2026-05-06",
    contractor_type: null,
    day: day(0),
    day_no: 142,
    discipline_id: null,
    disciplines: [
      { id: "d:KAB", name: "Kaba İnşaat", contractor_mix: "Kendi" },
      { id: "d:DUV", name: "Duvar & Sıva", contractor_mix: "Taşeron" },
      { id: "d:MEK", name: "Mekanik Tesisat", contractor_mix: "Taşeron" },
      { id: "d:ELK", name: "Elektrik", contractor_mix: "Kendi" },
    ],
    has_baseline: true,
    has_field_data: true,
    histogram: HISTOGRAM_WEEKS.map((week, i) => ({
      week_no: week.no,
      week_start: week.start,
      week_end: week.end,
      planned_people: String(18 + i),
      actual_people: i === 5 ? null : String(17 + i),
      is_future: i === 5,
      working_days: 6,
    })),
    kpi: {
      budget_mhr: "16400",
      earned_cum: "7524",
      earned_day: "322",
      pf_cum: "1.03",
      pf_cum_band: "green",
      pf_week: "1.02",
      pf_week_band: "green",
      planned_pct_cum: "0.485",
      progress_pct_cum: "0.459",
      spent_day: "310",
      status: "late",
      timesheet_total_day: "326",
      undistributed_day: "16",
      variance: "-0.026",
    },
    pf_bands: {
      daily: { red_below: "0.95", green_from: "0.95", high_above: "1.05" },
      cumulative: { red_below: "0.95", green_from: "1.00", high_above: null },
    },
    pf_trend: S_CURVE_DAYS.map((offset, i) => ({
      day: day(offset),
      pf_day: String(0.97 + i * 0.02),
      pf_rolling: String(1.0 + i * 0.005),
    })),
    range: "4w",
    revision: { id: "rev-1", number: 1, name: null, frozen_at: "2026-07-02T00:00:00Z" },
    rows: [
      {
        budget_mhr: "16400", contractor_mix: null, contractor_type: null, earned_cum: "7524", name: "Genel",
        node_id: "genel", parent_id: null, pf_cum: "1.03", pf_cum_band: "green", pf_week: "1.02", pf_week_band: "green",
        planned_pct_cum: "0.485", progress_pct_cum: "0.459", scope: "overall", spent_cum: "7300", status: "late", uom: null, variance: "-0.026",
      },
      {
        budget_mhr: "5865", contractor_mix: null, contractor_type: null, earned_cum: "3158", name: "Kaba İnşaat",
        node_id: "d:KAB", parent_id: "genel", pf_cum: "1.00", pf_cum_band: "green", pf_week: "0.98", pf_week_band: "green",
        planned_pct_cum: "0.500", progress_pct_cum: "0.538", scope: "discipline", spent_cum: "3158", status: "ahead", uom: null, variance: "0.038",
      },
      {
        budget_mhr: "4900", contractor_mix: null, contractor_type: null, earned_cum: "1625", name: "Duvar & Sıva",
        node_id: "d:DUV", parent_id: "genel", pf_cum: "0.88", pf_cum_band: "red", pf_week: "0.86", pf_week_band: "red",
        planned_pct_cum: "0.350", progress_pct_cum: "0.332", scope: "discipline", spent_cum: "1846", status: "normal", uom: null, variance: "-0.018",
      },
      {
        budget_mhr: "3350", contractor_mix: null, contractor_type: null, earned_cum: "1226", name: "Mekanik Tesisat",
        node_id: "d:MEK", parent_id: "genel", pf_cum: "0.93", pf_cum_band: "amber", pf_week: "0.95", pf_week_band: "green",
        planned_pct_cum: "0.370", progress_pct_cum: "0.366", scope: "discipline", spent_cum: "1318", status: "normal", uom: null, variance: "-0.004",
      },
      {
        budget_mhr: "1985", contractor_mix: null, contractor_type: null, earned_cum: "1517", name: "Elektrik",
        node_id: "d:ELK", parent_id: "genel", pf_cum: "1.05", pf_cum_band: "high", pf_week: "1.04", pf_week_band: "high",
        planned_pct_cum: "0.700", progress_pct_cum: "0.764", scope: "discipline", spent_cum: "1445", status: "ahead", uom: null, variance: "0.064",
      },
      // İş tipi (leaf) satırları — `qty_overrun`/`empty_rate` uyarılarının
      // `leaf` hedefiyle (`l:<item>:…` → `i:<item>`) EŞLEŞMESİ İÇİN gerekli
      // (S8 görünürlük süzgeci): mockup'ın "Beton döküm" ve "Buat/priz montajı".
      {
        budget_mhr: "2500", contractor_mix: null, contractor_type: null, earned_cum: "2330", name: "Beton döküm",
        node_id: "i:beton-dokum", parent_id: "d:KAB", pf_cum: "0.91", pf_cum_band: "amber", pf_week: "0.90", pf_week_band: "amber",
        planned_pct_cum: "0.520", progress_pct_cum: "0.495", scope: "item", spent_cum: "2560", status: "normal", uom: "m³", variance: "-0.025",
      },
      {
        budget_mhr: "1700", contractor_mix: null, contractor_type: null, earned_cum: null, name: "Buat/priz montajı",
        node_id: "i:buat-priz", parent_id: "d:ELK", pf_cum: null, pf_cum_band: null, pf_week: null, pf_week_band: null,
        planned_pct_cum: null, progress_pct_cum: null, scope: "item", spent_cum: null, status: null, uom: "adet", variance: null,
      },
    ],
    s_curve: S_CURVE_DAYS.map((offset, i) => ({
      day: day(offset),
      is_future: false,
      planned_pct_cum: String((45.5 + i * 1) / 100),
      progress_pct_cum: String((43.0 + i * 0.97) / 100),
      status: i === S_CURVE_DAYS.length - 1 ? "late" : "normal",
      variance: i === S_CURVE_DAYS.length - 1 ? "-0.026" : "-0.005",
    })),
    standard_daily_hours: "9",
    tolerance_points: "2.0",
    warnings: [
      {
        code: "pf_out_of_band", item_name: "İç sıva", message: "3 kalem PF bant dışı (< 0,95)",
        planned_qty: null, qty_cum: null, section_name: null, target: "node", target_id: "d:DUV", uom: null, value: "0.84",
      },
      {
        code: "undistributed_hours", item_name: null, message: "Dağıtılmamış saat · 16 a-s",
        planned_qty: null, qty_cum: null, section_name: null, target: "day", target_id: day(0), uom: null, value: "16",
      },
      {
        code: "qty_overrun", item_name: "Beton döküm", message: "Planlı miktarı aşan kalem",
        planned_qty: "1250", qty_cum: "1284", section_name: "Temel", uom: "m³", target: "leaf", target_id: "l:beton-dokum:rate-1", value: null,
      },
      {
        code: "missing_diary", item_name: null, message: "2 günlük gönderilmedi",
        planned_qty: null, qty_cum: null, section_name: null, target: "day", target_id: day(-3), uom: null, value: null,
      },
      {
        code: "empty_rate", item_name: "Buat/priz montajı", message: "Birim oranı boş kalem",
        planned_qty: null, qty_cum: null, section_name: "Çatı", uom: null, target: "leaf", target_id: "l:buat-priz:rate-1", value: null,
      },
    ],
    week_end: day(3),
    week_no: 21,
    week_start: day(-3),
    ...overrides,
  };
}
