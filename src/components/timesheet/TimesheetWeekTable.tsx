"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge/Badge";
import { Input } from "@/components/ui/input/Input";
import type { TimesheetCode } from "@/lib/api/hooks/useTimesheet";
import { cx } from "@/lib/cx";
import { formatDecimal } from "@/lib/format";

import {
  dayHoursModifier,
  resolveSourceBadgeVariant,
  resolveWorkerSourceLabel,
  timesheetCodeMeta,
} from "./timesheet-codes";
import { dayHoursText, parseDayHours, timesheetDraftKey } from "./timesheet-draft";
import { TimesheetCellPopover } from "./TimesheetCellPopover";
import type { TimesheetWeekDayColumn, TimesheetWeekViewRow } from "./week-derive";

/**
 * HAFTALIK puantaj ızgarası — E5 (211-330) ve ŞP'nin ORTAK çekirdeği.
 *
 * 🔴 İKİ EKRAN TEK ÇEKİRDEK (yönetim kararı 2026-08-28): `/puantaj` ile
 * `Şantiye › Puantaj` sekmesi hesap olarak İKİZDİR; fark KABUKTUR (şantiye
 * seçici ↔ rotadan sabit şantiye, bölüm süzgeci, özet şeridi, Excel). Izgara,
 * hücre şekli, türev kolonları ve ayak satırı burada TEK YERDE durur.
 *
 * ═══ HÜCRE = SAAT KUTUSU (E5 238) ═══
 * Çalışılan gün artık `<input>`tur; kod (`İzin`/`Görev`) ROZETTİR (E5 260/281).
 * Kod seçme yüzeyi `TimesheetCellPopover`dır — mockup rozetin nasıl seçildiğini
 * çizmez, ama yolu olmayan bir yetenek sessizce kaybolurdu.
 *
 * ═══ 🔴 NORMAL / FM EKRANDA HESAPLANMAZ (E5 226-228) ═══
 * Kolonlar backend'in `TimesheetRowTotals`undan OKUNUR. FM haftalık 45 saat
 * tavanı ile günlük normal saat tavanının birleşimidir; ekranda yeniden
 * türetilirse puantaj ile bordro tutmaz. Kaydedilmemiş düzenleme varsa değer
 * BAYATTIR ve `*` ile işaretlenir — sessizce eski sayı basılmaz.
 *
 * Hücre RENGİ (`dayHoursModifier`) bir İPUCUDUR, hesap değil.
 */
export interface TimesheetWeekTableProps {
  days: readonly TimesheetWeekDayColumn[];
  rows: readonly TimesheetWeekViewRow[];
  /** Renk eşiği — sözleşmeden (`normal_day_hours`), mockup sabitinden DEĞİL. */
  normalDayHours: string;
  /** tfoot türevleri. */
  totalHours: string;
  normalHours: string;
  overtimeHours: string;
  isStale: boolean;
  emptyMessage?: string;
  /** Boş ızgarada mesajın ALTINA basılan yönlendirme. */
  emptyAction?: React.ReactNode;
  canWrite?: boolean;
  /** Kaydedilmemiş hücrelerin `timesheetDraftKey` anahtarları. */
  dirtyKeys?: ReadonlySet<string>;
  onCommitHours?: (personnelId: string, workDate: string, hours: string | null) => void;
  onCommitCode?: (personnelId: string, workDate: string, code: TimesheetCode | null) => void;
}

const STALE_TITLE =
  "Kaydedilmemiş değişiklik var — Normal/FM ayrımı kaydettikten sonra güncellenir.";

export function TimesheetWeekTable({
  days,
  rows,
  normalDayHours,
  totalHours,
  normalHours,
  overtimeHours,
  isStale,
  emptyMessage,
  emptyAction,
  canWrite = false,
  dirtyKeys,
  onCommitHours,
  onCommitCode,
}: TimesheetWeekTableProps) {
  const isEditable = canWrite && onCommitHours !== undefined && onCommitCode !== undefined;

  return (
    <div className="ts-week-scroll">
      <table className="ts-week-table">
        <thead>
          <tr>
            {/* E5 216 */}
            <th scope="col" className="ts-week-table__name-head">
              Personel
            </th>
            {/* E5 217-223 — gün başlıkları GERÇEK takvimden */}
            {days.map((day) => (
              <th
                key={day.workDate}
                scope="col"
                className={cx(
                  "ts-week-table__day-head",
                  day.isSaturday && "ts-week-table__day-head--saturday",
                  day.isSunday && "ts-week-table__day-head--sunday",
                )}
              >
                <span className="ts-week-table__weekday">{day.weekday}</span>
                <span className="ts-week-table__daydate">{day.dayMonth}</span>
              </th>
            ))}
            {/* E5 224-226 */}
            <th scope="col" className="ts-week-table__total-head ts-week-table__total-head--normal">
              Normal Saat
            </th>
            <th scope="col" className="ts-week-table__total-head ts-week-table__total-head--overtime">
              FM Saat
            </th>
            <th scope="col" className="ts-week-table__total-head">
              Hafta Toplam
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="ts-week-table__empty" colSpan={days.length + 4}>
                <span>{emptyMessage ?? "Bu hafta için puantaj satırı yok."}</span>
                {emptyAction && (
                  <span className="ts-week-table__empty-action">{emptyAction}</span>
                )}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.personnelId}>
              {/* E5 232-236 */}
              <th scope="row" className="ts-week-table__name-cell">
                <span className="ts-week-table__name">{row.fullName}</span>
                <span className="ts-week-table__meta">
                  {personMeta(row)}
                  <Badge
                    variant={resolveSourceBadgeVariant(row.source)}
                    className={cx(
                      "ts-source",
                      row.source === "subcontractor" && "ts-source--subcontractor",
                    )}
                  >
                    {resolveWorkerSourceLabel(row.source)}
                  </Badge>
                </span>
              </th>
              {days.map((day) => (
                <td
                  key={day.workDate}
                  className={cx(
                    "ts-week-table__cell",
                    day.isSaturday && "ts-week-table__cell--saturday",
                    day.isSunday && "ts-week-table__cell--sunday",
                  )}
                >
                  <WeekCell
                    row={row}
                    workDate={day.workDate}
                    normalDayHours={normalDayHours}
                    isDirty={
                      dirtyKeys?.has(timesheetDraftKey(row.personnelId, day.workDate)) ?? false
                    }
                    isEditable={isEditable}
                    onCommitHours={onCommitHours}
                    onCommitCode={onCommitCode}
                  />
                </td>
              ))}
              {/* E5 247-249 */}
              <StaleCell
                className="ts-week-table__row-total ts-week-table__row-total--normal"
                value={row.normalHours}
                isStale={row.isStale}
              />
              <StaleCell
                className="ts-week-table__row-total ts-week-table__row-total--overtime"
                value={row.overtimeHours}
                isStale={row.isStale}
              />
              <td className="ts-week-table__row-total ts-week-table__row-total--sum">
                {formatDecimal(row.totalHours, 1)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {/* E5 312-326 */}
          <tr className="ts-week-table__foot-row">
            <th scope="row" className="ts-week-table__foot-label">
              Günlük Toplam
            </th>
            {days.map((day) => (
              <td
                key={day.workDate}
                className={cx(
                  "ts-week-table__foot-cell",
                  day.isSaturday && "ts-week-table__cell--saturday",
                  day.isSunday && "ts-week-table__cell--sunday",
                )}
              >
                {formatDecimal(day.totalHours, 1)}
              </td>
            ))}
            <StaleCell
              className="ts-week-table__foot-total ts-week-table__foot-total--normal"
              value={normalHours}
              isStale={isStale}
            />
            <StaleCell
              className="ts-week-table__foot-total ts-week-table__foot-total--overtime"
              value={overtimeHours}
              isStale={isStale}
            />
            <td className="ts-week-table__foot-total">{formatDecimal(totalHours, 1)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Backend türevi hücresi — `null` sunucunun bilmediği satırdır, 0 UYDURULMAZ. */
function StaleCell({
  className,
  value,
  isStale,
}: {
  className: string;
  value: string | null;
  isStale: boolean;
}) {
  return (
    <td className={cx(className, isStale && "ts-week-table__row-total--stale")}>
      {value === null ? "—" : formatDecimal(value, 1)}
      {isStale && value !== null && (
        <abbr className="ts-week-table__stale" title={STALE_TITLE}>
          *
        </abbr>
      )}
    </td>
  );
}

function WeekCell({
  row,
  workDate,
  normalDayHours,
  isDirty,
  isEditable,
  onCommitHours,
  onCommitCode,
}: {
  row: TimesheetWeekViewRow;
  workDate: string;
  normalDayHours: string;
  isDirty: boolean;
  isEditable: boolean;
  onCommitHours: TimesheetWeekTableProps["onCommitHours"];
  onCommitCode: TimesheetWeekTableProps["onCommitCode"];
}) {
  const cell = row.cells[workDate];
  const code = cell?.code ?? null;
  const hours = cell?.hours ?? null;
  const meta = code === null ? undefined : timesheetCodeMeta(code);
  // "Ahmet Yılmaz · 13 Tem" — hem popover başlığı hem çapa butonunun adı.
  const label = `${row.fullName} · ${formatDayLabel(workDate)}`;

  const [openPopover, setOpenPopover] = useState(false);
  const [text, setText] = useState(() => dayHoursText(hours));
  const [error, setError] = useState<string | null>(null);

  if (!isEditable) {
    if (meta) return <span className={cx("ts-tag", `ts-tag--${meta.modifier}`)}>{meta.letter}</span>;
    if (hours === null || hours.trim().length === 0) return null;
    return (
      <span className={cx("ts-hours", `ts-hours--${dayHoursModifier(hours, normalDayHours)}`)}>
        {formatDecimal(hours, 1)}
      </span>
    );
  }

  function commit(raw: string) {
    const parsed = parseDayHours(raw);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setError(null);
    onCommitHours?.(row.personnelId, workDate, parsed.value);
  }

  return (
    <span className="ts-pop-anchor ts-week-cell">
      {meta ? (
        // E5 260/281 — kodlu hücre ROZETTİR; tıklanınca kod yüzeyi açılır.
        <button
          type="button"
          aria-label={`${label} puantajı`}
          className={cx(
            "ts-tag",
            `ts-tag--${meta.modifier}`,
            "ts-week-cell__tag",
            isDirty && "ts-week-cell--dirty",
          )}
          onClick={() => setOpenPopover(true)}
        >
          {meta.letter}
        </button>
      ) : (
        <>
          {/* E5 238 — saat kutusu; `key` sunucu/taslak değeri değişince
              yeniden kurulur (hafta değişince eski metin kalmasın). */}
          <Input
            key={dayHoursText(hours)}
            size="row"
            numeric
            inputMode="decimal"
            maxLength={4}
            className={cx(
              "ts-hin",
              `ts-hin--${dayHoursModifier(hours, normalDayHours)}`,
              isDirty && "ts-week-cell--dirty",
            )}
            status={error === null ? "default" : "error"}
            aria-label={`${label} saati`}
            placeholder="—"
            defaultValue={dayHoursText(hours)}
            onChange={(event) => setText(event.target.value)}
            onBlur={(event) => commit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              commit(text);
            }}
          />
          {/* Kod çapası — mockup'ta YOK; olmadan `İzin`/`Görev` yazılamaz. */}
          <button
            type="button"
            className="ts-week-cell__code-anchor"
            aria-label={`${label} puantaj kodu`}
            onClick={() => setOpenPopover(true)}
          >
            …
          </button>
        </>
      )}
      {error !== null && <span className="ts-week-cell__error">{error}</span>}
      {openPopover && (
        <TimesheetCellPopover
          code={code}
          label={label}
          onClose={() => setOpenPopover(false)}
          onSubmit={(next) => {
            onCommitCode?.(row.personnelId, workDate, next);
            setOpenPopover(false);
          }}
        />
      )}
    </span>
  );
}

const TR_MONTHS_SHORT = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

function formatDayLabel(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${TR_MONTHS_SHORT[(month ?? 1) - 1] ?? ""}`;
}

function personMeta(row: TimesheetWeekViewRow): string {
  const trade = row.trade ?? "";
  if (row.subcontractorName) {
    return trade ? `${trade} · ${row.subcontractorName}` : row.subcontractorName;
  }
  return trade;
}
