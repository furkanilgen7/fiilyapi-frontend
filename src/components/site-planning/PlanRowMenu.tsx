"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button/Button";

import { PlanPopover } from "./PlanPopover";

export interface PlanRowMenuProps {
  /** Menünün hangi satıra ait olduğu — erişilebilir adın gövdesi. */
  rowLabel: string;
  disabled?: boolean;
  onDelete: () => void;
}

/**
 * Satır menüsü (F-PL T3) — ızgara satırı ve hedef satırı ORTAK kullanır.
 *
 * Tetikleyici mockup'ın kendi ölçülerinde bir metin butonudur (10px, çip
 * ailesinin yarıçapı); ayrı bir "ikon dili" getirilmez.
 */
export function PlanRowMenu({ rowLabel, disabled, onDelete }: PlanRowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuLabel = `${rowLabel} satır işlemleri`;

  return (
    <span className="plan-pop-anchor">
      <Button
        variant="ghost"
        size="sm"
        className="plan-row-menu__trigger"
        aria-label={menuLabel}
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
      >
        ⋯
      </Button>
      {isOpen && (
        <PlanPopover label={menuLabel} onClose={() => setIsOpen(false)} className="plan-pop--menu">
          <Button
            variant="ghost"
            size="sm"
            className="plan-pop__danger"
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
          >
            Sil
          </Button>
        </PlanPopover>
      )}
    </span>
  );
}
