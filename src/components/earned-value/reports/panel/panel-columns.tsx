"use client";

import type { TreeTableColumn } from "../../common/tree-table/TreeTable";
import { PfBandCell } from "../kit/PfBandCell";
import { StatusMark } from "../kit/StatusMark";
import { EMPTY_CELL, formatDecimal } from "@/lib/format";
import { formatPercent01, formatPf, formatVariancePoints, type VarianceStatus } from "@/lib/earned-value";
import type { EvPanelRow } from "./panel-tree";

/**
 * PLN-F3.3 · Disiplin tablosunun 9 veri kolonu — Panel:356-366 başlıkları,
 * 380-388 satır çizimi (`TreeTable variant="panel"`).
 */
const mhr = (v: string) => formatDecimal(v, 0);
const pct = (v: string | null) => (v === null ? EMPTY_CELL : formatPercent01(v));
const dev = (v: string | null) => (v === null ? EMPTY_CELL : formatVariancePoints(v));

export const PANEL_COLUMNS: readonly TreeTableColumn<EvPanelRow>[] = [
  {
    key: "name",
    header: "Disiplin / iş tipi",
    tree: true,
    render: (node) => (
      <span className="ev-panel-table__name">
        <span>{node.data.name}</span>
        {node.data.contractor_mix !== null && (
          <span className="ev-panel-table__chip">{node.data.contractor_mix}</span>
        )}
        {node.data.uom !== null && <span className="ev-panel-table__unit">{node.data.uom}</span>}
      </span>
    ),
  },
  { key: "budget", header: "Bütçe a-s", align: "right", mono: true, render: (node) => mhr(node.data.budget_mhr) },
  { key: "earned", header: "Kazanılmış", align: "right", mono: true, render: (node) => (node.data.earned_cum === null ? EMPTY_CELL : mhr(node.data.earned_cum)) },
  { key: "spent", header: "Harcanan", align: "right", mono: true, render: (node) => (node.data.spent_cum === null ? EMPTY_CELL : mhr(node.data.spent_cum)) },
  { key: "planned_pct", header: "Planlı %", align: "right", mono: true, render: (node) => pct(node.data.planned_pct_cum) },
  { key: "progress_pct", header: "Gerçek %", align: "right", mono: true, render: (node) => pct(node.data.progress_pct_cum) },
  { key: "variance", header: "Sapma", align: "right", mono: true, render: (node) => dev(node.data.variance) },
  {
    key: "pf_cum",
    header: "Küm. PF",
    align: "right",
    mono: true,
    render: (node) => (
      <PfBandCell as="span" value={node.data.pf_cum === null ? null : formatPf(node.data.pf_cum)} band={node.data.pf_cum_band ?? "none"} />
    ),
  },
  {
    key: "pf_week",
    header: "Bu hafta PF",
    align: "right",
    mono: true,
    render: (node) => (
      <PfBandCell as="span" value={node.data.pf_week === null ? null : formatPf(node.data.pf_week)} band={node.data.pf_week_band ?? "none"} />
    ),
  },
  {
    key: "status",
    header: "Durum",
    render: (node) => <StatusMark status={(node.data.status ?? "none") as VarianceStatus} />,
  },
];
