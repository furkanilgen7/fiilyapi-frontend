import { cx } from "@/lib/cx";
import { formatDateDots } from "@/lib/format";
import { formatPf, formatUnitRate } from "@/lib/earned-value";
import type { EvQurrReport } from "@/lib/api/models";

import { PrintSheet } from "../kit/PrintSheet";
import { formatWeekRangeShort } from "../kit/report-date-format";
import { initialExpanded, visibleRows, type TreeNode } from "../../common/tree-table/tree-rows";
import { QURR_COLUMNS, qurrCellBand, qurrCellText, qurrNodeCode } from "./qurr-columns";
import { joinNonEmpty } from "./qurr-print-title";
import type { QurrTreeNodeData } from "./qurr-tree";
import "./qurr-print.css";

/**
 * PLN-F3.5 · QURR yazdırma önizlemesi — LİDER DÜZELTMESİ: C'nin
 * `PrintSheet`iyle Q:204-237 birebir (A4 yatay, TEK sayfa: 22 satır 18
 * kolonla sığar — `paginateByGroup` GEREKMEZ, mockup'ın kendisi
 * "18 kolon sayfaya sığdırıldı · 1 sayfa" der).
 */
export interface QurrPrintViewProps {
  data: EvQurrReport;
  tree: readonly TreeNode<QurrTreeNodeData>[];
  companyName: string;
  projectName: string;
  siteName: string;
}

const FORMULA_LEGEND =
  '(d)=b−c · (f)=a×m · (g)=b×n · (h)=c×n · (j)=g−h · (k)=e×n · (o)=i÷c · (p)=l÷e · (q)=h÷i · (r)=k÷l · PF bantları <0,95 kırmızı · 0,95–1,00 sarı · 1,00 ve üstü yeşil';

const PRINT_INDENT = [5, 9, 14] as const;

function isTotalRow(node: QurrTreeNodeData): "direct" | "all" | null {
  if (node.kind !== "total") return null;
  if (node.total.kind === "direct_total") return "direct";
  if (node.total.kind === "all_total") return "all";
  return null;
}

export function QurrPrintView({ data, tree, companyName, projectName, siteName }: QurrPrintViewProps) {
  const rows = visibleRows(tree, initialExpanded(tree, "all"));
  const firstComposite = data.composites[0];
  // Q:210 eyebrow = firma · proje · şantiye; Q:232 footer ilk parça = proje · şantiye (firma YOK).
  const eyebrow = joinNonEmpty([companyName, projectName, siteName]);
  const footerSite = joinNonEmpty([projectName, siteName]);

  return (
    <div className="qurr-print-wrap">
      <p className="qurr-print-wrap__label">A4 yatay · 1 sayfa · 18 kolon sayfaya sığdırıldı</p>
      <PrintSheet
        page={1}
        pageCount={1}
        footer={
          <>
            <span>{joinNonEmpty([footerSite, `QURR Hafta ${data.week_no}`])}</span>
            <span>QURR-H{data.week_no}</span>
            <span>
              Üretim {data.generated_at !== null && data.generated_at !== undefined ? formatDateDots(data.generated_at.slice(0, 10)) : "—"}
            </span>
            <span>
              Kaynak: Günlük İlerleme Raporları {formatWeekRangeShort(data.week_start, data.week_end)}
              {data.draft_diary_dates.length > 0 && (
                <> ({data.draft_diary_dates.map((d) => formatDateDots(d)).join(" ve ")} taslak)</>
              )}
            </span>
          </>
        }
      >
        <div className="qurr-print__head">
          <div className="qurr-print__head-text">
            <span className="qurr-print__eyebrow">{eyebrow}</span>
            <span className="qurr-print__title">Haftalık Miktar &amp; Birim Oran Raporu (QURR)</span>
            <span className="qurr-print__meta">
              Hafta {data.week_no} · {formatWeekRangeShort(data.week_start, data.week_end)} · {data.previous_revision?.name ?? "Rev ?"} → {data.revision.name ?? "Rev ?"}
            </span>
          </div>
          {data.kpis.map((kpi) => (
            <div key={kpi.scope} className="qurr-print__kpi">
              <span className="qurr-print__kpi-label">{kpi.scope === "overall_own" ? "Kendi" : "Taşeron"} PF · küm / hafta</span>
              <span className="qurr-print__kpi-value">
                <span className={cx("qurr-print__kpi-num", `pf-band-cell--${kpi.pf_cum_band ?? "none"}`)}>
                  {kpi.pf_cum === null ? "–" : formatPf(kpi.pf_cum)}
                </span>
                {" / "}
                <span className={cx("qurr-print__kpi-num", `pf-band-cell--${kpi.pf_week_band ?? "none"}`)}>
                  {kpi.pf_week === null ? "–" : formatPf(kpi.pf_week)}
                </span>
              </span>
            </div>
          ))}
          {firstComposite !== undefined && (
            <div className="qurr-print__kpi qurr-print__kpi--pacal">
              {/*
               * ONAYLI SAPMA (kullanıcı, 2026-09-25): yazdırma paçal etiketi
               * = `composite.name` (KULLANICI VERİSİ — Ayarlar > Planlama,
               * Ayarlar - Planlama.dc.html:252 `pacal[].name`, ör. "1 m³
               * beton başına toplam betonarme a-s"), unit AYRICA EKLENMEZ
               * ("short_name" YOK, KARARLAR.md'ye CEO yazıyor). Dar kutuda
               * gerekirse İKİ SATIRA kırılır — `qurr-print__kpi-label`
               * (qurr-print.css) `white-space: normal`.
               */}
              <span className="qurr-print__kpi-label">{firstComposite.name}</span>
              <span className="qurr-print__kpi-value">{formatUnitRate(firstComposite.actual)}</span>
            </div>
          )}
        </div>

        <table className="qurr-print__table">
          <thead>
            <tr>
              <th className="qurr-print__code-col">Kod</th>
              <th className="qurr-print__name-col">İş tipi</th>
              {QURR_COLUMNS.map((col) => (
                <th key={col.key} className="qurr-print__num-col">
                  {col.short} <span className="qurr-print__col-code">({col.key})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const totalKind = isTotalRow(row.node.data);
              return (
                <tr
                  key={row.id}
                  className={cx(
                    `qurr-print__row--level-${row.depth}`,
                    totalKind === "direct" && "qurr-print__row--direct-total",
                    totalKind === "all" && "qurr-print__row--all-total",
                  )}
                >
                  <td className="qurr-print__code-col">{qurrNodeCode(row.node.data)}</td>
                  <td className="qurr-print__name-col" style={{ paddingLeft: PRINT_INDENT[row.depth] ?? PRINT_INDENT[2] }}>
                    {row.node.data.kind === "row" ? row.node.data.row.name : row.node.data.total.name}
                  </td>
                  {QURR_COLUMNS.map((col) => {
                    const band = qurrCellBand(row.node.data, col.key);
                    const { text, danger } = qurrCellText(row.node.data, col.key);
                    return (
                      <td
                        key={col.key}
                        className={cx(
                          "qurr-print__num-col",
                          band !== null && `pf-band-cell--${band}`,
                          danger && "qurr-cell--danger",
                        )}
                      >
                        {text}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="qurr-print__formula-legend">{FORMULA_LEGEND}</p>
      </PrintSheet>
    </div>
  );
}
