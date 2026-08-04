import { Button } from "@/components/ui/button/Button";

import type { PlanDraftSection } from "./plan-draft";
import type { PlanSaveStep } from "./usePlanSave";

/** Adımların Türkçe adları — kullanıcı hangi PUT'un yazıldığını görür. */
const SECTION_LABELS: Record<PlanDraftSection, string> = {
  rows: "Plan satırları",
  cells: "Hücreler",
  goals: "Haftalık hedefler",
  sprint: "Aktif sprint",
};

export interface PlanSaveStatusProps {
  steps: readonly PlanSaveStep[];
  isSaving: boolean;
  hasFailure: boolean;
  onRetry: () => void;
}

/**
 * Kaydetme akışının GÖRÜNÜR sonucu (F-PL T3).
 *
 * Kısmi hata sessizce yutulmaz: yazılan adım "kaydedildi", patlayan adım
 * gerekçesiyle listelenir; sonraki adımlar hiç denenmediği için listede de
 * görünmez. "Yeniden dene" YALNIZ kalan (hâlâ kirli) adımları gönderir.
 *
 * `role="alert"` KULLANILMAZ (e2e kuralı) — görünür metin yeterlidir.
 */
export function PlanSaveStatus({ steps, isSaving, hasFailure, onRetry }: PlanSaveStatusProps) {
  if (steps.length === 0 && !isSaving) return null;

  return (
    <div className="plan-save-status">
      {isSaving && <p className="plan-save-status__line">Kaydediliyor…</p>}
      {steps.map((step) => (
        <p
          key={step.section}
          className={
            step.outcome === "done"
              ? "plan-save-status__line plan-save-status__line--done"
              : "plan-save-status__line plan-save-status__line--failed"
          }
        >
          {SECTION_LABELS[step.section]}:{" "}
          {step.outcome === "done" ? "kaydedildi" : `kaydedilemedi — ${step.errorText}`}
        </p>
      ))}
      {hasFailure && !isSaving && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Yeniden dene
        </Button>
      )}
    </div>
  );
}
