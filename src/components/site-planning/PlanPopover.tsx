"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cx } from "@/lib/cx";

export interface PlanPopoverProps {
  /** Ekran okuyucuya diyalogun ne olduğunu söyler (`aria-label`). */
  label: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
].join(",");

/**
 * Izgaranın küçük düzenleme yüzeyi (F-PL T3).
 *
 * Modal DEĞİL: `settings/Modal` sayfayı karartıp odağı hapseder; buradaki
 * düzenlemeler hücre/satır ölçeğinde ve bağlamı (ızgarayı) görünür tutmalı.
 * Bu yüzden çapasına (`.plan-pop-anchor`) göre konumlanan, `role="dialog"`
 * taşıyan hafif bir yüzey kuruldu.
 *
 * Görsel dil ızgaranın kendisinden gelir (bkz. `site-planning.css`):
 * kart kenarlığı/gölgesi (P101), çip yarıçapı ailesi, 11-12px tipografi.
 *
 * Klavye: açılışta odak içeri girer, Escape kapatır ve odağı tetikleyiciye
 * geri verir; dış tıklama da iptaldir.
 */
export function PlanPopover({ label, onClose, className, children }: PlanPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const popover = popoverRef.current;
    const first = popover?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? popover)?.focus();
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointerDown(event: MouseEvent) {
      const popover = popoverRef.current;
      if (popover !== null && !popover.contains(event.target as Node)) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    // `mousedown`: tetikleyicinin kendi tıklaması bu dinleyici kurulmadan önce
    // bitmiştir, dolayısıyla popover açılır açılmaz kapanmaz.
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      tabIndex={-1}
      role="dialog"
      aria-label={label}
      className={cx("plan-pop", className)}
    >
      {children}
    </div>
  );
}
