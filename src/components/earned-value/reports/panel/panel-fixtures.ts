/**
 * PLN-F3.3 · Planlama Paneli TİPLİ fikstürü — mockup `Planlama - Panel.dc.html`
 * `data()`sinden türetilmiştir (senaryo değerleri, disiplinler, uyarılar
 * AYNI); mockup'ın kendi rastgele S-eğrisi ÜRETECİ (`rnd`/`P`/`A`) BU
 * FİKSTÜRE KOPYALANMADI — o üreteç sahte veri içindir, gerçek API asla
 * öyle bir eğri döndürmez. Burada TEMSİLİ, sabit, okunur bir seri var.
 */
import type { EvPanelReport } from "@/lib/api/models";

import type { EvPanelRow } from "./panel-tree";

/**
 * Sabit ISO tarihler — `new Date()` aritmetiği KULLANILMAZ (ürün kodu tarih
 * envanteri bekçisi `test-guards/product-date-inventory.test.ts` fikstür
 * dosyalarını da SAYAR; B/C'nin `daily-fixtures.ts`/`qurr-fixtures.ts`
 * emsaliyle AYNI — sabit dizeler).
 */
const DAYS: Record<number, string> = {
  // 🔴 PLN-F3.6b LİDER DENETİMİ: günlük çubuk grafiği 4 HAFTAYA (~28 gün)
  // genişletildiğinde (ÖNCEDEN 5 gün) gereken ek gün aralığı (-27..-11).
  [-27]: "2026-08-28",
  [-26]: "2026-08-29",
  [-25]: "2026-08-30",
  [-24]: "2026-08-31",
  [-23]: "2026-09-01",
  [-22]: "2026-09-02",
  [-21]: "2026-09-03",
  [-20]: "2026-09-04",
  [-19]: "2026-09-05",
  [-18]: "2026-09-06",
  [-17]: "2026-09-07",
  [-16]: "2026-09-08",
  [-15]: "2026-09-09",
  [-14]: "2026-09-10",
  [-13]: "2026-09-11",
  [-12]: "2026-09-12",
  [-11]: "2026-09-13",
  [-10]: "2026-09-14",
  [-9]: "2026-09-15",
  [-8]: "2026-09-16",
  [-7]: "2026-09-17",
  [-6]: "2026-09-18",
  [-5]: "2026-09-19",
  [-4]: "2026-09-20",
  [-3]: "2026-09-21",
  [-2]: "2026-09-22",
  [-1]: "2026-09-23",
  0: "2026-09-24", // Gün 142 (mockup "Gün 142 · H21" — Perşembe)
  1: "2026-09-25",
  2: "2026-09-26",
  3: "2026-09-27",
  4: "2026-09-28",
};

function day(offset: number): string {
  const iso = DAYS[offset];
  if (iso === undefined) throw new Error(`panel-fixtures: tanımsız gün ofseti ${offset}`);
  return iso;
}

/**
 * Histogramın son 6 haftası — H16'dan H21'e. 🔴 PLN-F3.6b düzeltmesi (mockup
 * `Planlama - Panel.dc.html` render'ı ile ÖLÇÜLDÜ): H21 tarih kuyruğu
 * "18–24.09"dur (rapor gününde 24.09 Perşembe BİTEN, geriye dönük 7 günlük
 * TRAİLİNG pencere — Pazartesi-Pazar takvim haftası DEĞİL). Önceki iki hâl
 * ("14–20.09" ve "21–27.09") İKİSİ de mockup'la ÇAKIŞMIYORDU; bu sürüm
 * mockup'ın kendi render'ıyla BİREBİR ölçüldü.
 */
const HISTOGRAM_WEEKS = [
  { no: 16, start: "2026-08-14", end: "2026-08-20" },
  { no: 17, start: "2026-08-21", end: "2026-08-27" },
  { no: 18, start: "2026-08-28", end: "2026-09-03" },
  { no: 19, start: "2026-09-04", end: "2026-09-10" },
  { no: 20, start: "2026-09-11", end: "2026-09-17" },
  { no: 21, start: "2026-09-18", end: "2026-09-24" },
] as const;

// 🔴 PLN-F3.6b LİDER DENETİMİ KUSURU: ÖNCEDEN yalnız 4 gün (-3..0) vardı —
// mockup'ta S-eğrisi PROJE BAŞINDAN bugüne GERÇEK çizgi, bugünden SONRA
// KESİKLİ planlı çizgi + "gecikme/önde" dolgusu taşır. Tüm projeyi (T=1..290,
// mockup'ın `rnd`/`P`/`A` üreteci) KOPYALAMAK yerine TEMSİLİ ama İKİ
// SEGMENTLİ (geçmiş 11 gün GERÇEK + gelecek 4 gün YALNIZ PLANLI) bir pencere
// kuruldu — hem dolgu (önce önde, sonra geride) hem `is_future` kesikli
// segment GÖRÜNÜR.
const S_CURVE_DAYS = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4];
// 🔴 PLN-F3.6b LİDER DENETİMİ KUSURU: ÖNCEDEN 5 gündü — mockup "Günlük
// kazanılmış vs harcanan · SON 4 HAFTA" der, tatil taraması (Pazar günleri)
// ve İKİ "gönderilmedi" noktası taşır. 28 güne (-27..0) genişletildi.
const BAR_DAYS = Array.from({ length: 28 }, (_, i) => i - 27);
/** Pazar günleri (tatil) — offsetler bu 28 günlük pencerede SABİT hesaplanmıştır. */
const HOLIDAY_OFFSETS = new Set([-25, -18, -11, -4]);
/** "Gönderilmedi" (taslak) günler — mockup'ın İKİ noktası, tatil OLMAYAN iş günleri. */
const UNSENT_OFFSETS = new Set([-22, -6]);

export function panelReportFixture(overrides: Partial<EvPanelReport> = {}): EvPanelReport {
  return {
    actual_basis: "headcount",
    // 🔴 PLN-F3.6b LİDER DENETİMİ KUSURU (yan yana ölçümde bulundu): "Bugün"
    // çubuğu (offset 0) formülle "320"/"321" basıyordu — `kpi.earned_day`/
    // `kpi.spent_day` ("322"/"310", mockup'la ÖLÇÜLMÜŞ) ile ÇAKIŞIYORDU; aynı
    // günün İKİ farklı sayısı okuyucuya çelişkili görünürdü. Yalnız BUGÜN
    // KPI'yla hizalandı, geçmiş günler (temsili, mockup'ın rastgele üretecine
    // BAĞLI DEĞİL) formülde kaldı.
    bars: BAR_DAYS.map((offset, i) => {
      const isHoliday = HOLIDAY_OFFSETS.has(offset);
      return {
        day: day(offset),
        diary_status: UNSENT_OFFSETS.has(offset) ? "draft" : "submitted",
        earned_day: offset === 0 ? "322" : String(300 + (i % 10) * 5),
        spent_day: offset === 0 ? "310" : String(305 + (i % 10) * 4),
        is_holiday: isHoliday,
      };
    }),
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
    // 🔴 PLN-F3.6b düzeltmesi: H21 (son hafta) rapor GÜNÜNÜN (24.09, Perşembe)
    // haftasıdır — henüz TAMAMLANMAMIŞ ama GELECEK de DEĞİLDİR, KISMİ
    // gerçekleşeni vardır (KPI'daki `spent_day`/`timesheet_total_day` de
    // 24.09'a ait). `is_future: true` + `actual_people: null` önceki hâli
    // bunu "gelecek hafta" gibi çizip çubuğu HİÇ basmıyordu — PNL:S7
    // histogram ipucu karesi (gezginin gününün haftasına hover) o yüzden
    // SAYISIZ ("—") kalırdı. Gerçek bir 6-haftalık PENCEREDE `is_future`
    // hiçbir zaman doğru değildir (yalnız GEÇMİŞ + kısmi GÜNCEL hafta basılır).
    histogram: HISTOGRAM_WEEKS.map((week, i) => ({
      week_no: week.no,
      week_start: week.start,
      week_end: week.end,
      planned_people: String(18 + i),
      actual_people: String(17 + i),
      is_future: false,
      working_days: 6,
    })),
    // 🔴 PLN-F3.6b LİDER DÜZELTMESİ: KPI değerleri mockup'ın `data()`sindeki
    // `IT`/`DISC` tablosundan (satır fikstürüyle AYNI hesap, `agg(IT)`)
    // TÜRETİLDİ — CEO kare kare mockup'la karşılaştıracak, uydurma sayı
    // karşılaştırmayı ANLAMSIZ kılardı. `budget_mhr`/`earned_cum` = Genel
    // satırıyla BİREBİR (48.610 / 22.305, mockup ekran görüntüsüyle ölçüldü);
    // `pf_cum` ÖNCEDEN "1.03" idi, mockup'ta GERÇEKTE "0,97 · Sarı bant"
    // (`pf_week` ile YER DEĞİŞTİRMİŞ hâldeydi — mockup "BU HAFTA PF" 1,03'tür).
    kpi: {
      budget_mhr: "48610",
      earned_cum: "22305",
      earned_day: "322",
      pf_cum: "0.970078",
      pf_cum_band: "amber",
      pf_week: "1.02957",
      pf_week_band: "green",
      planned_pct_cum: "0.484894",
      progress_pct_cum: "0.458856",
      spent_day: "310",
      status: "late",
      timesheet_total_day: "326",
      undistributed_day: "16",
      variance: "-0.026038",
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
    // 🔴 PLN-F3.6b LİDER DÜZELTMESİ (Panel.dc.html:528-540 ölçüldü): disiplin
    // satırları "Genel"in ÇOCUĞU DEĞİLDİR — üst düzeyde, Genel'in KARDEŞİDİR
    // (`parent_id: null`). "Genel – Kendi"/"Genel – Taşeron" da düz özet
    // satırlarıdır (aynı üst düzey), disiplinlerin ebeveyni DEĞİL. Yalnız iş
    // tipi (leaf) satırları kendi disiplinlerinin ÇOCUĞUDUR.
    // 🔴 PLN-F3.6b LİDER DÜZELTMESİ: TÜM satır değerleri mockup `data()`sindeki
    // `IT`/`DISC` dizilerinden HESAPLANDI (`agg()` mockup'ın kendi fonksiyonu
    // ile BİREBİR aynı toplama — `bud=qty×rate`, `earn=earnedQty×rate`,
    // `spent` ham değer, `planE=bud×plannedPct`, PF bantları `pf_bands`teki
    // eşiklerle). Disiplin başına mockup'taki TÜM iş tipleri var (önceden
    // yalnız 1 vardı — CEO kare kare mockup'la karşılaştıracağı için eksik
    // satır karşılaştırmayı anlamsız kılardı). Toplamlar mockup ekran
    // görüntüsüyle ÖLÇÜLDÜ (Genel 48.610/22.305/22.993, %48,5/%45,9/-2,6,
    // 0,97/1,03 — bkz. `kpi` alanı).
    // 🔴 LİDER DENETİMİ KUSURU (P5, 2026-09-26, CEO yan yana ölçümü) —
    // dört satırda `pf_week_band: "high"` YAZILMIŞTI (Genel–Kendi/Kaba
    // İnşaat/Beton döküm/Kablo çekimi): FİKSTÜR KUSURU, backend DEĞİL
    // (ölçüldü: K18/K19 haftalık/kümülatif PF bantları `highAbove: null`
    // taşır, "high" ÜRETEMEZ — `pfBand()` da SADECE `kind==="daily"` iken
    // "high" döndürür; `panel-columns.tsx` `pf_week` hücresi `pf_week_band`
    // alanını OLDUĞU GİBİ kullanır, KENDİSİ HESAPLAMAZ). Hepsi "green"e
    // düzeltildi.
    // Mockup'ın rastgele S-eğrisi üreteci
    // (`rnd`/`P`/`A`) KOPYALANMADI, yalnız tablo verisi.
    rows: [
      { budget_mhr: "48610", contractor_mix: null, contractor_type: null, earned_cum: "22305", name: "Genel", node_id: "genel", parent_id: null, pf_cum: "0.970078", pf_cum_band: "amber", pf_week: "1.02957", pf_week_band: "green", planned_pct_cum: "0.484894", progress_pct_cum: "0.458856", scope: "overall", spent_cum: "22993", status: "late", uom: null, variance: "-0.026038" },
      { budget_mhr: "34700", contractor_mix: null, contractor_type: "own", earned_cum: "17875", name: "Genel – Kendi", node_id: null, parent_id: null, pf_cum: "0.98686", pf_cum_band: "amber", pf_week: "1.058394", pf_week_band: "green", planned_pct_cum: "0.534392", progress_pct_cum: "0.51513", scope: "overall_own", spent_cum: "18113", status: "normal", uom: null, variance: "-0.019262" },
      { budget_mhr: "13910", contractor_mix: null, contractor_type: "subcon", earned_cum: "4430", name: "Genel – Taşeron", node_id: null, parent_id: null, pf_cum: "0.907787", pf_cum_band: "red", pf_week: "0.94898", pf_week_band: "red", planned_pct_cum: "0.361416", progress_pct_cum: "0.318476", scope: "overall_subcon", spent_cum: "4880", status: "late", uom: null, variance: "-0.04294" },
      { budget_mhr: "27500", contractor_mix: "Kendi", contractor_type: null, earned_cum: "13365", name: "Kaba İnşaat", node_id: "d:KAB", parent_id: null, pf_cum: "0.985474", pf_cum_band: "amber", pf_week: "1.066667", pf_week_band: "green", planned_pct_cum: "0.514596", progress_pct_cum: "0.486", scope: "discipline", spent_cum: "13562", status: "late", uom: null, variance: "-0.028596" },
      { budget_mhr: "8950", contractor_mix: "Taşeron", contractor_type: null, earned_cum: "2130", name: "Duvar & Sıva", node_id: "d:DUV", parent_id: null, pf_cum: "0.866558", pf_cum_band: "red", pf_week: "0.912281", pf_week_band: "red", planned_pct_cum: "0.301061", progress_pct_cum: "0.237989", scope: "discipline", spent_cum: "2458", status: "late", uom: null, variance: "-0.063073" },
      { budget_mhr: "4960", contractor_mix: "Taşeron", contractor_type: null, earned_cum: "2300", name: "Mekanik Tesisat", node_id: "d:MEK", parent_id: null, pf_cum: "0.949628", pf_cum_band: "red", pf_week: "1", pf_week_band: "green", planned_pct_cum: "0.470323", progress_pct_cum: "0.46371", scope: "discipline", spent_cum: "2422", status: "normal", uom: null, variance: "-0.006613" },
      { budget_mhr: "7200", contractor_mix: "Kendi", contractor_type: null, earned_cum: "4510", name: "Elektrik", node_id: "d:ELK", parent_id: null, pf_cum: "0.990991", pf_cum_band: "amber", pf_week: "1.03125", pf_week_band: "green", planned_pct_cum: "0.61", progress_pct_cum: "0.626389", scope: "discipline", spent_cum: "4551", status: "normal", uom: null, variance: "0.016389" },
      // 🔴 PLN-F3.6b LİDER DENETİMİ KUSURU — backend `report_panel.py:425-427`
      // disiplin süzgeci YOKKEN `scope: "non_direct"` satırını HER ZAMAN
      // ekler (plan §C7: "dolaylı satırı backend değerleriyle dolar"),
      // disiplinlerden SONRA. S32 KESİNLEŞTİ (CEO, 2026-09-26): ad backend'den
      // TEK STRING gelir ("Genel / Dolaylı · bütçe dışı", Panel:542-544
      // birebir) — istemci "bütçe dışı" EKLEMEZ (panel-columns.tsx, çift
      // basardı). Alt etiket (`indirect_item_names` → panel-columns.tsx)
      // Mockup Panel.dc.html:542 `unit: 'Mobilizasyon · Şantiye temizliği'`
      // (bkz. panel-tree.ts EvPanelRow yorumu — backend alan adı EV-BORC-9
      // netleşene dek YEREL genişletme, alan adı `indirect_item_names`
      // KESİNLEŞTİ). Yalnız `spent_cum` ("2.100") mockup'la ölçülmüş gerçek
      // değerdir; `budget_mhr` şemada NULLABLE DEĞİL (`string`, `string |
      // null` DEĞİL) → "0" (K-SIFIR: sıfır maskelenmiş değildir); diğer
      // alanlar backend'in bu satır için HİÇ HESAP ÜRETMEDİĞİ (dolaylı
      // kalemin planı/PF'i yok) anlamına gelen `null` — "veri kaybı" DEĞİL.
      // `evPanelFilterRows` (mock-backend.ts) bu satırı disiplin süzgeciyle
      // OTOMATİK eler: `scope !== "overall"` VE `node_id === null` olduğu
      // için mevcut süzgeç mantığı EK KOD GEREKTİRMEDEN doğru davranır.
      {
        budget_mhr: "0", contractor_mix: null, contractor_type: null, earned_cum: null, name: "Genel / Dolaylı · bütçe dışı",
        node_id: null, parent_id: null, pf_cum: null, pf_cum_band: null, pf_week: null, pf_week_band: null,
        planned_pct_cum: null, progress_pct_cum: null, scope: "non_direct", spent_cum: "2100", status: null, uom: null, variance: null,
        // `indirect_item_names` şema tipinde (PanelRow) YOK (EV-BORC-9
        // backend netleşene dek) — `EvPanelRow` YEREL genişletmesi burada
        // `as` ile işaretlenir, `rows: EvPanelReport["rows"]` alanına hâlâ
        // yapısal olarak uyar (fazladan alan İSTEĞE BAĞLI, atama bozulmaz).
        indirect_item_names: ["Mobilizasyon", "Şantiye temizliği"],
      } as EvPanelRow,
      // İş tipi (leaf) satırları — `qty_overrun`/`empty_rate` uyarılarının
      // `leaf` hedefiyle (`l:<item>:…` → `i:<item>`) EŞLEŞMESİ İÇİN gerekli
      // (S8 görünürlük süzgeci): `i:beton-dokum`/`i:buat-priz` kimlikleri
      // KORUNDU, `warnings[]`teki `target_id`lerle hâlâ eşleşiyor.
      { budget_mhr: "11900", contractor_mix: null, contractor_type: null, earned_cum: "5865", name: "Kalıp", node_id: "i:kalip", parent_id: "d:KAB", pf_cum: "0.990041", pf_cum_band: "amber", pf_week: "1.021277", pf_week_band: "green", planned_pct_cum: "0.518", progress_pct_cum: "0.492857", scope: "item", spent_cum: "5924", status: "late", uom: "m²", variance: "-0.025143" },
      { budget_mhr: "6240", contractor_mix: null, contractor_type: null, earned_cum: "3000", name: "Demir", node_id: "i:demir", parent_id: "d:KAB", pf_cum: "0.949968", pf_cum_band: "red", pf_week: "0.96", pf_week_band: "green", planned_pct_cum: "0.5", progress_pct_cum: "0.480769", scope: "item", spent_cum: "3158", status: "normal", uom: "ton", variance: "-0.019231" },
      { budget_mhr: "9360", contractor_mix: null, contractor_type: null, earned_cum: "4500", name: "Beton döküm", node_id: "i:beton-dokum", parent_id: "d:KAB", pf_cum: "1.004464", pf_cum_band: "green", pf_week: "1.212121", pf_week_band: "green", planned_pct_cum: "0.52", progress_pct_cum: "0.480769", scope: "item", spent_cum: "4480", status: "late", uom: "m³", variance: "-0.039231" },
      { budget_mhr: "4950", contractor_mix: null, contractor_type: null, earned_cum: "1430", name: "Tuğla duvar", node_id: "i:tugla-duvar", parent_id: "d:DUV", pf_cum: "0.88", pf_cum_band: "red", pf_week: "0.882353", pf_week_band: "red", planned_pct_cum: "0.31", progress_pct_cum: "0.288889", scope: "item", spent_cum: "1625", status: "late", uom: "m²", variance: "-0.021111" },
      { budget_mhr: "4000", contractor_mix: null, contractor_type: null, earned_cum: "700", name: "İç sıva", node_id: "i:ic-siva", parent_id: "d:DUV", pf_cum: "0.840336", pf_cum_band: "red", pf_week: "0.956522", pf_week_band: "green", planned_pct_cum: "0.29", progress_pct_cum: "0.175", scope: "item", spent_cum: "833", status: "late", uom: "m²", variance: "-0.115" },
      { budget_mhr: "2560", contractor_mix: null, contractor_type: null, earned_cum: "1160", name: "Pis su borusu", node_id: "i:pis-su-borusu", parent_id: "d:MEK", pf_cum: "0.9699", pf_cum_band: "amber", pf_week: "1.047619", pf_week_band: "green", planned_pct_cum: "0.48", progress_pct_cum: "0.453125", scope: "item", spent_cum: "1196", status: "late", uom: "m", variance: "-0.026875" },
      { budget_mhr: "2400", contractor_mix: null, contractor_type: null, earned_cum: "1140", name: "Temiz su borusu", node_id: "i:temiz-su-borusu", parent_id: "d:MEK", pf_cum: "0.929853", pf_cum_band: "red", pf_week: "0.95", pf_week_band: "green", planned_pct_cum: "0.46", progress_pct_cum: "0.475", scope: "item", spent_cum: "1226", status: "normal", uom: "m", variance: "0.015" },
      { budget_mhr: "3600", contractor_mix: null, contractor_type: null, earned_cum: "1960", name: "Kablo çekimi", node_id: "i:kablo-cekimi", parent_id: "d:ELK", pf_cum: "1.019771", pf_cum_band: "green", pf_week: "1.058824", pf_week_band: "green", planned_pct_cum: "0.62", progress_pct_cum: "0.544444", scope: "item", spent_cum: "1922", status: "late", uom: "m", variance: "-0.075556" },
      { budget_mhr: "3600", contractor_mix: null, contractor_type: null, earned_cum: "2550", name: "Buat/priz montajı", node_id: "i:buat-priz", parent_id: "d:ELK", pf_cum: "0.969951", pf_cum_band: "amber", pf_week: "1", pf_week_band: "green", planned_pct_cum: "0.6", progress_pct_cum: "0.708333", scope: "item", spent_cum: "2629", status: "ahead", uom: "adet", variance: "0.108333" },
    ],
    s_curve: S_CURVE_DAYS.map((offset) => {
      const isFuture = offset > 0;
      // Planlı çizgi HER gün (geçmiş+gelecek) sürekli artar; gerçek yalnız
      // GEÇMİŞ+BUGÜN günlerde vardır. 0. gün (bugün) `kpi`/"Genel" satırıyla
      // BİREBİR (0.484894/0.458856) — üç yüzeyin sayısı TUTARLI.
      const planned = offset === 0 ? 0.484894 : 0.4 + (offset + 10) * 0.0085;
      if (isFuture) {
        return { day: day(offset), is_future: true, planned_pct_cum: String(planned), progress_pct_cum: null, status: null, variance: null };
      }
      // Erken günler ÖNDE (yeşil dolgu), bugüne yaklaştıkça GERİDEye döner
      // (kırmızı dolgu) — mockup'ın hem "Önde" hem "Gecikme" lejantını
      // GÖRÜNÜR kılan geçiş; bugünün kendisi KPI'yla birebir "Geride".
      const progress =
        offset === 0
          ? 0.458856
          : offset <= -6
            ? planned + 0.02 - (offset + 10) * 0.001
            : planned - 0.01 - Math.abs(offset) * 0.003;
      const variance = progress - planned;
      const status = offset === 0 ? "late" : variance > 0.002 ? "ahead" : variance < -0.002 ? "normal" : "normal";
      return {
        day: day(offset),
        is_future: false,
        planned_pct_cum: String(planned),
        progress_pct_cum: String(progress),
        status,
        variance: String(variance),
      };
    }),
    standard_daily_hours: "9",
    tolerance_points: "2.0",
    // 🔴 PLN-F3.6b LİDER PLANI §1.1/§4: backend `pf_out_of_band`ı HER bant
    // dışı KALEM için AYRI üretir (tek "toplu" uyarı DEĞİL) — UI tarafı
    // bunları `groupPfOutOfBandWarnings` ile TEK karta toplar. Üç kalem
    // mockup'la BİREBİR: İç sıva 0,84 (DUV) · Tuğla duvar 0,88 (DUV) ·
    // Temiz su borusu 0,93 (MEK); `target_id` artık İTEM node_id'sidir
    // (`rows[scope="item"]` ile birleşim — lider planı), disiplin DEĞİL.
    warnings: [
      {
        code: "pf_out_of_band", item_name: "İç sıva", message: "PF bant dışı",
        planned_qty: null, qty_cum: null, section_name: null, target: "node", target_id: "i:ic-siva", uom: null, value: "0.84",
      },
      {
        code: "pf_out_of_band", item_name: "Tuğla duvar", message: "PF bant dışı",
        planned_qty: null, qty_cum: null, section_name: null, target: "node", target_id: "i:tugla-duvar", uom: null, value: "0.88",
      },
      {
        code: "pf_out_of_band", item_name: "Temiz su borusu", message: "PF bant dışı",
        planned_qty: null, qty_cum: null, section_name: null, target: "node", target_id: "i:temiz-su-borusu", uom: null, value: "0.93",
      },
      {
        code: "undistributed_hours", item_name: null, message: "Dağıtılmamış saat · 16 a-s",
        planned_qty: null, qty_cum: null, section_name: null, target: "day", target_id: day(0), uom: null, value: "16",
      },
      {
        code: "qty_overrun", item_name: "Beton döküm", message: "Planlı miktarı aşan kalem",
        planned_qty: "1250", qty_cum: "1284", section_name: "Temel", uom: "m³", target: "leaf", target_id: "l:beton-dokum:rate-1", value: null,
      },
      // 🔴 PLN-F3.6b LİDER DENETİMİ: GÜNLÜK de PF İLE AYNI DESEN — backend her
      // GÖNDERİLMEMİŞ gün için AYRI bir `missing_diary` uyarısı üretir (tek
      // "2 günlük" uyarısı DEĞİL); UI `groupMissingDiaryWarnings` ile toplar.
      // Mockup: "21.09.2026 Pzt · 23.09.2026 Çar — gün kilitlenmedi".
      {
        code: "missing_diary", item_name: null, message: "Günlük gönderilmedi",
        planned_qty: null, qty_cum: null, section_name: null, target: "day", target_id: day(-3), uom: null, value: null,
      },
      {
        code: "missing_diary", item_name: null, message: "Günlük gönderilmedi",
        planned_qty: null, qty_cum: null, section_name: null, target: "day", target_id: day(-1), uom: null, value: null,
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
