"use client";

import type { TreeTableColumn } from "../../common/tree-table/TreeTable";
import { PfBandCell } from "../kit/PfBandCell";
import { StatusMark } from "../kit/StatusMark";
import { EMPTY_CELL, formatDecimal } from "@/lib/format";
import { formatPercent01, formatPf, formatVariancePoints, type VarianceStatus } from "@/lib/earned-value";
import type { EvPanelRow } from "./panel-tree";
import { varianceTone } from "./panel-kpi-format";

/**
 * PLN-F3.3 · Disiplin tablosunun 9 veri kolonu — Panel:356-366 başlıkları,
 * 380-388 satır çizimi (`TreeTable variant="panel"`).
 */
const mhr = (v: string) => formatDecimal(v, 0);
const pct = (v: string | null) => (v === null ? EMPTY_CELL : formatPercent01(v));
const dev = (v: string | null) => (v === null ? EMPTY_CELL : formatVariancePoints(v));

/**
 * 🔴 LİDER DENETİMİ KUSURU (2. tur) — "Sapma" ÖNCEDEN SIFIR eşiğiyle
 * (her negatif = kırmızı) boyanıyordu; mockup `devFg` eşiği ±2 PUANDIR
 * (`panel-kpi-format.ts varianceTone` — KPI 1 kartıyla PAYLAŞILAN TEK
 * kaynak, aynı mockup `row()` fonksiyonundan gelir).
 */
function devToneClass(v: string | null): string {
  const tone = varianceTone(v);
  if (tone === "negative") return "ev-panel-table__dev--negative";
  if (tone === "positive") return "ev-panel-table__dev--positive";
  return "";
}

export const PANEL_COLUMNS: readonly TreeTableColumn<EvPanelRow>[] = [
  {
    key: "name",
    header: "Disiplin / iş tipi",
    tree: true,
    /**
     * S32 KESİNLEŞTİ (CEO, 2026-09-26) — `non_direct` satırının adı backend'den
     * TEK STRING gelir ("Genel / Dolaylı · bütçe dışı", Panel:542-544 birebir);
     * istemci "bütçe dışı" EKLEMEZ (çift basardı). Alt etiket ("Mobilizasyon ·
     * Şantiye temizliği") item satırlarının `uom` yuvasıyla AYNI görsel yuvayı
     * kullanır; kaynağı `indirect_item_names` (bkz. panel-tree.ts — backend
     * EV-BORC-9 netleşene dek YEREL tip genişletmesi) YOKSA hiç basılmaz.
     */
    render: (node) =>
      node.data.scope === "non_direct" ? (
        <span className="ev-panel-table__name ev-panel-table__name--muted">
          <span>{node.data.name}</span>
          {node.data.indirect_item_names !== undefined && node.data.indirect_item_names.length > 0 && (
            <span className="ev-panel-table__unit">{node.data.indirect_item_names.join(" · ")}</span>
          )}
        </span>
      ) : (
        <span className="ev-panel-table__name">
          <span>{node.data.name}</span>
          {node.data.contractor_mix !== null && (
            <span className="ev-panel-table__chip">{node.data.contractor_mix}</span>
          )}
          {node.data.uom !== null && <span className="ev-panel-table__unit">{node.data.uom}</span>}
        </span>
      ),
  },
  {
    key: "budget",
    header: "Bütçe a-s",
    align: "right",
    mono: true,
    /**
     * 🔴 LİDER DENETİMİ KUSURU (P4, 2026-09-26) — `budget_mhr` şemada
     * NULLABLE DEĞİL (`string`), `non_direct` satırında backend GERÇEKTEN
     * "0" verir (ölçüldü: `report_panel.py _series_row` `s.budget_mhr`,
     * dolaylı kapsamın bütçe TABANI YOK — backend kusuru DEĞİL). Mockup
     * (Panel:542-544) yine de bu satırda "Bütçe a-s" hücresini "–" basar
     * (K-SIFIR'ın İSTİSNASI: bu satırda "0" bütçe KAVRAMSIZLIĞINI, "veri
     * yok" GÖRÜNÜMÜYLE gösterme ÜRÜN KARARIDIR — plan §C7). Bu yüzden
     * `scope==="non_direct"` İÇİN AÇIKÇA `EMPTY_CELL`, diğer satırlarda
     * `budget_mhr` HER ZAMAN gerçek (`mhr`) değeri basar.
     */
    render: (node) => (node.data.scope === "non_direct" ? EMPTY_CELL : mhr(node.data.budget_mhr)),
  },
  { key: "earned", header: "Kazanılmış", align: "right", mono: true, render: (node) => (node.data.earned_cum === null ? EMPTY_CELL : mhr(node.data.earned_cum)) },
  { key: "spent", header: "Harcanan", align: "right", mono: true, render: (node) => (node.data.spent_cum === null ? EMPTY_CELL : mhr(node.data.spent_cum)) },
  {
    key: "planned_pct",
    header: "Planlı %",
    align: "right",
    mono: true,
    // 🔴 LİDER DENETİMİ KUSURU: "Planlı %" mockup'ta GRİ (muted) — düz metin
    // renginden ayrıştırılmamıştı.
    render: (node) => <span className="ev-panel-table__planned">{pct(node.data.planned_pct_cum)}</span>,
  },
  { key: "progress_pct", header: "Gerçek %", align: "right", mono: true, render: (node) => pct(node.data.progress_pct_cum) },
  {
    key: "variance",
    header: "Sapma",
    align: "right",
    mono: true,
    render: (node) => <span className={devToneClass(node.data.variance)}>{dev(node.data.variance)}</span>,
  },
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
