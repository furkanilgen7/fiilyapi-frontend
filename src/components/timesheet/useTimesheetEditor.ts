"use client";

import { useCallback, useMemo, useState } from "react";

import { useSaveTimesheet } from "@/lib/api/hooks/useTimesheetMutations";
import { type TimesheetPeriod } from "@/lib/api/hooks/useTimesheet";
import { downloadTimesheetExport } from "@/lib/api/timesheet-client";

import type { TimesheetSourcedCell } from "./derive";
import {
  buildTimesheetSaveBody,
  EMPTY_TIMESHEET_DRAFT,
  resolveCellSectionId,
  timesheetDraftKey,
  type TimesheetDraft,
  type TimesheetDraftCell,
} from "./timesheet-draft";
import { timesheetExportErrorMessage, timesheetSaveErrorMessage } from "./timesheet-errors";

/** Popover'ın döndürdüğü değer — bölümü EKRAN değil bu hook çözer. */
export interface TimesheetCellEdit {
  readonly code: TimesheetDraftCell["code"];
  readonly overtimeHours: string | null;
}

export type TimesheetSaveState =
  | { readonly kind: "idle" }
  | { readonly kind: "saving" }
  | { readonly kind: "saved" }
  | { readonly kind: "failed"; readonly message: string };

export interface TimesheetEditorHandle {
  readonly draft: TimesheetDraft;
  /** Kaydedilmemiş hücrelerin anahtarları — matriste işaretlenir. */
  readonly dirtyKeys: ReadonlySet<string>;
  readonly isDirty: boolean;
  /** Hücreyi taslağa yazar; `null` = "Temizle" (kayıt kaldırılır). */
  readonly commitCell: (
    allCells: readonly TimesheetSourcedCell[],
    personnelId: string,
    workDate: string,
    edit: TimesheetCellEdit | null,
  ) => void;
  readonly save: (allCells: readonly TimesheetSourcedCell[]) => Promise<void>;
  readonly saveState: TimesheetSaveState;
  readonly exportExcel: () => Promise<void>;
  readonly isExporting: boolean;
  readonly exportError: string | null;
}

export interface UseTimesheetEditorInput {
  siteId: string;
  period: TimesheetPeriod;
  /** Aktif bölüm filtresi — YALNIZ YENİ hücrenin bölümünü belirler. */
  sectionId: string | null;
}

/**
 * Puantaj matrisinin düzenleme + kaydetme + dışa aktarma kolu (F-PT T3).
 *
 * ⚠️ `save` gövdeyi ÇAĞIRANDAN gelen `allCells` üzerinden kurar — yani
 * `TimesheetDerived.allCells` (şantiyenin süzgeçsiz TAM kümesi + taslak).
 * Süzülmüş `rows` bu yola HİÇ girmez; girseydi bölüm filtresi açıkken kaydeden
 * kullanıcı diğer bölümlerin ayını silerdi (bkz. `timesheet-draft.ts`).
 */
export function useTimesheetEditor({
  siteId,
  period,
  sectionId,
}: UseTimesheetEditorInput): TimesheetEditorHandle {
  const saveMutation = useSaveTimesheet(siteId, period);
  const [saveState, setSaveState] = useState<TimesheetSaveState>({ kind: "idle" });
  const [exportState, setExportState] = useState<{
    isExporting: boolean;
    error: string | null;
  }>({ isExporting: false, error: null });

  /**
   * Taslak, ait olduğu KAPSAMLA birlikte saklanır: şantiye ya da dönem
   * değişince render sırasında düşer. Efektle sıfırlamak bir kare boyunca
   * BAŞKA ayın taslağını gösterirdi — ve o taslak kaydedilirse backend 422
   * verirdi (hücre istenen dönemin dışında).
   */
  const scope = `${siteId}|${period.year}|${period.month}`;
  const [stored, setStored] = useState<{ scope: string; draft: TimesheetDraft }>({
    scope,
    draft: EMPTY_TIMESHEET_DRAFT,
  });
  const draft = stored.scope === scope ? stored.draft : EMPTY_TIMESHEET_DRAFT;

  const dirtyKeys = useMemo(() => new Set(Object.keys(draft)), [draft]);

  const commitCell = useCallback(
    (
      allCells: readonly TimesheetSourcedCell[],
      personnelId: string,
      workDate: string,
      edit: TimesheetCellEdit | null,
    ) => {
      const key = timesheetDraftKey(personnelId, workDate);
      const value: TimesheetDraftCell | null =
        edit === null
          ? null
          : {
              code: edit.code,
              overtimeHours: edit.overtimeHours,
              sectionId: resolveCellSectionId(allCells, personnelId, workDate, sectionId),
            };
      setStored((previous) => ({
        scope,
        draft: { ...(previous.scope === scope ? previous.draft : {}), [key]: value },
      }));
      setSaveState({ kind: "idle" });
    },
    [scope, sectionId],
  );

  const save = useCallback(
    async (allCells: readonly TimesheetSourcedCell[]) => {
      setSaveState({ kind: "saving" });
      try {
        await saveMutation.mutateAsync(buildTimesheetSaveBody(allCells));
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

  const exportExcel = useCallback(async () => {
    setExportState({ isExporting: true, error: null });
    try {
      // ⚠️ K2'NİN İSTİSNASI: dışa aktarımı SUNUCU üretir, bu yüzden bölüm
      // süzgeci SUNUCUYA geçirilir — dosya ekranda görülenle aynı kapsamı
      // taşısın. (Kaydetmede bunun tam TERSİ geçerlidir.)
      await downloadTimesheetExport(siteId, {
        year: period.year,
        month: period.month,
        ...(sectionId !== null ? { sectionId } : {}),
      });
      setExportState({ isExporting: false, error: null });
    } catch (error) {
      setExportState({ isExporting: false, error: timesheetExportErrorMessage(error) });
    }
  }, [period.month, period.year, sectionId, siteId]);

  return {
    draft,
    dirtyKeys,
    isDirty: dirtyKeys.size > 0,
    commitCell,
    save,
    saveState,
    exportExcel,
    isExporting: exportState.isExporting,
    exportError: exportState.error,
  };
}
