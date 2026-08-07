import { cx } from "@/lib/cx";

import { TIMESHEET_CODES } from "./timesheet-codes";

export interface TimesheetLegendProps {
  /**
   * `general` → E5 79-84: harfsiz renk karesi + "Çalıştı (Ç)" etiketi.
   * `site`    → ŞP 106-112: kare HARFİ TAŞIR + "Çalıştı" etiketi.
   */
  variant: "general" | "site";
}

/**
 * Kod açıklaması şeridi (E5 79-84 · ŞP 106-112).
 *
 * BEŞ kod da her iki ekranda basılır: hücre seti tek settir (ŞP 111'in `G`si
 * dahil) ve E5 aynı şantiyenin aynı verisini gösterir — dörtlü bir legend
 * `G` rozetini AÇIKLAMASIZ bırakırdı. E5'in dörtlüsü (E5 80-83) bu setin alt
 * kümesidir; biçim her ekranın kendi mockup'ından alınır.
 */
export function TimesheetLegend({ variant }: TimesheetLegendProps) {
  return (
    <div className={cx("ts-legend", `ts-legend--${variant}`)}>
      {TIMESHEET_CODES.map((meta) => (
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
