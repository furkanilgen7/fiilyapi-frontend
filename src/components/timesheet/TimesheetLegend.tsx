import { cx } from "@/lib/cx";

import { legendCodesFor, type TimesheetVariant } from "./timesheet-codes";

export interface TimesheetLegendProps {
  /**
   * `general` → E5 79-84: DÖRT öğe, harfsiz renk karesi + "Çalıştı (Ç)".
   * `site`    → ŞP 106-112: BEŞ öğe, kare HARFİ TAŞIR + "Çalıştı".
   */
  variant: TimesheetVariant;
}

/**
 * Kod açıklaması şeridi — İKİ EKRAN İÇİN AYRI (kullanıcı kararı, 2026-08-07).
 *
 * E5 79-84 DÖRT öğe gösterir (Ç · İ · T · FM); `G` YOKTUR. ŞP 106-111 BEŞ öğe
 * gösterir. Öğe kümesi `legendCodesFor` tek kaynağından gelir.
 *
 * E5 mockup'ı (79-84) 4'lü legend gösterir; `G` kodlu hücre veride varsa
 * rozeti BASILIR ama E5 legend'inde yer almaz — mockup kararı, sessiz atlama
 * değil.
 */
export function TimesheetLegend({ variant }: TimesheetLegendProps) {
  return (
    <div className={cx("ts-legend", `ts-legend--${variant}`)}>
      {legendCodesFor(variant).map((meta) => (
        <span key={meta.code} className="ts-legend__item">
          <span
            className={cx("ts-legend__swatch", `ts-legend__swatch--${meta.modifier}`)}
            aria-hidden="true"
          >
            {variant === "site" ? meta.letter : ""}
          </span>
          <span className="ts-legend__label">
            {variant === "site" ? meta.label : meta.labelWithLetter}
          </span>
        </span>
      ))}
    </div>
  );
}
