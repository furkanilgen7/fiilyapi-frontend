"use client";

import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { LockIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input/Input";
import type { TimesheetCode } from "@/lib/api/hooks/useTimesheet";
import { cx } from "@/lib/cx";
import { formatDecimal } from "@/lib/format";
import { useSyncedFieldState } from "@/lib/hooks/useSyncedFieldState";

import {
  dayHoursModifier,
  resolveSourceBadgeVariant,
  resolveWorkerSourceLabel,
  timesheetCodeMeta,
} from "./timesheet-codes";
import { dayHoursText, parseDayHours, timesheetDraftKey } from "./timesheet-draft";
import { TimesheetCellPopover, TimesheetLockedCellPopover } from "./TimesheetCellPopover";
import { lockTitleText, type TimesheetDayLock } from "./timesheet-lock";
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
 *
 * ═══ PLN-F2.4 · KİLİTLİ GÜN (mockup `Şantiye - Puantaj (Kilitli Gün)`) ═══
 * Rapor onayıyla kilitlenen günün kolonunda `<input>` BASILMAZ (M1): hücre
 * salt okunur kutudur (`.ts-lk`), FM/eksik gün ipucu KORUNUR (§3.14 P3),
 * tıklanınca SALT OKUNUR popover açılır (M3, P1). Başlık kilit ikonunu ve
 * kilit tonunu alır; hafta sonu tonu kilit tonuna BIRAKILIR (mockup (c)).
 * Kilitli bloğun bittiği kolonun sağına kilit sınırı çizilir. Toplam
 * kolonları kilitten ETKİLENMEZ (backend türevi).
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
  /** PLN-F2.4 · Kilitli günler (sunucu `locked_days` ∪ kilit 409'u). */
  dayLocks?: readonly TimesheetDayLock[];
  /** Salt okunur popover'ın "Günlük kaydına git →" hedefi; yoksa bağlantı basılmaz. */
  diaryHref?: string | null;
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
  dayLocks = NO_LOCKS,
  diaryHref = null,
}: TimesheetWeekTableProps) {
  const isEditable = canWrite && onCommitHours !== undefined && onCommitCode !== undefined;
  const lockByDay = new Map(dayLocks.map((lock) => [lock.day, lock]));
  const lockAt = (index: number) => lockByDay.get(days[index]?.workDate ?? "");
  // Mockup M1 — kilit sınırı kilitli bloğun BİTTİĞİ yerde: sonraki kolon kilitsizse.
  const isLockEdge = (index: number) =>
    lockAt(index) !== undefined && index < days.length - 1 && lockAt(index + 1) === undefined;

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
            {days.map((day, index) => {
              const lock = lockAt(index);
              return (
                <th
                  key={day.workDate}
                  scope="col"
                  title={lock ? lockTitleText(lock.reportDate) : undefined}
                  className={cx(
                    "ts-week-table__day-head",
                    // Kilit tonu hafta sonu tonundan ÖNCE gelir (mockup (c)).
                    lock && "ts-week-table__day-head--locked",
                    !lock && day.isSaturday && "ts-week-table__day-head--saturday",
                    !lock && day.isSunday && "ts-week-table__day-head--sunday",
                    isLockEdge(index) && "ts-week-table__lock-edge",
                  )}
                >
                  {/* Kilitli Gün M1 — 12px kilit ikonu + gün adı */}
                  <span className={cx("ts-week-table__weekday", lock && "ts-week-table__weekday--locked")}>
                    {lock && <LockIcon width={12} height={12} className="ts-week-table__lock-icon" />}
                    {day.weekday}
                  </span>
                  <span className="ts-week-table__daydate">{day.dayMonth}</span>
                </th>
              );
            })}
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
              {days.map((day, index) => {
                const lock = lockAt(index);
                if (lock) {
                  return (
                    // Kilitli Gün M1 — `.td-lk` (+ `.lk-edge`)
                    <td
                      key={day.workDate}
                      className={cx(
                        "ts-week-table__cell",
                        "ts-week-table__cell--locked",
                        isLockEdge(index) && "ts-week-table__lock-edge",
                      )}
                    >
                      <LockedWeekCell
                        row={row}
                        day={day}
                        lock={lock}
                        normalDayHours={normalDayHours}
                        diaryHref={diaryHref}
                      />
                    </td>
                  );
                }
                return (
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
                );
              })}
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
            {days.map((day, index) => {
              const isLocked = lockAt(index) !== undefined;
              return (
                <td
                  key={day.workDate}
                  className={cx(
                    "ts-week-table__foot-cell",
                    // Kilitli Gün `.lk-foot` — salt okunur değer tonu.
                    isLocked && "ts-week-table__foot-cell--locked",
                    !isLocked && day.isSaturday && "ts-week-table__cell--saturday",
                    !isLocked && day.isSunday && "ts-week-table__cell--sunday",
                    isLockEdge(index) && "ts-week-table__lock-edge",
                  )}
                >
                  {formatDecimal(day.totalHours, 1)}
                </td>
              );
            })}
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
  // 🔴 triyaj #352 — `useState(() => dayHoursText(hours))` yalnız ilk
  // render'da kurulurdu; `WeekCell` remount olmadığı için sunucu/taslak
  // saati değişince (ör. "Önceki Haftayı Kopyala") yerel `text` BAYAT
  // kalıyordu ve Enter yolu o bayat metni yazıyordu. `useSyncedFieldState`
  // hücre odaktayken (yazarken) senkronu ERTELER, aksi hâlde `hours` prop'u
  // değişince metni günceller — `key`/`defaultValue` remount hilesine gerek
  // kalmaz.
  const isEditingRef = useRef(false);
  const [text, setText] = useSyncedFieldState(dayHoursText(hours), () => isEditingRef.current);
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
    // 🔴 triyaj #353 — değer GERÇEKTEN değişmediyse draft'a yazma: aksi
    // hâlde her koşulsuz blur `dirtyKeys`i şişirir, satırı `isStale` yapar
    // ve "Kaydedilmemiş N hücre" mesajını gereksiz yere açar.
    if (dayHoursText(parsed.value) === dayHoursText(hours)) return;
    onCommitHours?.(row.personnelId, workDate, parsed.value);
  }

  return (
    <span className="ts-pop-anchor ts-week-cell">
      {meta ? (
        // E5 260/281 — kodlu hücre ROZETTİR; tıklanınca kod yüzeyi açılır.
        <Button
          variant="ghost"
          size="sm"
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
        </Button>
      ) : (
        <>
          {/* E5 238 — saat kutusu; KONTROLLÜ girdi, `useSyncedFieldState`
              sunucu/taslak değeri değişince metni günceller. */}
          <Input
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
            value={text}
            onFocus={() => {
              isEditingRef.current = true;
            }}
            onChange={(event) => setText(event.target.value)}
            onBlur={(event) => {
              isEditingRef.current = false;
              commit(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              commit(text);
            }}
          />
          {/* Kod çapası — mockup'ta YOK; olmadan `İzin`/`Görev` yazılamaz. */}
          <Button
            variant="ghost"
            size="sm"
            className="ts-week-cell__code-anchor"
            aria-label={`${label} puantaj kodu`}
            onClick={() => setOpenPopover(true)}
          >
            …
          </Button>
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

const NO_LOCKS: readonly TimesheetDayLock[] = [];

/** Saat tonu → kilitli kutunun ipucu sınıfı (§3.14 P3; `.lk-fm` / `.lk-yarim` / `.lk-e`). */
const LOCKED_HOURS_MODIFIER: Record<string, string | undefined> = {
  overtime: "ts-lk--overtime",
  short: "ts-lk--short",
  off: "ts-lk--empty",
};

/**
 * Kilitli günün hücresi (Kilitli Gün M1 `.lk`) — `<input>` YOK.
 *
 * Kutunun kendisi salt okunurdur; tıklanınca (§3.14 P1) değer + kod + kilit
 * notu + "Günlük kaydına git →" taşıyan SALT OKUNUR popover açılır. Tetikleyici
 * `Button` primitive'idir (ham düğme etiketi yasak — KAYIT 359; klavyeyle de açılır).
 */
function LockedWeekCell({
  row,
  day,
  lock,
  normalDayHours,
  diaryHref,
}: {
  row: TimesheetWeekViewRow;
  day: TimesheetWeekDayColumn;
  lock: TimesheetDayLock;
  normalDayHours: string;
  diaryHref: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const cell = row.cells[day.workDate];
  const code = cell?.code ?? null;
  const hours = cell?.hours ?? null;
  const meta = code === null ? undefined : timesheetCodeMeta(code);
  const label = `${row.fullName} · ${formatDayLabel(day.workDate)}`;
  const hasHours = hours !== null && hours.trim().length > 0;

  return (
    <span className="ts-pop-anchor ts-week-cell">
      <Button
        variant="ghost"
        size="sm"
        className="ts-lk-trigger"
        aria-label={`${label} puantajı (kilitli)`}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        {meta ? (
          <span className={cx("ts-tag", `ts-tag--${meta.modifier}`)}>{meta.letter}</span>
        ) : (
          <span
            className={cx("ts-lk", LOCKED_HOURS_MODIFIER[dayHoursModifier(hours, normalDayHours)])}
          >
            {hasHours ? formatDecimal(hours, 1) : "—"}
          </span>
        )}
      </Button>
      {isOpen && (
        <TimesheetLockedCellPopover
          label={label}
          title={`${row.fullName} · ${day.weekday} ${day.dayMonth}`}
          hours={hours}
          code={code}
          reportDate={lock.reportDate}
          diaryHref={diaryHref}
          onClose={() => setIsOpen(false)}
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
