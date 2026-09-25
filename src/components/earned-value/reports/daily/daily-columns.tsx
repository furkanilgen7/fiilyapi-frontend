"use client";

import type { TreeTableColumn } from "@/components/earned-value/common/tree-table/TreeTable";
import { PfBandCell } from "@/components/earned-value/reports/kit/PfBandCell";
import { EMPTY_CELL, formatQuantity } from "@/lib/format";
import { formatPercent01, formatPf, formatUnitRate } from "@/lib/earned-value";
import type { EvQtyTreeRow } from "@/lib/api/models";

/**
 * PLN-F3.4 · Miktar tablosunun 11 veri kolonu — GİR:234-269 başlıkları,
 * 248-261 satır çizimi. `TreeTable variant="progress"` + `collapsible=false`
 * (ağaç mockup'ta HER ZAMAN açıktır — chevron yok). L1/L2 başlık satırları
 * (`uom === null`) yalnız ad + PF/harcanan/ilerleme basar (GİR:240-245); L3
 * yapraklar TÜM kolonları doldurur (GİR:248-261).
 */
function isHeaderRow(row: EvQtyTreeRow): boolean {
  return row.uom === null;
}

function contractorChip(type: EvQtyTreeRow["contractor_type"]): string | null {
  if (type === "own") return "Kendi";
  if (type === "subcon") return "Taşeron";
  return null; // S18: karışıkta çip yok
}

const rate = (v: string | null) => (v === null ? EMPTY_CELL : formatUnitRate(v));
const qty = (v: string | null) => (v === null ? EMPTY_CELL : formatQuantity(v));
const pct = (v: string | null) => (v === null ? EMPTY_CELL : formatPercent01(v));

export const QUANTITY_COLUMNS: readonly TreeTableColumn<EvQtyTreeRow>[] = [
  {
    key: "name",
    header: "İş tipi",
    tree: true,
    render: (node) => (
      <span className="ev-qty-name">
        <span>{node.data.name}</span>
        {isHeaderRow(node.data) && contractorChip(node.data.contractor_type) !== null && (
          <span className="ev-qty-chip">{contractorChip(node.data.contractor_type)}</span>
        )}
      </span>
    ),
  },
  { key: "uom", header: "Birim", render: (node) => node.data.uom ?? EMPTY_CELL },
  { key: "rate", header: "Planlı oran", align: "right", mono: true, render: (node) => rate(node.data.planned_unit_mhr) },
  {
    key: "rate_day",
    header: "Gerçek oran gün",
    align: "right",
    mono: true,
    render: (node) => rate(node.data.actual_unit_mhr_day),
  },
  {
    key: "rate_cum",
    header: "Gerçek oran küm.",
    align: "right",
    mono: true,
    render: (node) => rate(node.data.actual_unit_mhr_cum),
  },
  { key: "planned_qty", header: "Planlı miktar", align: "right", mono: true, render: (node) => qty(node.data.planned_qty) },
  { key: "qty_day", header: "Günlük miktar", align: "right", mono: true, render: (node) => qty(node.data.qty_day) },
  { key: "qty_cum", header: "Küm. miktar", align: "right", mono: true, render: (node) => qty(node.data.qty_cum) },
  { key: "remaining_qty", header: "Kalan miktar", align: "right", mono: true, render: (node) => qty(node.data.remaining_qty) },
  {
    key: "pf_day",
    header: "Günlük PF",
    align: "right",
    render: (node) => (
      <PfBandCell as="span" value={node.data.pf_day === null ? null : formatPf(node.data.pf_day)} band={node.data.pf_day_band ?? "none"} />
    ),
  },
  { key: "spent_day", header: "Günlük harcanan", align: "right", mono: true, render: (node) => qty(node.data.spent_day) },
  {
    key: "progress",
    header: "İlerleme %",
    render: (node) => {
      const value = node.data.progress_pct_cum;
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
