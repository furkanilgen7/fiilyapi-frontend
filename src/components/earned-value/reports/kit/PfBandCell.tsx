import { EMPTY_CELL } from "@/lib/format";
import { cx } from "@/lib/cx";
import type { PfBand } from "@/lib/earned-value";

import "./pf-band-cell.css";

export interface PfBandCellProps {
  /** ÖNCEDEN biçimlenmiş metin (ör. `formatPf`); bu bileşen sayı ÜRETMEZ. */
  value: string | null | undefined;
  band: PfBand;
  /** Varsayılan `"td"`. */
  as?: "td" | "span";
  className?: string;
}

/**
 * PLN-F3.5 · Bant renkli PF hücresi — QURR tablosunun q/r kolonları
 * (Q:189-191 `sumCells`/`itemCells`: `pfc()` HÜCRENİN TAMAMINI boyar, İ/GİR
 * ekranlarının rozet-biçimi `PfBadge`sinden farklı). `as="span"` KPI
 * kartlarındaki serbest metin kullanımı için (F3.5 § pf kartları).
 *
 * Değer yoksa (`null`/`undefined`) bant ne olursa olsun NÖTR basılır — Q
 * mockup'ının `pfc(null)` dalı: `bg: transparent, fg: gri`. Bir bandın
 * VARLIĞI değerin de var olduğunu ima ETMEZ (motor ikisini ayrı taşıyabilir).
 */
export function PfBandCell({ value, band, as = "td", className }: PfBandCellProps) {
  const hasValue = value !== null && value !== undefined;
  const effectiveBand = hasValue ? band : "none";
  const Tag = as;
  return (
    <Tag className={cx("pf-band-cell", `pf-band-cell--${effectiveBand}`, className)}>
      {hasValue ? value : EMPTY_CELL}
    </Tag>
  );
}
