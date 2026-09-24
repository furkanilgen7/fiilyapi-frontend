"use client";

import { cx } from "@/lib/cx";

import type { Flash } from "./useBudgetScreenHooks";

/**
 * Satır içi bildirim — Adam-Saat Bütçesi.dc.html:202-204 (yeşil başarı).
 * Hata tonu aynı kalıpta kırmızı (hata sessizce yutulmaz). Canlı bölge:
 * her zaman DOM'da durur ki ekran okuyucu içerik değişimini duysun.
 */
export function BudgetFlash({ flash }: { flash: Flash | null }) {
  return (
    <div role="status" aria-live="polite" className="ev-budget-flash-slot">
      {flash && <div className={cx("ev-budget-flash", `ev-budget-flash--${flash.tone}`)}>{flash.message}</div>}
    </div>
  );
}
