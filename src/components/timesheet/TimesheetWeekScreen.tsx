"use client";

import { useCallback, useState } from "react";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button } from "@/components/ui/button/Button";

import { AddPersonnelLink } from "./AddPersonnelLink";
import type { TimesheetIsoWeek } from "./iso-week";
import { TimesheetLegend } from "./TimesheetLegend";
import { TimesheetMonthWeeks } from "./TimesheetMonthWeeks";
import { TimesheetNotices } from "./TimesheetNotices";
import { TimesheetPayrollPanel } from "./TimesheetPayrollPanel";
import {
  EMPTY_ROW_FILTERS,
  rowMatchesFilters,
  TimesheetRowFilters,
  type TimesheetRowFilterState,
} from "./TimesheetRowFilters";
import { TimesheetSaveStatus } from "./TimesheetSaveStatus";
import { TimesheetWeekKpis } from "./TimesheetWeekKpis";
import { TimesheetWeekNav } from "./TimesheetWeekNav";
import { TimesheetWeekTable } from "./TimesheetWeekTable";
import { useTimesheetWeekData } from "./useTimesheetWeekData";
import { useTimesheetWeekEditor } from "./useTimesheetWeekEditor";
import type { TimesheetWeekViewRow } from "./week-derive";
import "./timesheet.css";

/**
 * ═══ İKİ EKRANIN TEK ORTAK ÇEKİRDEĞİ (yönetim kararı 2026-08-28) ═══
 *
 * `/puantaj` (E5) ile `Şantiye › Puantaj` sekmesi (ŞP) hesap olarak İKİZDİR;
 * ŞP, E5'in şantiyeye SABİTLENMİŞ + bölüm süzgeçli hâlidir. Fark KABUKTUR,
 * hesap değil:
 *
 * | | `/puantaj` (E5) | ŞP sekmesi |
 * |---|---|---|
 * | Şantiye | seçici (`?site=`) | rotadan sabit |
 * | Bölüm süzgeci | yok | var (istemci tarafı) |
 * | Ek satır süzgeçleri | var (E5 100-122) | yok (mockup çizmiyor) |
 * | Excel | yok (E5 çizmiyor) | var (ŞP 100) |
 * | Kabuk | ana kabuk | drill sidebar |
 * | Yazma | evet | evet |
 *
 * Bu bileşen o ORTAK gövdedir: hafta gezinmesi, ay şeridi, KPI, legend, ızgara,
 * bordro paneli, bildirimler ve kaydetme durumu BURADA TEK YERDE durur.
 * Çağıran yalnız kabuğu (başlık, seçiciler, ek düğmeler) verir.
 */
export interface TimesheetWeekScreenProps {
  siteId: string;
  week: TimesheetIsoWeek;
  /** Bölüm süzgeci — `null` = Tüm Bölümler. AĞA GİTMEZ (K2). */
  sectionId: string | null;
  canWrite: boolean;
  canAddPersonnel: boolean;
  /** Personel formundan bu ekrana dönüş yolu. */
  returnTo: string;
  onShiftWeek: (delta: number) => void;
  onSelectWeek: (week: TimesheetIsoWeek) => void;
  onCurrentWeek: () => void;
  isCurrentWeek: boolean;
  /** Ekranın kendi başlık bloğu (ad/alt başlık + kabuk düğmeleri). */
  header: React.ReactNode;
  /** Hafta gezinme şeridinin yanındaki seçiciler (şantiye / bölüm). */
  controls?: React.ReactNode;
  /** E5 100-127 süzgeçleri — ŞP mockup'ında YOKTUR. */
  showRowFilters?: boolean;
  /** ŞP 100 — Excel; E5 mockup'ında YOKTUR. */
  showExport?: boolean;
  /** Kartın üstünde ekrana özel şerit (ŞP 116-120 özet şeridi). */
  cardHeader?: (view: ReturnType<typeof useTimesheetWeekData>["view"]) => React.ReactNode;
  /** Ekranın kök sınıfı — `ts ts--general` / `ts ts--site`. */
  className: string;
  /** Boş ızgara mesajı — yükleme/hata gerekçesi çağıranın bildiğidir. */
  emptyMessage: (isLoading: boolean, isError: boolean) => string;
}

export function TimesheetWeekScreen({
  siteId,
  week,
  sectionId,
  canWrite,
  canAddPersonnel,
  returnTo,
  onShiftWeek,
  onSelectWeek,
  onCurrentWeek,
  isCurrentWeek,
  header,
  controls,
  showRowFilters = false,
  showExport = false,
  cardHeader,
  className,
  emptyMessage,
}: TimesheetWeekScreenProps) {
  const [filters, setFilters] = useState<TimesheetRowFilterState>(EMPTY_ROW_FILTERS);
  const editor = useTimesheetWeekEditor({ siteId, week, sectionId });
  const rowFilter = useCallback(
    (row: TimesheetWeekViewRow) => (showRowFilters ? rowMatchesFilters(row, filters) : true),
    [filters, showRowFilters],
  );
  const data = useTimesheetWeekData({
    siteId,
    week,
    sectionId,
    rowFilter,
    draft: editor.draft,
  });

  // 🔴 YALNIZ hafta ucunun 403'ü sayfayı kapatır; kartoteks 403'ü kapatmaz
  // (`personnel` AYRI bir izin modülüdür).
  if (data.isForbidden) return <AccessDenied />;

  const { view, weekData, normalDayHours } = data;
  const monthWeeks = weekData?.month_weeks ?? [];
  // E5 356-357 — aktarım kapısının GERÇEK girdisi: ay şeridinin `has_entries`i.
  // "girilmedi" rozetiyle AYNI kaynak; ikinci bir hesap yazılmaz.
  const missingWeeks = monthWeeks
    .filter((entry) => !entry.has_entries)
    .map((entry) => entry.iso_week);

  return (
    <div className={className}>
      {header}

      {/* E5 76-81 — giriş kuralının kendisi ekranda yazar: birim SAATtir */}
      <p className="ts-info">
        <strong>Giriş haftalık yapılır, birim saattir.</strong> Her güne o gün çalışılan saat
        yazılır. Haftalık normal mesai {weekData?.weekly_normal_hours ?? "—"} saat; üzeri fazla
        mesai olarak ayrılır ve bordroda %50 zamlı hesaplanır. Aylık bordro, ayın haftalarının
        toplamından türetilir.
      </p>

      {/* E5 86-133 */}
      <div className="ts__controls">
        <TimesheetWeekNav
          week={week}
          onShift={onShiftWeek}
          onCurrent={onCurrentWeek}
          isCurrent={isCurrentWeek}
        />
        {controls}
        {showRowFilters && (
          <TimesheetRowFilters
            rows={view.rows}
            value={filters}
            onChange={setFilters}
            shownCount={view.rows.length}
            totalCount={data.totalRowCount}
          />
        )}
      </div>

      {/* E5 135-168 */}
      {weekData && (
        <TimesheetMonthWeeks
          year={weekData.month_year}
          month={weekData.month_month}
          weeks={monthWeeks}
          monthTotalHours={weekData.month_total_hours}
          active={week}
          onSelect={onSelectWeek}
        />
      )}

      {/* E5 171-198 */}
      <TimesheetWeekKpis
        normalHours={view.normalHours}
        overtimeHours={view.overtimeHours}
        totalHours={view.totalHours}
        leaveDayCount={view.leaveDayCount}
        temporaryDutyDayCount={view.temporaryDutyDayCount}
        workerCount={view.workerCount}
        isStale={view.isStale}
      />

      {/* E5 200-209 */}
      <TimesheetLegend normalDayHours={normalDayHours} />

      <TimesheetNotices
        canWrite={canWrite}
        isPersonnelUnavailable={data.isPersonnelUnavailable}
        personnelTruncation={data.personnelTruncation}
      />
      <TimesheetSaveStatus
        dirtyCount={editor.dirtyKeys.size}
        saveState={editor.saveState}
        copyState={editor.copyState}
        exportError={editor.exportError}
      />

      {/* E5 211-330 */}
      <div className="ts-card">
        {cardHeader?.(view)}
        <TimesheetWeekTable
          days={view.days}
          rows={view.rows}
          normalDayHours={normalDayHours}
          totalHours={view.totalHours}
          normalHours={view.normalHours}
          overtimeHours={view.overtimeHours}
          isStale={view.isStale}
          emptyMessage={emptyMessage(data.isLoading, data.isError)}
          emptyAction={
            canAddPersonnel ? <AddPersonnelLink returnTo={returnTo} variant="primary" /> : undefined
          }
          canWrite={canWrite}
          dirtyKeys={editor.dirtyKeys}
          onCommitHours={(personnelId, workDate, hours) =>
            editor.commitHours(view.allCells, personnelId, workDate, hours)
          }
          onCommitCode={(personnelId, workDate, code) =>
            editor.commitCode(view.allCells, personnelId, workDate, code)
          }
        />
      </div>

      {/* Kaydetme/kopyalama düğmeleri — E5 74-75 başlıkta, burada tek kaynak */}
      <div className="ts__actions">
        {/* ŞP 100 — dosyayı SUNUCU üretir, bölüm süzgeci ORAYA geçer (K2 istisnası) */}
        {showExport && weekData && (
          <Button
            variant="secondary"
            disabled={editor.isExporting}
            onClick={() => void editor.exportExcel(weekData.month_year, weekData.month_month)}
          >
            Excel
          </Button>
        )}
        {/* E5 74 */}
        <Button
          variant="secondary"
          disabled={!canWrite || editor.copyState.kind === "copying"}
          onClick={() => void editor.copyPreviousWeek(view.allCells)}
        >
          Önceki Haftayı Kopyala
        </Button>
        {/* E5 75 — gövde ŞANTİYENİN TAM HAFTA kümesidir (`allCells`), süzülmüş
            `rows` DEĞİL. Değişiklik yokken de kapalı: gereksiz replace =
            gereksiz risk. */}
        <Button
          variant="primary"
          disabled={!canWrite || !editor.isDirty || editor.saveState.kind === "saving"}
          onClick={() => void editor.save(view.allCells)}
        >
          Haftayı Kaydet
        </Button>
      </div>

      {/* E5 333-360 */}
      {weekData && (
        <TimesheetPayrollPanel
          normalHours={view.normalHours}
          overtimeHours={view.overtimeHours}
          monthTotalHours={weekData.month_total_hours}
          monthManDays={weekData.month_man_days}
          monthWeekCount={monthWeeks.length}
          missingWeeks={missingWeeks}
          workerCount={view.workerCount}
          weeklyNormalHours={weekData.weekly_normal_hours}
          normalDayHours={normalDayHours}
        />
      )}
    </div>
  );
}
