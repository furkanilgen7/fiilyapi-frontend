"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./anchored-popover.css";

export interface AnchoredPopoverProps {
  /** Ekran okuyucuya diyalogun ne olduğunu söyler (`aria-label`). */
  label: string;
  onClose: () => void;
  /** Yüzeyin GÖRSEL dili — her ekran KENDİ sınıfını verir (`plan-pop`, `ts-pop`). */
  className?: string;
  /**
   * Çapası KIRPAN bir kabın (ör. `overflow-x: auto` tablo kaydırıcısı) içinde
   * duruyorsa `true` verilir: yüzey `position: fixed`e geçer ve konumu çapanın
   * ölçülen dikdörtgeninden hesaplanır, böylece kabın dışına taşabilir.
   *
   * ⚠️ NEDEN GEREKLİ (F-PT T5'te bulunan GERÇEK KUSUR): CSS'te bir eksen
   * `visible` DIŞINDA bir değer alırsa diğer eksenin `visible`ı `auto`ya
   * ÇEVRİLİR. Puantaj matrisinin `.ts-table-scroll { overflow-x: auto }` kuralı
   * bu yüzden DİKEY eksende de kırpıyordu: son satırın popover'ı kabın altında
   * kesiliyor ve tabloya sahte bir dikey kaydırma ekliyordu. Varsayılan `false`
   * — F-PL'nin ızgara popover'ı eski akış konumunu aynen korur.
   */
  escapeOverflow?: boolean;
  children: ReactNode;
}

/** Çapa ile yüzey arasındaki boşluk + kenar payı (`--space-1` karşılığı). */
const ANCHOR_GAP = 4;

interface FixedPosition {
  top: number;
  left: number;
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
export function AnchoredPopover({
  label,
  onClose,
  className,
  escapeOverflow = false,
  children,
}: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<FixedPosition | null>(null);

  // Ölçüm BOYAMADAN ÖNCE yapılır (`useLayoutEffect`) — yüzey bir kare boyunca
  // yanlış yerde görünmez. Kaydırma/yeniden boyutlandırmada yeniden ölçülür.
  useLayoutEffect(() => {
    if (!escapeOverflow) return;
    const popover = popoverRef.current;
    const anchor = popover?.parentElement ?? null;
    if (popover === null || anchor === null) return;

    function place() {
      if (popover === null || anchor === null) return;
      const anchorRect = anchor.getBoundingClientRect();
      const { width, height } = popover.getBoundingClientRect();
      // Alta sığmıyorsa üste açılır; üste de sığmıyorsa yine altta kalır
      // (görünür alanın dışına ittirilmez, kırpılma kabın değil pencerenin
      // işidir).
      const fitsBelow = anchorRect.bottom + ANCHOR_GAP + height <= window.innerHeight;
      const fitsAbove = anchorRect.top - ANCHOR_GAP - height >= 0;
      const top =
        fitsBelow || !fitsAbove
          ? anchorRect.bottom + ANCHOR_GAP
          : anchorRect.top - ANCHOR_GAP - height;
      const centered = anchorRect.left + anchorRect.width / 2 - width / 2;
      const maxLeft = Math.max(ANCHOR_GAP, window.innerWidth - width - ANCHOR_GAP);
      setPosition({ top, left: Math.min(Math.max(centered, ANCHOR_GAP), maxLeft) });
    }

    place();
    // `capture`: kırpan kabın kendi kaydırması pencereye baloncuklanmaz.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [escapeOverflow]);

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
      className={cx(className, escapeOverflow && "anchored-popover--floating")}
      style={
        escapeOverflow && position !== null
          ? { top: `${position.top}px`, left: `${position.left}px` }
          : undefined
      }
    >
      {children}
    </div>
  );
}
