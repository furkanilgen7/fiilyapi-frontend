"use client";

import { AnchoredPopover } from "@/components/ui/popover/AnchoredPopover";
import { cx } from "@/lib/cx";

export interface PlanPopoverProps {
  /** Ekran okuyucuya diyalogun ne olduğunu söyler (`aria-label`). */
  label: string;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * Izgaranın küçük düzenleme yüzeyi (F-PL T3) — GÖRSEL kabuk.
 *
 * Davranış (Escape / dış tık iptali, odak girişi ve tetikleyiciye dönüşü)
 * F-PT'de ikinci kullanıcısı çıkınca `ui/popover/AnchoredPopover`a taşındı;
 * DOM çıktısı birebir aynıdır (`role="dialog"` + `aria-label` + `.plan-pop`).
 *
 * Görsel dil ızgaranın kendisinden gelir (bkz. `site-planning.css`):
 * kart kenarlığı/gölgesi (P101), çip yarıçapı ailesi, 11-12px tipografi.
 */
export function PlanPopover({ label, onClose, className, children }: PlanPopoverProps) {
  return (
    <AnchoredPopover label={label} onClose={onClose} className={cx("plan-pop", className)}>
      {children}
    </AnchoredPopover>
  );
}
