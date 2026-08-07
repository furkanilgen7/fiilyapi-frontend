import { useState } from "react";

import { Badge } from "@/components/ui/badge/Badge";
import { cx } from "@/lib/cx";
import { formatDayMonthShort, formatDecimal } from "@/lib/format";

import {
  dayTotalModifier,
  dayTotalText,
  type TimesheetDayColumn,
  type TimesheetViewRow,
} from "./derive";
import {
  timesheetCodeMeta,
  WORKER_SOURCE_LABELS,
  type TimesheetVariant,
} from "./timesheet-codes";
import { TimesheetCellPopover } from "./TimesheetCellPopover";
import { timesheetDraftKey } from "./timesheet-draft";
import type { TimesheetCellEdit } from "./useTimesheetEditor";

/**
 * Puantaj matrisi tablosu — E5 (88-217) ve ŞP (115-253) ORTAK çekirdeği.
 *
 * İki varyantın mockup farkları:
 *   • `general` (E5 92-93): Personel + **Meslek AYRI KOLON**; hücre rozeti
 *     28×22 / 10px (E5 117).
 *   • `site` (ŞP 125-126): Personel hücresi ad + "meslek — firma" ALT SATIRI
 *     (ŞP 149, 169) taşır, yanında **Tür** kolonu (Şirket/Taşeron rozeti,
 *     ŞP 150/170); hücre rozeti 24×18 / 8px (ŞP 151).
 *
 *   • Ayak satırı İŞARETLERİ de AYRIDIR — bkz. `derive.ts/dayTotalText`:
 *     `site` `4+`/`3G` basar (ŞP 237/245), `general` YALNIZ SAYI basar
 *     (E5 203, FM hücresi varken bile).
 *
 * HÜCRE rozetleri her iki ekranda da veriye göre basılır: E5 mockup'ı (79-84)
 * 4'lü legend gösterir, ama `G` kodlu hücre veride varsa rozeti YİNE BASILIR
 * (kayıt gizlenmez) — yalnızca E5 legend'inde açıklanmaz.
 *
 * Mockup'ların "…" sütunu (E5 109/131 · ŞP 142/165) bir MOCKUP KIRPMASIDIR
 * (15 günden sonrası çizilmemiş) — gerçek ekran ayın TÜM günlerini basar,
 * bu yüzden kırpma sütunu yoktur.
 *
 * T3: hücreler YAZMA İZNİ olanda tıklanabilir (popover). `onCommit`
 * verilmezse (ya da `canWrite` yanlışsa) T2'nin salt-okunur görünümü aynen
 * korunur — saha mühendisi matrisi görür ama düzenleyemez.
 */
export interface TimesheetTableProps {
  variant: TimesheetVariant;
  days: readonly TimesheetDayColumn[];
  rows: readonly TimesheetViewRow[];
  totalManDays: number;
  /** Boş matris mesajı — yükleme/hata durumlarında görünüm dışarıdan verilir. */
  emptyMessage?: string;
  /** Hücre düzenleme yalnız yazma izninde açılır. */
  canWrite?: boolean;
  /** Kaydedilmemiş hücrelerin `timesheetDraftKey` anahtarları. */
  dirtyKeys?: ReadonlySet<string>;
  /** `null` = "Temizle". Verilmezse matris salt-okunurdur. */
  onCommit?: (personnelId: string, workDate: string, edit: TimesheetCellEdit | null) => void;
}

export function TimesheetTable({
  variant,
  days,
  rows,
  totalManDays,
  emptyMessage,
  canWrite = false,
  dirtyKeys,
  onCommit,
}: TimesheetTableProps) {
  const isSite = variant === "site";
  // E5 197 `colspan=2` (Personel+Meslek) · ŞP 231 `colspan=2` (Personel+Tür).
  const leadColSpan = 2;

  return (
    <div className={cx("ts-table-scroll", `ts-table-scroll--${variant}`)}>
      <table className={cx("ts-table", `ts-table--${variant}`)}>
        <thead>
          <tr>
            {/* E5 92 · ŞP 125 */}
            <th scope="col" className="ts-table__name-head">
              Personel
            </th>
            {/* E5 93 (Meslek) · ŞP 126 (Tür) */}
            <th scope="col" className="ts-table__lead-head">
              {isSite ? "Tür" : "Meslek"}
            </th>
            {/* E5 94-108 · ŞP 127-141 — mockup 15 gün çizer, gerçek ay tam basılır */}
            {days.map((day) => (
              <th key={day.workDate} scope="col" className="ts-table__day-head">
                {day.dayOfMonth}
              </th>
            ))}
            {/* E5 110 · ŞP 143 */}
            <th scope="col" className="ts-table__total-head">
              Toplam
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="ts-table__empty" colSpan={leadColSpan + days.length + 1}>
                {emptyMessage ?? "Bu ay için puantaj satırı yok."}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <TimesheetTableRow
              key={row.personnelId}
              variant={variant}
              row={row}
              days={days}
              canWrite={canWrite}
              dirtyKeys={dirtyKeys}
              onCommit={onCommit}
            />
          ))}
        </tbody>
        <tfoot>
          {/* E5 196-214 · ŞP 230-249 */}
          <tr className="ts-table__foot-row">
            <th scope="row" className="ts-table__foot-label" colSpan={leadColSpan}>
              Günlük Toplam
            </th>
            {/* İŞARETLER VARYANTA GÖRE (D1): `site` ŞP 237/245'in `4+`/`3G`
                işaretlerini basar; `general` E5 203 gereği YALNIZ SAYI basar —
                E5 120'de FM hücresi VARKEN BİLE. İki ayrı kural
                `dayTotalText`/`dayTotalModifier` içinde tek yerde durur. */}
            {days.map((day) => (
              <td
                key={day.workDate}
                className={cx(
                  "ts-table__foot-cell",
                  `ts-table__foot-cell--${dayTotalModifier(day, variant)}`,
                )}
              >
                {dayTotalText(day, variant)}
              </td>
            ))}
            {/* E5 213 · ŞP 248 — genel adam-gün */}
            <td className="ts-table__foot-total">{totalManDays}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function TimesheetTableRow({
  variant,
  row,
  days,
  canWrite,
  dirtyKeys,
  onCommit,
}: {
  variant: TimesheetVariant;
  row: TimesheetViewRow;
  days: readonly TimesheetDayColumn[];
  canWrite: boolean;
  dirtyKeys: ReadonlySet<string> | undefined;
  onCommit:
    | ((personnelId: string, workDate: string, edit: TimesheetCellEdit | null) => void)
    | undefined;
}) {
  const isSite = variant === "site";
  // Aynı anda TEK popover açıktır; hangi günün açık olduğu satırda durur.
  const [openDate, setOpenDate] = useState<string | null>(null);
  const isEditable = canWrite && onCommit !== undefined;
  return (
    <tr>
      {/* E5 115 · ŞP 149 */}
      <th scope="row" className="ts-table__name-cell">
        <span className="ts-table__name">{row.fullName}</span>
        {/* ŞP 149/169: "Kalıpçı Usta" · "Demir Ustası — Akın İnşaat".
            Firma adı yoksa yalnız meslek basılır, tire uydurulmaz. */}
        {isSite && <span className="ts-table__meta">{personMeta(row)}</span>}
      </th>
      {isSite ? (
        // ŞP 150/170 — Şirket (mavi) / Taşeron (sarı) Tür rozeti
        <td className="ts-table__lead-cell">
          <Badge
            variant={row.source === "subcontractor" ? "warning" : "primary"}
            className={cx("ts-source", row.source === "subcontractor" && "ts-source--subcontractor")}
          >
            {WORKER_SOURCE_LABELS[row.source] ?? row.source}
          </Badge>
        </td>
      ) : (
        // E5 116 — Meslek AYRI kolon
        <td className="ts-table__lead-cell ts-table__trade">{row.trade ?? "—"}</td>
      )}
      {days.map((day) => {
        const cell = row.cells[day.workDate];
        const isDirty = dirtyKeys?.has(timesheetDraftKey(row.personnelId, day.workDate)) ?? false;
        // "Ahmet Yılmaz · 3 Ağu" — hem popover başlığı hem hücre butonunun adı.
        const cellLabel = `${row.fullName} · ${formatDayMonthShort(day.workDate)}`;
        return (
          <td key={day.workDate} className="ts-table__cell">
            {isEditable ? (
              // Çapa hücrenin TAMAMINI kaplar: `inline-flex` bir çapa boş
              // hücrede sıfır genişlikte kalır ve BOŞ güne kod girilemezdi
              // (F-PL T5'te gerçek kusur olarak çıktı, jsdom görmez).
              <span className="ts-pop-anchor">
                <button
                  type="button"
                  className={cx("ts-cell-button", isDirty && "ts-cell-button--dirty")}
                  aria-label={`${cellLabel} puantajı`}
                  onClick={() => setOpenDate(day.workDate)}
                >
                  <TimesheetCellBadge cell={cell} />
                </button>
                {openDate === day.workDate && (
                  <TimesheetCellPopover
                    cell={cell ?? null}
                    label={cellLabel}
                    variant={variant}
                    onClose={() => setOpenDate(null)}
                    onSubmit={(edit) => {
                      onCommit(row.personnelId, day.workDate, edit);
                      setOpenDate(null);
                    }}
                  />
                )}
              </span>
            ) : (
              <TimesheetCellBadge cell={cell} />
            )}
          </td>
        );
      })}
      {/* E5 132 · ŞP 166 */}
      <td className="ts-table__row-total">{row.manDays}</td>
    </tr>
  );
}

/** Salt-okunur kod rozeti (E5 117 · ŞP 151). Boş gün BOŞ hücredir. */
function TimesheetCellBadge({ cell }: { cell: TimesheetViewRow["cells"][string] | undefined }) {
  if (!cell) return null;
  const meta = timesheetCodeMeta(cell.code);
  if (!meta) return null;
  // Saatli FM'de saat başlıkta gösterilir — mockup rozetin İÇİNE saat yazmaz.
  const hoursTitle =
    cell.code === "overtime" && cell.overtimeHours
      ? `${meta.label} · ${formatDecimal(cell.overtimeHours, 2)} saat`
      : meta.label;
  return (
    <span className={cx("ts-cell", `ts-cell--${meta.modifier}`)} title={hoursTitle}>
      {meta.letter}
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
