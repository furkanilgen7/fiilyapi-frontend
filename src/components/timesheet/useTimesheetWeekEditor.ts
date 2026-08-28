"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { addDaysIso } from "@/components/site-planning/week";
import { timesheetWeekQuery, type TimesheetCode } from "@/lib/api/hooks/useTimesheet";
import { useSaveTimesheetWeek } from "@/lib/api/hooks/useTimesheetMutations";
import { downloadTimesheetExport } from "@/lib/api/timesheet-client";

import { mondayOfIsoWeek, shiftIsoWeek, type TimesheetIsoWeek } from "./iso-week";
import {
  buildWeekSaveBody,
  EMPTY_TIMESHEET_DRAFT,
  resolveCellSectionId,
  timesheetDraftKey,
  type TimesheetDraft,
  type TimesheetDraftCell,
} from "./timesheet-draft";
import { timesheetExportErrorMessage, timesheetSaveErrorMessage } from "./timesheet-errors";
import type { TimesheetSourcedCell } from "./week-derive";

export type TimesheetSaveState =
  | { readonly kind: "idle" }
  | { readonly kind: "saving" }
  | { readonly kind: "saved" }
  | { readonly kind: "failed"; readonly message: string };

export type TimesheetCopyState =
  | { readonly kind: "idle" }
  | { readonly kind: "copying" }
  | { readonly kind: "copied"; readonly cellCount: number }
  | { readonly kind: "failed"; readonly message: string };

export interface TimesheetWeekEditorHandle {
  readonly draft: TimesheetDraft;
  readonly dirtyKeys: ReadonlySet<string>;
  readonly isDirty: boolean;
  readonly commitHours: (
    allCells: readonly TimesheetSourcedCell[],
    personnelId: string,
    workDate: string,
    hours: string | null,
  ) => void;
  readonly commitCode: (
    allCells: readonly TimesheetSourcedCell[],
    personnelId: string,
    workDate: string,
    code: TimesheetCode | null,
  ) => void;
  readonly save: (allCells: readonly TimesheetSourcedCell[]) => Promise<void>;
  readonly saveState: TimesheetSaveState;
  readonly copyPreviousWeek: (allCells: readonly TimesheetSourcedCell[]) => Promise<void>;
  readonly copyState: TimesheetCopyState;
  readonly exportExcel: (year: number, month: number) => Promise<void>;
  readonly isExporting: boolean;
  readonly exportError: string | null;
}

export interface UseTimesheetWeekEditorInput {
  siteId: string;
  week: TimesheetIsoWeek;
  /** Aktif bölüm filtresi — YALNIZ YENİ hücrenin bölümünü belirler. */
  sectionId: string | null;
}

const DAYS_IN_WEEK = 7;

/**
 * Haftalık puantajın düzenleme + kaydetme + kopyalama + dışa aktarma kolu.
 *
 * ⚠️ `save` gövdeyi ÇAĞIRANDAN gelen `allCells` üzerinden kurar — yani
 * `TimesheetWeekDerived.allCells` (şantiyenin o haftaya ait süzgeçsiz TAM
 * kümesi + taslak). Süzülmüş `rows` bu yola HİÇ girmez; girseydi bölüm
 * filtresi açıkken kaydeden kullanıcı diğer bölümlerin haftasını silerdi.
 */
export function useTimesheetWeekEditor({
  siteId,
  week,
  sectionId,
}: UseTimesheetWeekEditorInput): TimesheetWeekEditorHandle {
  const queryClient = useQueryClient();
  const saveMutation = useSaveTimesheetWeek(siteId, {
    isoYear: week.isoYear,
    isoWeek: week.isoWeek,
  });
  const [saveState, setSaveState] = useState<TimesheetSaveState>({ kind: "idle" });
  const [copyState, setCopyState] = useState<TimesheetCopyState>({ kind: "idle" });
  const [exportState, setExportState] = useState<{ isExporting: boolean; error: string | null }>({
    isExporting: false,
    error: null,
  });

  /**
   * Taslak, ait olduğu KAPSAMLA saklanır: şantiye ya da hafta değişince render
   * sırasında düşer. Efektle sıfırlamak bir kare boyunca BAŞKA haftanın
   * taslağını gösterirdi — ve o taslak kaydedilirse backend 422 verirdi
   * (hücre istenen haftanın dışında).
   */
  const scope = `${siteId}|${week.isoYear}|${week.isoWeek}`;
  const [stored, setStored] = useState<{ scope: string; draft: TimesheetDraft }>({
    scope,
    draft: EMPTY_TIMESHEET_DRAFT,
  });
  const draft = stored.scope === scope ? stored.draft : EMPTY_TIMESHEET_DRAFT;
  const dirtyKeys = useMemo(() => new Set(Object.keys(draft)), [draft]);

  const writeDraft = useCallback(
    (entries: Record<string, TimesheetDraftCell | null>) => {
      setStored((previous) => ({
        scope,
        draft: { ...(previous.scope === scope ? previous.draft : {}), ...entries },
      }));
      setSaveState({ kind: "idle" });
    },
    [scope],
  );

  const commitHours = useCallback(
    (
      allCells: readonly TimesheetSourcedCell[],
      personnelId: string,
      workDate: string,
      hours: string | null,
    ) => {
      writeDraft({
        [timesheetDraftKey(personnelId, workDate)]: {
          hours,
          // 🔴 SAAT XOR KOD: saat yazmak kodu DÜŞÜRÜR.
          code: null,
          sectionId: resolveCellSectionId(allCells, personnelId, workDate, sectionId),
        },
      });
    },
    [sectionId, writeDraft],
  );

  const commitCode = useCallback(
    (
      allCells: readonly TimesheetSourcedCell[],
      personnelId: string,
      workDate: string,
      code: TimesheetCode | null,
    ) => {
      writeDraft({
        [timesheetDraftKey(personnelId, workDate)]: {
          // Kod seçmek saati DÜŞÜRÜR; "Saate dön" (code === null) hücreyi boşaltır.
          hours: null,
          code,
          sectionId: resolveCellSectionId(allCells, personnelId, workDate, sectionId),
        },
      });
    },
    [sectionId, writeDraft],
  );

  const save = useCallback(
    async (allCells: readonly TimesheetSourcedCell[]) => {
      setSaveState({ kind: "saving" });
      try {
        await saveMutation.mutateAsync(buildWeekSaveBody(allCells));
        // Taslak ancak sunucu YAZDIKTAN sonra düşer; hata hâlinde kullanıcı
        // yazdıklarını kaybetmez.
        setStored({ scope, draft: EMPTY_TIMESHEET_DRAFT });
        setSaveState({ kind: "saved" });
      } catch (error) {
        setSaveState({ kind: "failed", message: timesheetSaveErrorMessage(error) });
      }
    },
    [saveMutation, scope],
  );

  /**
   * "Önceki Haftayı Kopyala" (E5 75) — İSTEMCİ TARAFINDADIR (uç docstring'i).
   *
   * Bir önceki ISO haftası AYNI uçtan (süzgeçsiz) çekilir ve hücreler AYNI
   * HAFTA GÜNÜNE taşınır. Sonuç TASLAĞA yazılır, doğrudan kaydedilmez:
   * kullanıcı kaydetmeden önce ne geleceğini görür ve vazgeçebilir.
   *
   * 🔴 KOPYA DEĞİŞTİRMEDİR: bu haftanın var olan hücreleri, önceki haftada
   * karşılığı OLMAYAN günlerde de TEMİZLENİR — aksi hâlde "geçen haftanın
   * aynısı" düğmesi iki haftanın KARIŞIMINI üretirdi ve kullanıcı hangi
   * sayının nereden geldiğini bilemezdi.
   */
  const copyPreviousWeek = useCallback(
    async (allCells: readonly TimesheetSourcedCell[]) => {
      setCopyState({ kind: "copying" });
      try {
        const previous = shiftIsoWeek(week, -1);
        const data = await queryClient.fetchQuery(timesheetWeekQuery(siteId, previous));
        const shift: Record<string, TimesheetDraftCell | null> = {};
        // 1) Bu haftanın MEVCUT hücreleri önce temizlenir.
        for (const cell of allCells) {
          shift[timesheetDraftKey(cell.personnelId, cell.work_date)] = null;
        }
        // 2) Önceki haftanın hücreleri aynı gün ofsetiyle yazılır.
        let cellCount = 0;
        for (const row of data.rows) {
          for (const cell of row.cells) {
            // Önceki haftanın Pazartesi'si yanıtın KENDİ `start_date`idir — uydurulmaz.
            const offset = dayOffset(data.start_date, cell.work_date);
            if (offset < 0 || offset >= DAYS_IN_WEEK) continue;
            const target = addDaysIso(mondayOfIsoWeek(week.isoYear, week.isoWeek), offset);
            shift[timesheetDraftKey(row.personnel_id, target)] = {
              hours: cell.hours,
              code: cell.code,
              sectionId: cell.section_id,
            };
            cellCount += 1;
          }
        }
        writeDraft(shift);
        setCopyState({ kind: "copied", cellCount });
      } catch (error) {
        setCopyState({ kind: "failed", message: timesheetSaveErrorMessage(error) });
      }
    },
    [queryClient, siteId, week, writeDraft],
  );

  const exportExcel = useCallback(
    async (year: number, month: number) => {
      setExportState({ isExporting: true, error: null });
      try {
        // ⚠️ K2'NİN İSTİSNASI: dosyayı SUNUCU üretir, bu yüzden bölüm süzgeci
        // SUNUCUYA geçirilir — dosya ekranda görülenle aynı kapsamı taşısın.
        // (Kaydetmede bunun tam TERSİ geçerlidir.)
        // 🔴 Dışa aktarım AYLIKTIR (uç `export.xlsx?year&month`); ay bilgisi
        // hafta yanıtının `month_year`/`month_month` alanlarından gelir.
        await downloadTimesheetExport(siteId, {
          year,
          month,
          ...(sectionId !== null ? { sectionId } : {}),
        });
        setExportState({ isExporting: false, error: null });
      } catch (error) {
        setExportState({ isExporting: false, error: timesheetExportErrorMessage(error) });
      }
    },
    [sectionId, siteId],
  );

  return {
    draft,
    dirtyKeys,
    isDirty: dirtyKeys.size > 0,
    commitHours,
    commitCode,
    save,
    saveState,
    copyPreviousWeek,
    copyState,
    exportExcel,
    isExporting: exportState.isExporting,
    exportError: exportState.error,
  };
}

function toUtc(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function dayOffset(fromIso: string, toIso: string): number {
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / (24 * 60 * 60 * 1000));
}

