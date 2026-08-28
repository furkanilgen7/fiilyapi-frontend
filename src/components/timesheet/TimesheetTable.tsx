import { Badge } from "@/components/ui/badge/Badge";
import { cx } from "@/lib/cx";
import { formatDecimal } from "@/lib/format";

import type { TimesheetDayColumn, TimesheetViewRow } from "./derive";
import {
  dayHoursModifier,
  resolveSourceBadgeVariant,
  resolveWorkerSourceLabel,
  timesheetCodeMeta,
} from "./timesheet-codes";

/**
 * AYLIK puantaj matrisi — Bölüm Detay'ın "İşçiler & Puantaj" sekmesinin
 * tablosu. Görsel dili ŞP (`Şantiye - Puantaj.dc.html`) mockup'ından gelir.
 *
 * 🔴 SALT OKUNURDUR ve öyle KALIR. Yazma yolu HAFTALIKTIR
 * (`TimesheetWeekTable` + `PUT .../timesheet/week`); aylık `PUT` uçtan
 * kalktığı için bu tablodan kaydetmek YAPISAL OLARAK imkânsızdır. Gerekçe
 * K2'nin kendisidir: bölüm kapsamlı bir yüzeyden yazmak diğer bölümlerin
 * kayıtlarını silme riskini bu ekrana taşırdı.
 *
 * 🔴 HÜCRE ŞEKLİ DEĞİŞTİ (PUAN-SAAT): hücre artık ya SAATtir ya KOD rozeti.
 * Saat hücresinin tonu `dayHoursModifier`dan gelir ve bir İPUCUDUR, hesap
 * değil — fazla mesai haftalık türevdir ve bu ekranda YOKTUR.
 *
 * Ayın "…" sütunu (ŞP 142/165) bir MOCKUP KIRPMASIDIR — gerçek ekran ayın TÜM
 * günlerini basar.
 */
export interface TimesheetTableProps {
  days: readonly TimesheetDayColumn[];
  rows: readonly TimesheetViewRow[];
  /** Ayın saat toplamı — tfoot sağ ucu. */
  totalHours: string;
  /** Saat renginin eşiği; `null` ise ton basılmaz (uydurma eşik yok). */
  normalDayHours: string | null;
  /** Boş matris mesajı — yükleme/hata durumlarında görünüm dışarıdan verilir. */
  emptyMessage?: string;
}

/** Personel + Tür kolonları (ŞP 231 `colspan=2`). */
const LEAD_COL_SPAN = 2;

export function TimesheetTable({
  days,
  rows,
  totalHours,
  normalDayHours,
  emptyMessage,
}: TimesheetTableProps) {
  return (
    <div className="ts-table-scroll ts-table-scroll--site">
      <table className="ts-table ts-table--site">
        <thead>
          <tr>
            {/* ŞP 125 */}
            <th scope="col" className="ts-table__name-head">
              Personel
            </th>
            {/* ŞP 126 */}
            <th scope="col" className="ts-table__lead-head">
              Tür
            </th>
            {/* ŞP 127-141 — mockup 15 gün çizer, gerçek ay tam basılır */}
            {days.map((day) => (
              <th key={day.workDate} scope="col" className="ts-table__day-head">
                {day.dayOfMonth}
              </th>
            ))}
            {/* ŞP 143 */}
            <th scope="col" className="ts-table__total-head">
              Saat
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="ts-table__empty" colSpan={LEAD_COL_SPAN + days.length + 1}>
                <span>{emptyMessage ?? "Bu ay için puantaj satırı yok."}</span>
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.personnelId}>
              {/* ŞP 149 — "Kalıpçı Usta — Akın İnşaat"; firma yoksa tire uydurulmaz */}
              <th scope="row" className="ts-table__name-cell">
                <span className="ts-table__name">{row.fullName}</span>
                <span className="ts-table__meta">{personMeta(row)}</span>
              </th>
              {/* ŞP 150/170 — Şirket (mavi) / Taşeron (amber); diğer kaynaklar nötre düşer */}
              <td className="ts-table__lead-cell">
                <Badge
                  variant={resolveSourceBadgeVariant(row.source)}
                  className={cx(
                    "ts-source",
                    row.source === "subcontractor" && "ts-source--subcontractor",
                  )}
                >
                  {resolveWorkerSourceLabel(row.source)}
                </Badge>
              </td>
              {days.map((day) => (
                <td key={day.workDate} className="ts-table__cell">
                  <TimesheetReadCell
                    cell={row.cells[day.workDate]}
                    normalDayHours={normalDayHours}
                  />
                </td>
              ))}
              {/* ŞP 166 */}
              <td className="ts-table__row-total">{formatDecimal(row.totalHours, 1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {/* ŞP 230-249 */}
          <tr className="ts-table__foot-row">
            <th scope="row" className="ts-table__foot-label" colSpan={LEAD_COL_SPAN}>
              Günlük Toplam
            </th>
            {days.map((day) => (
              <td
                key={day.workDate}
                className={cx(
                  "ts-table__foot-cell",
                  `ts-table__foot-cell--${day.workedDayCount > 0 ? "worked" : "zero"}`,
                )}
              >
                {formatDecimal(day.totalHours, 1)}
              </td>
            ))}
            {/* ŞP 248 */}
            <td className="ts-table__foot-total">{formatDecimal(totalHours, 1)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Salt-okunur hücre: SAAT sayısı ya da KOD rozeti. Boş gün BOŞ hücredir —
 * "0" basmak "sıfır saat çalıştı" derdi, oysa kayıt HİÇ YOKTUR.
 */
function TimesheetReadCell({
  cell,
  normalDayHours,
}: {
  cell: TimesheetViewRow["cells"][string] | undefined;
  normalDayHours: string | null;
}) {
  if (!cell) return null;
  if (cell.code !== null) {
    const meta = timesheetCodeMeta(cell.code);
    if (!meta) return null;
    return <span className={cx("ts-tag", `ts-tag--${meta.modifier}`)}>{meta.letter}</span>;
  }
  if (cell.hours === null || cell.hours.trim().length === 0) return null;
  // Eşik bilinmiyorsa TON BASILMAZ — uydurma bir "tam gün" rengi, olmayan bir
  // sözleşmeyi ekrana yazardı.
  const modifier = normalDayHours === null ? null : dayHoursModifier(cell.hours, normalDayHours);
  return (
    <span className={cx("ts-hours", modifier !== null && `ts-hours--${modifier}`)}>
      {formatDecimal(cell.hours, 1)}
    </span>
  );
}

function personMeta(row: TimesheetViewRow): string {
  const trade = row.trade ?? "";
  if (row.subcontractorName) {
    return trade ? `${trade} — ${row.subcontractorName}` : row.subcontractorName;
  }
  return trade;
}
