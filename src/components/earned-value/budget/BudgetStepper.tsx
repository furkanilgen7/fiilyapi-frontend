"use client";

import { CheckIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";

import type { BudgetStep, StepSubtitle } from "./freeze-findings";

const STEP_LABELS: Record<BudgetStep, string> = {
  1: "Oranlar",
  2: "Zamanlama",
  3: "Önizleme",
  4: "Baseline",
};

const STEPS: readonly BudgetStep[] = [1, 2, 3, 4];

interface BudgetStepperProps {
  step: BudgetStep;
  subtitles: readonly [StepSubtitle, StepSubtitle, StepSubtitle, StepSubtitle];
  /** Adım 4 "Donduruldu" → yeşil onay (BÜT:647 `n === 4 && frozen`). */
  frozen: boolean;
  onStep: (step: BudgetStep) => void;
}

/**
 * Dört adımlı gezinme — Adam-Saat Bütçesi.dc.html:134-144 + :646-649. KAPISIZ:
 * her adım her zaman tıklanır (engel yalnız dondurmada — B1-7).
 * Tamamlanmış adımın ✓ glifi `CheckIcon` SVG'sidir (symbol-subset-guard).
 */
export function BudgetStepper({ step, subtitles, frozen, onStep }: BudgetStepperProps) {
  return (
    <nav className="ev-budget-steps" aria-label="Bütçe adımları">
      {STEPS.map((n, index) => {
        const isCurrent = n === step;
        const isDone = !isCurrent && (n < step || (n === 4 && frozen));
        const sub = subtitles[index];
        return (
          <button
            key={n}
            type="button"
            aria-current={isCurrent ? "step" : undefined}
            className={cx(
              "ev-budget-steps__item",
              isCurrent && "ev-budget-steps__item--current",
              isDone && "ev-budget-steps__item--done",
            )}
            onClick={() => onStep(n)}
          >
            <span className="ev-budget-steps__circle" aria-hidden="true">
              {isDone ? <CheckIcon width={12} height={12} /> : n}
            </span>
            <span className="ev-budget-steps__text">
              <span className="ev-budget-steps__label">{STEP_LABELS[n]}</span>
              <span className={cx("ev-budget-steps__sub", sub.danger && "ev-budget-steps__sub--danger")}>
                {sub.text}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
