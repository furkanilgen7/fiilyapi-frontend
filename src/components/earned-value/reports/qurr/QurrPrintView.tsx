import { Fragment } from "react";

import { cx } from "@/lib/cx";
import { formatDateDots } from "@/lib/format";
import { formatPf, formatUnitRate } from "@/lib/earned-value";
import type { EvQurrReport } from "@/lib/api/models";

import { PrintSheet } from "../kit/PrintSheet";
import { paginateByGroup } from "../kit/paginate";
import { formatWeekRangeShort } from "../kit/report-date-format";
import { initialExpanded, visibleRows, type TreeNode, type VisibleRow } from "../../common/tree-table/tree-rows";
import { QURR_COLUMNS, qurrCellBand, qurrCellText, qurrNodeCode } from "./qurr-columns";
import { joinNonEmpty } from "./qurr-print-title";
import type { QurrTreeNodeData } from "./qurr-tree";
import "./qurr-print.css";

/**
 * FIX-F2 · Ajan D madde 1 (S34 kullanıcı kararı, onaylı sapma) — QURR
 * yazdırması artık GİR (`DailyPrintView`) deseniyle ÇOK SAYFA olabilir.
 * Önceki "TEK sayfaya sığar" varsayımı BACKEND'İN satır sayısını mockup'ın
 * 22 satırlık fikstürüyle SINIRLAMADIĞI için yanlıştı (bkz. `QurrPrintView.test.tsx`
 * KANIT testi — 60 satırlık WBS'te eskiden TEK `.ev-print-sheet` üretiliyordu;
 * sabit yükseklik + `overflow:hidden` altında bu, satırların SESSİZCE
 * kesilmesi demekti).
 *
 * GİR:299-386 (`DailyPrintView`) ile AYNI kural: `paginateByGroup` disiplin
 * (depth 0) sınırında kırar — bir disiplin MÜMKÜNSE tek sayfada kalır, tek
 * başına kapasiteden büyükse zorunlu bölünür (`continued` bayrağı, "(devam)"
 * ile basılır). Kısa mockup fikstürü (`QURR_FIXTURE_READY`, 24 görünür satır
 * — 11 iş tipi + 13 ara toplam) `QURR_ROWS_PER_PAGE`nin ALTINDA kaldığından
 * TEK sayfa üretir ve DOM'u önceki (sayfalamasız) hâlle AYNIDIR —
 * `haftalik qurr yazdirma onizlemesi gorsel` görsel karesi ve
 * `WeeklyQurrScreen.test.tsx`in "A4 yatay · 1 sayfa · 18 kolon sayfaya
 * sığdırıldı" beklentisi BOZULMAZ.
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

/**
 * Sayfa başına satır kapasitesi — GİR `QUANTITY_ROWS_PER_PAGE`
 * (`DailyPrintView.tsx:19-38`) ile AYNI yöntemle statik ÖLÇÜLDÜ
 * (`print-sheet.css` + `qurr-print.css`):
 *
 * `.ev-print-sheet` içerik alanı ≈ 794px yükseklik − 26px üst dolgu − ~32px
 * altlık payı (`.ev-print-sheet__footer` `bottom:14px` + ~18px kendi
 * yüksekliği) ≈ 736px.
 *
 * `.qurr-print__head` (eyebrow 9px + başlık 15px + meta 10px satırları,
 * `padding-bottom:6px` + `border-bottom:2px`) ≈ 51px; `.ev-print-sheet__content`
 * `gap:10px` bir kez düşülür (head→tablo): 736 − 51 − 10 ≈ 675.
 *
 * `.qurr-print__table thead` satırı (yazı 7.5px + `padding:3px 5px` ⇒ ~15px)
 * düşülünce gövde satırlarına ≈ 660px kalır. Gövde satırı (yazı 8px +
 * `padding:3px 5px` ⇒ ~6px dolgu + ~10px yazı ≈ 16px, GİR'in miktar satırı
 * ölçümüyle AYNI mertebe) ⇒ 660 / 16 ≈ 41 satır.
 *
 * SON sayfada `.qurr-print__formula-legend` payı (uzun tek paragraf, 8px
 * yazı + `line-height:1.5`, 1123px genişlikte İKİ satıra sarabilir ≈ 24px +
 * 10px gap ≈ 34px) DÜŞÜLÜNCE ≈ (660 − 34) / 16 ≈ 39 satır. `paginateByGroup`
 * TEK kapasiteyle çalıştığından (lejantın hangi sayfaya düşeceği veriye
 * bağlı — GİR'deki AYNI kısıt) güvenli ORTAK payda SON sayfa senaryosuna
 * göre 32'YE yuvarlandı (41 ile 39 arasındaki payın altında).
 */
const QURR_ROWS_PER_PAGE = 32;

interface QurrKeyedRow {
  readonly row: VisibleRow<QurrTreeNodeData>;
  readonly group: string;
}

/**
 * GİR `DailyPrintView` ile AYNI desen (`groupOfLastL1`): `visibleRows` DFS
 * ön-sıra döndürür, bu yüzden en son görülen depth-0 (disiplin/Σ toplam)
 * kimliği, sonraki alt-grup/iş-tipi satırlarının grup anahtarıdır.
 */
function keyByDiscipline(rows: readonly VisibleRow<QurrTreeNodeData>[]): QurrKeyedRow[] {
  let groupOfLastTop = "";
  return rows.map((row) => {
    if (row.depth === 0) groupOfLastTop = row.id;
    return { row, group: groupOfLastTop };
  });
}

function isTotalRow(node: QurrTreeNodeData): "direct" | "all" | null {
  if (node.kind !== "total") return null;
  if (node.total.kind === "direct_total") return "direct";
  if (node.total.kind === "all_total") return "all";
  return null;
}

function QurrPrintTableRow({ row }: { row: VisibleRow<QurrTreeNodeData> }) {
  const totalKind = isTotalRow(row.node.data);
  return (
    <tr
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
            className={cx("qurr-print__num-col", band !== null && `pf-band-cell--${band}`, danger && "qurr-cell--danger")}
          >
            {text}
          </td>
        );
      })}
    </tr>
  );
}

export function QurrPrintView({ data, tree, companyName, projectName, siteName }: QurrPrintViewProps) {
  const rows = visibleRows(tree, initialExpanded(tree, "all"));
  const firstComposite = data.composites[0];
  // Q:210 eyebrow = firma · proje · şantiye; Q:232 footer ilk parça = proje · şantiye (firma YOK).
  const eyebrow = joinNonEmpty([companyName, projectName, siteName]);
  const footerSite = joinNonEmpty([projectName, siteName]);

  const keyed = keyByDiscipline(rows);
  const pages = paginateByGroup(keyed, QURR_ROWS_PER_PAGE, (k) => k.group);
  const totalPages = pages.length;

  const footer = (
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
  );

  return (
    <div className="qurr-print-wrap">
      <p className="qurr-print-wrap__label">A4 yatay · {totalPages} sayfa · 18 kolon sayfaya sığdırıldı</p>
      {pages.map((page, index) => {
        const pageNo = index + 1;
        // GİR `DailyPrintView` ile AYNI kural: sayfa "(devam)" işaretini
        // yalnız o sayfa, bölünmüş bir disiplinin DEVAMIYLA başlıyorsa alır.
        const isContinuation = page[0]?.continued === true;
        const isLast = index === pages.length - 1;
        return (
          <PrintSheet key={pageNo} page={pageNo} pageCount={totalPages} footer={footer}>
            <div className="qurr-print__head">
              <div className="qurr-print__head-text">
                <span className="qurr-print__eyebrow">{eyebrow}</span>
                <span className="qurr-print__title">
                  Haftalık Miktar &amp; Birim Oran Raporu (QURR){isContinuation ? " (devam)" : ""}
                </span>
                <span className="qurr-print__meta">
                  Hafta {data.week_no} · {formatWeekRangeShort(data.week_start, data.week_end)} · {data.previous_revision?.name ?? "Rev ?"} →{" "}
                  {data.revision.name ?? "Rev ?"}
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
                {page.map((cluster, ci) => (
                  <Fragment key={ci}>
                    {cluster.rows.map((k) => (
                      <QurrPrintTableRow key={k.row.id} row={k.row} />
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {isLast && <p className="qurr-print__formula-legend">{FORMULA_LEGEND}</p>}
          </PrintSheet>
        );
      })}
    </div>
  );
}
