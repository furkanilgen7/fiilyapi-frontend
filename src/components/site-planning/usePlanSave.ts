"use client";

import { useCallback, useState, type Dispatch } from "react";

import { backendErrorMessage } from "@/lib/api/error-message";
import {
  useSaveSitePlanCells,
  useSaveSitePlanGoals,
  useSaveSitePlanRows,
  useSaveSitePlanSprint,
} from "@/lib/api/hooks/useSitePlanMutations";

import type { PlanDraft, PlanDraftSection } from "./plan-draft";
import type { PlanDraftAction } from "./plan-draft-reducer";
import {
  buildCellsBody,
  buildGoalsBody,
  buildRowIdMap,
  buildRowsBody,
  buildSprintBody,
  existingRowIdMap,
  findDuplicateRowLabel,
  hasBlankRowLabel,
} from "./plan-save-bodies";

/**
 * "Kaydet" — DÖRT PUT, SIRALI (F-PL T3).
 *
 * Sıra ZORUNLUDUR ve 1→2 bağımlıdır: yeni satırın gerçek kimliği yalnız `rows`
 * yanıtından gelir, hücre gövdesi `row_id` istediği için hücreler ancak
 * satırlar yazıldıktan sonra gönderilebilir.
 *
 * KISMİ HATA: bir adım patlarsa akış DURUR ve hangi adımın yazıldığı /
 * hangisinin yazılamadığı ekranda kalır — "kaydedildi" yalanı yoktur. Başarılı
 * adımın kirlilik bayrağı düşer, dolayısıyla "Yeniden dene" YALNIZ kalan
 * adımları gönderir (başarılıyı tekrarlamaz: gereksiz replace = gereksiz risk).
 */

export type PlanSaveOutcome = "done" | "failed";

export interface PlanSaveStep {
  readonly section: PlanDraftSection;
  readonly outcome: PlanSaveOutcome;
  readonly errorText?: string;
}

export interface PlanSaveHandle {
  readonly save: (draft: PlanDraft) => Promise<void>;
  readonly isSaving: boolean;
  readonly steps: readonly PlanSaveStep[];
  readonly hasFailure: boolean;
}

/** Adım başına Türkçe düşüş mesajı (backend gövdesi okunamazsa). */
const FALLBACK_MESSAGES: Record<PlanDraftSection, string> = {
  rows: "Plan satırları kaydedilemedi.",
  cells: "Hücreler kaydedilemedi.",
  goals: "Haftalık hedefler kaydedilemedi.",
  sprint: "Aktif sprint kaydedilemedi.",
};

type StepRecorder = (
  section: PlanDraftSection,
  outcome: PlanSaveOutcome,
  errorText?: string,
) => void;

type StepResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false };

/** Adımların sonucu BİRİKEREK ekrana yansır — akış yarıda kalsa da görünür. */
function createRecorder(
  setSteps: (steps: readonly PlanSaveStep[]) => void,
): StepRecorder {
  const steps: PlanSaveStep[] = [];
  return (section, outcome, errorText) => {
    steps.push(errorText === undefined ? { section, outcome } : { section, outcome, errorText });
    setSteps([...steps]);
  };
}

async function runStep<T>(
  section: PlanDraftSection,
  run: () => Promise<T>,
  record: StepRecorder,
): Promise<StepResult<T>> {
  try {
    const value = await run();
    record(section, "done");
    return { ok: true, value };
  } catch (error) {
    record(section, "failed", backendErrorMessage(error, FALLBACK_MESSAGES[section]));
    return { ok: false };
  }
}

/**
 * Kaydetmeden ÖNCEKİ satır kontrolü. Backend her ikisinde de 422 verirdi;
 * yinelenen etiket ayrıca yanıt eşlemesini belirsizleştirir (yeni satır yanlış
 * kimliği alırdı), bu yüzden istek HİÇ gönderilmez.
 */
function validateRows(draft: PlanDraft): string | null {
  if (hasBlankRowLabel(draft.rows)) return "Etiketi boş bir plan satırı var.";
  const duplicate = findDuplicateRowLabel(draft.rows);
  if (duplicate !== null) return `Aynı grupta iki kez "${duplicate}" satırı var.`;
  return null;
}

export function usePlanSave(
  siteId: string,
  weekStart: string,
  dispatch: Dispatch<PlanDraftAction>,
): PlanSaveHandle {
  const saveRows = useSaveSitePlanRows(siteId);
  const saveCells = useSaveSitePlanCells(siteId, weekStart);
  const saveGoals = useSaveSitePlanGoals(siteId, weekStart);
  const saveSprint = useSaveSitePlanSprint(siteId);

  const [steps, setSteps] = useState<readonly PlanSaveStep[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (draft: PlanDraft) => {
      const guardMessage = validateRows(draft);
      if (guardMessage !== null) {
        setSteps([{ section: "rows", outcome: "failed", errorText: guardMessage }]);
        return;
      }
      const record = createRecorder(setSteps);
      setSteps([]);
      setIsSaving(true);
      try {
        let rowIds = existingRowIdMap(draft.rows);
        if (draft.dirty.rows) {
          const result = await runStep("rows", () => saveRows.mutateAsync(buildRowsBody(draft)), record);
          if (!result.ok) return;
          rowIds = buildRowIdMap(draft.rows, result.value.rows);
          dispatch({ type: "rowsSaved", saved: result.value.rows });
        }
        if (draft.dirty.cells) {
          const body = buildCellsBody(draft, rowIds);
          if (!(await runStep("cells", () => saveCells.mutateAsync(body), record)).ok) return;
          dispatch({ type: "sectionSaved", section: "cells" });
        }
        if (draft.dirty.goals) {
          const body = buildGoalsBody(draft);
          if (!(await runStep("goals", () => saveGoals.mutateAsync(body), record)).ok) return;
          dispatch({ type: "sectionSaved", section: "goals" });
        }
        if (draft.dirty.sprint) {
          const body = buildSprintBody(draft);
          if (!(await runStep("sprint", () => saveSprint.mutateAsync(body), record)).ok) return;
          dispatch({ type: "sectionSaved", section: "sprint" });
        }
      } finally {
        setIsSaving(false);
      }
    },
    [dispatch, saveCells, saveGoals, saveRows, saveSprint],
  );

  return {
    save,
    isSaving,
    steps,
    hasFailure: steps.some((step) => step.outcome === "failed"),
  };
}
