"use client";

import type { TreeTableColumn } from "@/components/earned-value/common/tree-table/TreeTable";
import { PfBandCell } from "@/components/earned-value/reports/kit/PfBandCell";
import { EMPTY_CELL, formatDecimal, formatQuantity } from "@/lib/format";
import { compareDecimalStrings, formatPercent01, formatPf, formatUnitRate } from "@/lib/earned-value";
import type { EvQtyTreeRow } from "@/lib/api/models";

/**
 * PLN-F3.4 · Miktar tablosunun 11 veri kolonu — GİR:234-269 başlıkları,
 * 248-261 satır çizimi. `TreeTable variant="progress"` + `collapsible=false`
 * (ağaç mockup'ta HER ZAMAN açıktır — chevron yok). L1/L2 başlık satırları
 * (`uom === null`) yalnız ad + PF/harcanan/ilerleme basar (GİR:240-245); L3
 * yapraklar TÜM kolonları doldurur (GİR:248-261).
 */
/** `DailyPrintView` de kullanır — "ekran ≡ baskı" (aynı biçimleyici, ayrı kopya YOK). */
export function isHeaderRow(row: EvQtyTreeRow): boolean {
  return row.uom === null;
}

/**
 * Lider denetimi (6. tur, madde 1) — "Toplam doğrudan" satırı GİR:263-268
 * mockup'ta TABLONUN KENDİ grid'inde (`grid-column:span 9` ad hücresi, sonra
 * PF/harcanan/ilerleme kendi kolonlarında) basılır; önceki `<div flex>`
 * sarmalayıcı kolonlarla HİZALANMIYORDU. Bu satır artık `TreeTable`nin
 * KENDİ satırı (senteze `node_id` ile işaretlenir) — "ad" kolonu 9 kolonu
 * kaplar (`colSpan`), TreeTable örttüğü sonraki 8 kolonu OTOMATİK basmaz.
 */
export const TOTAL_ROW_ID = "__toplam_dogrudan__";

export function isTotalRow(row: EvQtyTreeRow): boolean {
  return row.node_id === TOTAL_ROW_ID;
}

/** `DailyPrintView` de kullanır — S18 karışıkta çip yok kuralı TEK yerde. */
export function contractorChip(type: EvQtyTreeRow["contractor_type"]): string | null {
  if (type === "own") return "Kendi";
  if (type === "subcon") return "Taşeron";
  return null; // S18: karışıkta çip yok
}

export const rate = (v: string | null) => (v === null ? EMPTY_CELL : formatUnitRate(v));
export const qty = (v: string | null) => (v === null ? EMPTY_CELL : formatQuantity(v));
export const pct = (v: string | null) => (v === null ? EMPTY_CELL : formatPercent01(v));
/**
 * CEO ölçümü (7. tur, madde G1) — a-s (adam-saat) TEK biçim kuralı: tam sayı
 * (mockup `nf(a.ds)`/`nf(a.de)` varsayılan 0 ondalık). KPI'nin `wholeHours`ı
 * BURAYA taşındı — miktar tablosu (leaf `spent_day`) ve baskı görünümü
 * AYNI fonksiyonu paylaşır (ekran ≡ baskı, ayrı kopya YOK).
 */
export const wholeHours = (v: string | null) => (v === null ? EMPTY_CELL : formatDecimal(v, 0));

/**
 * L1/L2 başlık satırlarında (`isHeaderRow`) miktar hücreleri BOŞTUR
 * ("—" DEĞİL, GİR:240-245 `<div></div>` boş) — yalnız yapraklar (L3) dolar.
 * Aynı sarmalayıcı hem `rate`/`qty` hem `EMPTY_CELL` gösteren yaprak
 * hücreleri için kullanılır: başlıkta hiçbir şey, yaprakta biçimlenmiş değer.
 */
function leafCell(row: EvQtyTreeRow, formatted: string): string {
  return isHeaderRow(row) ? "" : formatted;
}

/**
 * GİR:489 `rd>rate?red:...` — gerçek oran PLANLI oranın ÜSTÜNDEYSE kırmızı yazı.
 * Lider denetimi (8. tur) — ondalık kanonu: `Number(x) > Number(y)` YERİNE
 * `compareDecimalStrings` (QURR `isUnitRateOver` emsali, aynı gerekçeyle).
 */
export function rateExceedsPlanned(actual: string | null, planned: string | null): boolean {
  if (actual === null || planned === null) return false;
  return compareDecimalStrings(actual, planned) > 0;
}

export const QUANTITY_COLUMNS: readonly TreeTableColumn<EvQtyTreeRow>[] = [
  {
    key: "name",
    header: "İş tipi",
    tree: true,
    // Lider denetimi (6. tur, madde 4) — GİR:240 mockup `minmax(170px,1.6fr)`:
    // ad+çip TEK SATIRDA sığmalı (taşarsa yatay kaydırma, KABUL edilen desen).
    className: "ev-qty-col-name",
    colSpan: (node) => (isTotalRow(node.data) ? 9 : 1),
    render: (node) => (
      <span className={isTotalRow(node.data) ? "ev-qty-name ev-qty-name--total" : "ev-qty-name"}>
        <span>{node.data.name}</span>
        {isHeaderRow(node.data) && !isTotalRow(node.data) && contractorChip(node.data.contractor_type) !== null && (
          <span className="ev-qty-chip">{contractorChip(node.data.contractor_type)}</span>
        )}
      </span>
    ),
  },
  {
    key: "uom",
    header: "Birim",
    className: "ev-qty-col-uom",
    render: (node) => (isHeaderRow(node.data) ? "" : (node.data.uom ?? EMPTY_CELL)),
  },
  {
    key: "rate",
    header: "Planlı oran",
    align: "right",
    mono: true,
    render: (node) => leafCell(node.data, rate(node.data.planned_unit_mhr)),
  },
  {
    key: "rate_day",
    header: "Gerçek oran gün",
    align: "right",
    mono: true,
    render: (node) => (
      <span className={rateExceedsPlanned(node.data.actual_unit_mhr_day, node.data.planned_unit_mhr) ? "ev-qty-rate--over" : undefined}>
        {leafCell(node.data, rate(node.data.actual_unit_mhr_day))}
      </span>
    ),
  },
  {
    key: "rate_cum",
    header: "Gerçek oran küm.",
    align: "right",
    mono: true,
    render: (node) => (
      <span className={rateExceedsPlanned(node.data.actual_unit_mhr_cum, node.data.planned_unit_mhr) ? "ev-qty-rate--over" : undefined}>
        {leafCell(node.data, rate(node.data.actual_unit_mhr_cum))}
      </span>
    ),
  },
  { key: "planned_qty", header: "Planlı miktar", align: "right", mono: true, render: (node) => leafCell(node.data, qty(node.data.planned_qty)) },
  { key: "qty_day", header: "Günlük miktar", align: "right", mono: true, render: (node) => leafCell(node.data, qty(node.data.qty_day)) },
  { key: "qty_cum", header: "Küm. miktar", align: "right", mono: true, render: (node) => leafCell(node.data, qty(node.data.qty_cum)) },
  {
    key: "remaining_qty",
    header: "Kalan miktar",
    align: "right",
    mono: true,
    render: (node) => leafCell(node.data, qty(node.data.remaining_qty)),
  },
  {
    key: "pf_day",
    header: "Günlük PF",
    align: "right",
    className: "ev-qty-pf-cell",
    render: (node) => (
      <PfBandCell as="span" value={node.data.pf_day === null ? null : formatPf(node.data.pf_day)} band={node.data.pf_day_band ?? "none"} />
    ),
  },
  {
    key: "spent_day",
    header: "Günlük harcanan",
    align: "right",
    mono: true,
    // CEO ölçümü (7. tur, madde G1) — a-s TAM SAYI (KPI'nin `wholeHours`ıyla
    // AYNI), `qty` (3 ondalık miktar kanonu) BURADA yanlıştı (mockup 76/41/43).
    render: (node) => wholeHours(node.data.spent_day),
  },
  {
    key: "progress",
    header: "İlerleme %",
    // Lider denetimi (6. tur, madde 2) — GİR:241 sütunun mockup min genişliği
    // 140px (`repeat` grid'i); TABLONUN (auto-layout) bunu SIKIŞTIRMASINI
    // önler — sıkışan sütunda ne çubuk ne metin görünür kalırdı.
    className: "ev-qty-col-progress",
    render: (node) => {
      const value = node.data.progress_pct_cum;
      // GİR:241 L1/L2 başlık satırları YALNIZ metin basar (mockup `q.prog`
      // düz metindir, çubuk YOK); çubuk yalnız L3 yapraklarda (GİR:261 `progW`).
      if (isHeaderRow(node.data)) {
        return <span className="ev-qty-progress-text">{pct(value)}</span>;
      }
      const width = value === null ? 0 : Math.min(100, Number(value) * 100);
      return (
        <span className="ev-qty-progress">
          <span className="ev-qty-progress__track">
            <span className="ev-qty-progress__bar" style={{ width: `${width}%` }} />
          </span>
          <span className="ev-qty-progress__value">{pct(value)}</span>
        </span>
      );
    },
  },
];
