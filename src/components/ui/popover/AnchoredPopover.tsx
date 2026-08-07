"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cx } from "@/lib/cx";

export interface AnchoredPopoverProps {
  /** Ekran okuyucuya diyalogun ne olduğunu söyler (`aria-label`). */
  label: string;
  onClose: () => void;
  /** Yüzeyin GÖRSEL dili — her ekran KENDİ sınıfını verir (`plan-pop`, `ts-pop`). */
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
 * Çapasına göre konumlanan küçük düzenleme yüzeyi — DAVRANIŞ katmanı.
 *
 * F-PL'de (`site-planning/PlanPopover`) doğdu, F-PT (puantaj hücresi) ikinci
 * kullanıcısı olunca buraya taşındı: iki ekranın da ihtiyacı AYNI (Escape /
 * dış tık iptali, açılışta odağın içeri girmesi, kapanışta tetikleyiciye geri
 * dönmesi). Kopyalanmış ikinci bir dinleyici çifti = ilk düzeltmenin ikinci
 * kopyaya uğramaması demekti.
 *
 * Modal DEĞİL: `settings/Modal` sayfayı karartıp odağı hapseder; buradaki
 * düzenlemeler hücre/satır ölçeğinde ve bağlamı (ızgarayı/matrisi) görünür
 * tutmalı. GÖRSEL dil bu bileşende YOKTUR — konum, ölçü ve zemin çağıranın
 * `className`'inden gelir; böylece her ekran KENDİ görsel dilinden türetir
 * ("sırıtma testi").
 */
export function AnchoredPopover({ label, onClose, className, children }: AnchoredPopoverProps) {
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
    <div ref={popoverRef} tabIndex={-1} role="dialog" aria-label={label} className={cx(className)}>
      {children}
    </div>
  );
}
