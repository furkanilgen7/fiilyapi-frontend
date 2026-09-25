"use client";

import { PrintSheet } from "@/components/earned-value/reports/kit/PrintSheet";
import { paginateByGroup } from "@/components/earned-value/reports/kit/paginate";
import { WeatherStrip } from "@/components/earned-value/reports/kit/WeatherStrip";
import { StatusMark } from "@/components/earned-value/reports/kit/StatusMark";
import { PfBandCell } from "@/components/earned-value/reports/kit/PfBandCell";
import { formatDateDots, formatDateTimeDots, formatQuantity, EMPTY_CELL } from "@/lib/format";
import { formatPercent01, formatPf, formatUnitRate, formatVariancePoints } from "@/lib/earned-value";
import type { EvDailyReport, EvQtyTreeRow } from "@/lib/api/models";

import { reportNoLabel } from "./daily-logic";
import { pfOutOfBandRows } from "./pf-out-of-band";

import "./daily-print.css";

/** GİR:301 satır kapasitesi — bir A4 yatay sayfaya sığan miktar satırı (üstlük + KPI sonrası kalan alan). */
const QUANTITY_ROWS_PER_PAGE = 14;

export interface DailyPrintViewProps {
  report: EvDailyReport;
  /** GİR:148 "firma · proje · şantiye" (`reportEyebrow`, DailyReportScreen'de kurulur). */
  eyebrow: string;
}

function pageFooter(report: EvDailyReport, eyebrow: string) {
  return (
    <>
      <span>{eyebrow} · Günlük İlerleme Raporu {formatDateDots(report.report_date)}</span>
      <span>{reportNoLabel(report.report_no)}</span>
      <span>Üretim {formatDateTimeDots(report.generated_at)}</span>
    </>
  );
}

/** Sayfa 3 (GİR:371-379) — mutabakat özeti + PF bant dışı kalemler, yalnız SON sayfada. */
function PrintReconciliation({ report }: { report: EvDailyReport }) {
  const footer = report.footer;
  const outOfBand = pfOutOfBandRows(report.warnings, report.quantities);
  const draftDates = report.draft_diary_dates.map((d) => formatDateDots(d)).join(", ");
  return (
    <div className="ev-print-reconciliation">
      {footer !== null && (
        <div className="ev-print-reconciliation__ok">
          Σ harcanan {formatQuantity(footer.spent_total_day)} a-s + dağıtılmamış {formatQuantity(footer.undistributed_day)} a-s = Σ
          puantaj {formatQuantity(footer.timesheet_total_day)} a-s
        </div>
      )}
      {(footer !== null && Number(footer.undistributed_day) > 0) || draftDates !== "" || report.unrated_entries.length > 0 ? (
        <div className="ev-print-reconciliation__warn">
          {footer !== null && Number(footer.undistributed_day) > 0 &&
            `${formatQuantity(footer.undistributed_day)} a-s dağıtılmamış`}
          {draftDates !== "" && ` · ${draftDates} günlükleri gönderilmedi`}
          {report.unrated_entries.map((w) => ` · ${w.item_name ?? w.message} oransız`).join("")}
        </div>
      ) : null}
      {outOfBand.length > 0 && (
        <div className="ev-print-reconciliation__pf">
          <div className="ev-print-reconciliation__pf-title">PF bant dışı kalemler (&lt; 0,95)</div>
          <table>
            <thead>
              <tr>
                <th>Kalem</th>
                <th>Disiplin</th>
                <th>Gün PF</th>
                <th>Küm PF</th>
              </tr>
            </thead>
            <tbody>
              {outOfBand.map((row) => (
                <tr key={row.key}>
                  <td>{row.itemName}</td>
                  <td>{row.disciplineName ?? EMPTY_CELL}</td>
                  <td>{row.dayValue === null ? EMPTY_CELL : formatPf(row.dayValue)}</td>
                  <td>{row.cumValue === null ? EMPTY_CELL : formatPf(row.cumValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** GİR miktar tablosu satırı — yazdırma kompakt hâli (DailyReportScreen'in ekran kolonlarından SADE). */
function PrintQuantityRow({ row }: { row: EvQtyTreeRow }) {
  const isHeader = row.uom === null;
  if (isHeader) {
    return (
      <div className="ev-print-qty__head">
        <span>{row.name}</span>
        <span className="ev-print-qty__head-meta">
          gün PF {row.pf_day === null ? EMPTY_CELL : formatPf(row.pf_day)} · harc. {formatQuantity(row.spent_day)}
        </span>
      </div>
    );
  }
  return (
    <div className="ev-print-qty__row">
      <span>{row.name}</span>
      <span>{row.uom}</span>
      <span>{row.planned_unit_mhr === null ? EMPTY_CELL : formatUnitRate(row.planned_unit_mhr)}</span>
      <span>{row.qty_day === null ? EMPTY_CELL : formatQuantity(row.qty_day)}</span>
      <span>{row.qty_cum === null ? EMPTY_CELL : formatQuantity(row.qty_cum)}</span>
      <PfBandCell as="span" value={row.pf_day === null ? null : formatPf(row.pf_day)} band={row.pf_day_band ?? "none"} />
      <span>{row.progress_pct_cum === null ? EMPTY_CELL : formatPercent01(row.progress_pct_cum)}</span>
    </div>
  );
}

/**
 * PLN-F3.4 · GİR yazdırma önizlemesi — GİR:299-386. Sayfa 1: başlık + hava +
 * Disiplin KPI + trend. Sonraki sayfalar: miktar tablosu, `paginateByGroup`
 * ile L1 (disiplin) sınırında kırılmış (`node_id` grup anahtarı — quantities
 * DFS ön-sıra, ilk satır her grubun L1 başlığıdır).
 */
export function DailyPrintView({ report, eyebrow }: DailyPrintViewProps) {
  // GİR: L1 disiplin kimliği grup anahtarıdır — L2/L3 satırlar aynı disiplinin
  // devamıdır. `quantities` DFS ön-sıra olduğundan bir L1'den SONRAKİ
  // (level>1) satırlar en son görülen L1'in grubuna girer.
  let groupOfLastL1 = "";
  const keyed = report.quantities.map((row) => {
    if (row.level === 1) groupOfLastL1 = row.node_id;
    return { row, group: groupOfLastL1 };
  });
  const qtyPages = paginateByGroup(keyed, QUANTITY_ROWS_PER_PAGE, (k) => k.group);

  const totalPages = 1 + qtyPages.length;

  return (
    <div className="ev-daily-print">
      <PrintSheet page={1} pageCount={totalPages} footer={pageFooter(report, eyebrow)}>
        <header className="ev-print-head">
          <div className="ev-print-head__title">
            <span className="ev-print-head__eyebrow">{eyebrow}</span>
            <span className="ev-print-head__name">Günlük İlerleme Raporu</span>
            <span className="ev-print-head__meta">
              {formatDateDots(report.report_date)} · Proje günü {report.day_no ?? EMPTY_CELL} · Hafta {report.week_no ?? EMPTY_CELL} · Baseline{" "}
              {report.revision?.name ?? EMPTY_CELL}
            </span>
          </div>
          <WeatherStrip days={report.weather} reportDate={report.report_date} />
        </header>

        <section aria-label="Disiplin KPI">
          <h2 className="ev-print-section-title">1 · Disiplin KPI</h2>
          <table className="ev-print-kpi">
            <thead>
              <tr>
                <th>Disiplin</th>
                <th>Gün plan %</th>
                <th>Gün gerç. %</th>
                <th>Gün PF</th>
                <th>Küm PF</th>
                <th>Sapma</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {report.kpis.map((row, i) => (
                <tr key={row.node_id ?? row.kind} className={row.kind.startsWith("overall") ? "ev-print-kpi__overall" : ""}>
                  <td>{row.name ?? EMPTY_CELL}</td>
                  <td>{row.planned_pct_day === null ? EMPTY_CELL : formatPercent01(row.planned_pct_day)}</td>
                  <td>{row.progress_pct_day === null ? EMPTY_CELL : formatPercent01(row.progress_pct_day)}</td>
                  <td>
                    <PfBandCell as="span" value={row.pf_day === null ? null : formatPf(row.pf_day)} band={row.pf_day_band ?? "none"} />
                  </td>
                  <td>
                    <PfBandCell as="span" value={row.pf_cum === null ? null : formatPf(row.pf_cum)} band={row.pf_cum_band ?? "none"} />
                  </td>
                  <td>{row.variance === null ? EMPTY_CELL : formatVariancePoints(row.variance)}</td>
                  <td>
                    <StatusMark status={row.status ?? "none"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </PrintSheet>

      {qtyPages.map((page, index) => {
        const pageNo = index + 2;
        const isContinuation = page[0]?.continued === true;
        const isLast = index === qtyPages.length - 1;
        return (
          <PrintSheet key={pageNo} page={pageNo} pageCount={totalPages} footer={pageFooter(report, eyebrow)}>
            <h2 className="ev-print-section-title">3 · Miktar tablosu {isContinuation ? "(devam)" : ""}</h2>
            <div className="ev-print-qty">
              {page.map((group, gi) => (
                <div key={gi}>
                  {group.rows.map((k) => (
                    <PrintQuantityRow key={k.row.node_id} row={k.row} />
                  ))}
                </div>
              ))}
            </div>
            {isLast && <PrintReconciliation report={report} />}
          </PrintSheet>
        );
      })}
    </div>
  );
}
