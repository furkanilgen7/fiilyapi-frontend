import type { BudgetStep } from "./freeze-findings";

/**
 * PLN-F1.6 · URL-as-state: görüntülenen revizyon (`?rev=`) ve adım (`?adim=`)
 * paylaşılabilir bağlantıda taşınır. Kök ikizin `?site=` parametresi KORUNUR
 * (`GeneralSiteDiaryView` deseni: yol elle kurulmaz, yalnız sorgu yazılır).
 */

export const REV_PARAM = "rev";
export const STEP_PARAM = "adim";

const STEPS: readonly BudgetStep[] = [1, 2, 3, 4];
const DEFAULT_STEP: BudgetStep = 1;

export function parseStep(raw: string | null): BudgetStep {
  const value = Number(raw);
  return STEPS.find((s) => s === value) ?? DEFAULT_STEP;
}

export interface BudgetUrlPatch {
  step?: BudgetStep;
  /** null → parametre silinir (ekranın varsayılan revizyonu: taslak › aktif). */
  revisionId?: string | null;
}

export function nextSearch(current: URLSearchParams, patch: BudgetUrlPatch): URLSearchParams {
  const params = new URLSearchParams(current.toString());
  if (patch.step !== undefined) {
    if (patch.step === DEFAULT_STEP) params.delete(STEP_PARAM);
    else params.set(STEP_PARAM, String(patch.step));
  }
  if (patch.revisionId !== undefined) {
    if (patch.revisionId === null) params.delete(REV_PARAM);
    else params.set(REV_PARAM, patch.revisionId);
  }
  return params;
}
