"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button/Button";
import type { PlanResourceKind } from "@/lib/api/hooks/useSitePlan";
import { cx } from "@/lib/cx";

import type { PlanDraftNewRow } from "./plan-draft-reducer";
import type { PlanSectionsState } from "./plan-sections";
import { PlanRowAddPopover } from "./PlanRowAddPopover";

export interface PlanAddRowButtonProps {
  /** Grup başlığından açıldığında grubun türü; boş ızgarada "crew". */
  defaultKind: PlanResourceKind;
  defaultSectionId: string | null;
  sections: PlanSectionsState;
  canWrite: boolean;
  onAdd: (row: PlanDraftNewRow) => void;
  className?: string;
}

/**
 * "+ Satır" düğmesi + popover çapası (F-PL T5).
 *
 * Tek bileşene alındı çünkü giriş noktası İKİ yerde durur: grup başlığında
 * (P123/P159) ve BOŞ ızgarada. İkisi de aynı düğmeyi ve aynı popover'ı
 * kullanır — boş ızgarada satır açılamaması T5'in engelleyici bulgusuydu.
 *
 * Salt-okur kullanıcıda düğme GİZLENMEZ, devre-dışı basılır (ekran kuralı).
 */
export function PlanAddRowButton({
  defaultKind,
  defaultSectionId,
  sections,
  canWrite,
  onAdd,
  className,
}: PlanAddRowButtonProps) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <span className={cx("plan-pop-anchor", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="plan-grid__add-row"
        disabled={!canWrite}
        onClick={() => setIsAdding(true)}
      >
        + Satır
      </Button>
      {isAdding && (
        <PlanRowAddPopover
          defaultKind={defaultKind}
          defaultSectionId={defaultSectionId}
          sections={sections}
          onClose={() => setIsAdding(false)}
          onSubmit={(row) => {
            onAdd(row);
            setIsAdding(false);
          }}
        />
      )}
    </span>
  );
}
