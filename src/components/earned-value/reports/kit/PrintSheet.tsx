import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./print-sheet.css";

/**
 * PLN-F3.4 · A4 yatay yazdırma sayfası çerçevesi — GİR yazdırma önizlemesi
 * (`Planlama - Günlük İlerleme Raporu.dc.html:299-386`: 1123×794 px ekran
 * önizlemesi = 297×210 mm A4 yatay; `@page { size: A4 landscape }` gerçek
 * yazdırmada). Sayfa içeriği (`children`) çağıranın (`DailyReportScreen`)
 * sorumluluğundadır — bu bileşen yalnız ÇERÇEVE + sayfa altlığıdır.
 *
 * Ekranda önizleme .ev-print-sheet__page 1123×794 px sabit boyutta kalır
 * (mockup ölçüsü); `@media print`te bu boyut gerçek A4'e devredilir
 * (`print-sheet.css`).
 */
export interface PrintSheetProps {
  children: ReactNode;
  page: number;
  pageCount: number;
  footer?: ReactNode;
  className?: string;
}

export function PrintSheet({ children, page, pageCount, footer, className }: PrintSheetProps) {
  return (
    <div className={cx("ev-print-sheet", className)} data-page={page} data-page-count={pageCount}>
      <div className="ev-print-sheet__content">{children}</div>
      {footer != null && (
        <div className="ev-print-sheet__footer">
          {footer}
          <span className="ev-print-sheet__page-no">
            Sayfa {page} / {pageCount}
          </span>
        </div>
      )}
    </div>
  );
}
