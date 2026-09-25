"use client";

import type { DiaryCoreActions } from "@/components/site-diary/diary-extension";
import { Button } from "@/components/ui/button/Button";
import { ClockIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";

import type { StripValues } from "./allocation-model";
import { CodePickerButton, type CodePickerButtonProps } from "./AllocationToolbar";
import { formatDayDots } from "./day-header";
import { formatHours } from "./hours";
import { SendButton } from "./SubmitCheckBar";

/*
 * F2.6 · Tablet 1024 px — İ:527-558 "(c) Tablet". Saat Dağıtımı kartı tablette
 * KENDİ üst şeridini (İ:528-531) ve alt eylem çubuğunu (İ:549-553) basar.
 * İkisi de `ev-diary-tablet-only`: masaüstünde `display: none` (ekran
 * okuyucudan da gizli), ≤1024 px'te görünür; masaüstü eşleri o genişlikte
 * gizlenir (`diary-progress.css`) — aynı eylemin iki düğmesi aynı anda görünmez.
 */

export interface AllocationTabletHeadProps {
  day: string;
  siteName: string | null;
  strip: StripValues;
}

/** İ:528-531 — "⏱ Saat Dağıtımı" (SVG saat) · "24.09 · A-Blok" · "Dağıtılmamış N a-s" hapı. */
export function AllocationTabletHead({ day, siteName, strip }: AllocationTabletHeadProps) {
  const isBalanced = strip.unallocated === 0;
  const meta = [formatDayDots(day), siteName].filter((part): part is string => part !== null && part !== "").join(" · ");
  return (
    <div className="ev-diary-tablet-head ev-diary-tablet-only">
      <span className="ev-diary-tablet-head__title">
        <ClockIcon aria-hidden="true" />
        Saat Dağıtımı
      </span>
      <span className="ev-diary-tablet-head__meta">{meta}</span>
      <span className={cx("ev-diary-tablet-head__pill", isBalanced ? "ev-diary-tablet-head__pill--ok" : "ev-diary-tablet-head__pill--warn")}>
        Dağıtılmamış {formatHours(strip.unallocated)} a-s
      </span>
    </div>
  );
}

export interface AllocationTabletActionsProps extends Omit<CodePickerButtonProps, "label" | "anchorClassName" | "popoverClassName"> {
  onDistribute: () => void;
  actions: DiaryCoreActions;
}

/** İ:549-553 — "+ İş kodu" · "Kalanı orantılı dağıt" · (sağda) "Gönder". Mevcut eylemleri çağırır. */
export function AllocationTabletActions({ onDistribute, actions, ...picker }: AllocationTabletActionsProps) {
  return (
    <div className="ev-diary-tablet-actions ev-diary-tablet-only" role="group" aria-label="Saat Dağıtımı eylemleri">
      <CodePickerButton {...picker} label="+ İş kodu" popoverClassName="ev-diary-picker--above" />
      <Button variant="secondary" className="ev-diary-btn" disabled={!picker.canEdit} onClick={onDistribute}>
        Kalanı orantılı dağıt
      </Button>
      <SendButton actions={actions} className="ev-diary-send--tablet" />
    </div>
  );
}
